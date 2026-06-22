from dotenv import load_dotenv

load_dotenv()

import os
import re
import io
import json
import asyncio
import tempfile
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

import bcrypt
import jwt
import stripe
import google.generativeai as genai
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient
from fpdf import FPDF

import tax_reference

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("taxlens")

# ---------------------------------------------------------------------------
# Config / DB
# ---------------------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
JWT_ALGORITHM = "HS256"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Configure Stripe
if STRIPE_API_KEY:
    stripe.api_key = STRIPE_API_KEY

# Subscription plans
PLANS = {
    "pro": {"amount": 2900, "name": "Pro", "label": "pro"},           # cents
    "lifetime": {"amount": 19900, "name": "Lifetime", "label": "lifetime"},
}

app = FastAPI(title="TaxLens API")
api = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Helpers: auth
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=604800,
        path="/",
    )


def serialize_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "createdAt": user.get("created_at"),
        "billingStatus": user.get("billing_status", "free"),
        "plan": user.get("plan"),
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str = Field(min_length=6)


class CheckoutRequest(BaseModel):
    planId: str
    originUrl: str


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@api.post("/auth/register")
async def register(body: RegisterRequest, response: Response):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "billing_status": "free",
        "plan": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    token = create_access_token(str(result.inserted_id), email)
    set_auth_cookie(response, token)
    return {"user": serialize_user(doc), "token": token}


@api.post("/auth/login")
async def login(body: LoginRequest, response: Response):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_access_token(str(user["_id"]), email)
    set_auth_cookie(response, token)
    return {"user": serialize_user(user), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": serialize_user(user)}


@api.post("/auth/change-password")
async def change_password(body: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    if not verify_password(body.currentPassword, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": hash_password(body.newPassword)}},
    )
    return {"ok": True}


@api.delete("/auth/account")
async def delete_account(response: Response, user: dict = Depends(get_current_user)):
    await db.tax_returns.delete_many({"user_id": str(user["_id"])})
    await db.users.delete_one({"_id": user["_id"]})
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Gemini analysis
# ---------------------------------------------------------------------------
ANALYSIS_SYSTEM_PROMPT = """You are a meticulous US tax analyst AI for an educational product called TaxLens.
You read IRS tax return PDFs (Form 1040 and schedules) and produce plain-English, educational insights.

GROUNDING RULES (critical):
- Base every threshold, limit, bracket, and calculation STRICTLY on the OFFICIAL IRS REFERENCE FIGURES
  provided in the user message for the relevant tax year. These come from official IRS Revenue Procedures,
  COLA notices, and publications. Do NOT use figures from memory and NEVER invent thresholds or limits.
- First determine the tax year of the return, then use ONLY that year's official figures.
- Methodology must follow IRS rules (Form 1040, Schedules C/D/E, Form 8960 NIIT, Section 199A QBI,
  Schedule 8812 CTC, education credits AOTC/LLC per IRS Pub 970).
- You NEVER give tax advice. You explain what the numbers mean and what to ask a CPA.
- You ALWAYS respond with ONLY valid minified JSON. No markdown fences, no prose outside the JSON."""


def build_analysis_prompt(context: dict) -> str:
    return f"""Analyze the attached US individual tax return PDF using the user's context below.

USER CONTEXT:
- Filing status: {context.get('filingStatus')}
- Number of dependents: {context.get('dependents')}
- Has self-employment income: {context.get('selfEmployment')}
- Primary financial goal this year: {context.get('goal')}
- Major life changes expected this year: {context.get('lifeChanges')}

{tax_reference.reference_prompt_block()}

Return ONLY a JSON object with EXACTLY this structure:
{{
  "taxYear": <int, the tax year of the return e.g. 2024>,
  "rawFields": {{
    "agi": <number>,
    "filingStatus": <string>,
    "taxableIncome": <number>,
    "totalTax": <number>,
    "marginalRate": <number, decimal e.g. 0.22>,
    "effectiveRate": <number, decimal e.g. 0.144>,
    "w2Income": <number>,
    "investmentIncome": <number>,
    "totalDeductions": <number>,
    "deductionType": <"standard" | "itemized">,
    "withholding": <number>,
    "balanceDueOrRefund": <number, negative if refund, positive if owed>,
    "selfEmploymentIncome": <number>,
    "creditsUsed": [{{"name": <string>, "amount": <number>}}],
    "scheduleC": <object or null>,
    "scheduleD": <object or null>,
    "scheduleE": <object or null>
  }},
  "insights": [
    {{
      "module": <one of: "bracket_proximity","capital_gains","retirement_headroom","deduction_gap","credit_phaseout","underpayment_risk","self_employment","niit_proximity">,
      "title": <short title>,
      "explanation": <2-3 sentence plain-English explanation tailored to this person's numbers and context>,
      "dollarImpact": <number, estimated annual dollars at stake or potentially saved>,
      "askYourCPA": <a specific question to ask their CPA>,
      "severity": <"high" | "medium" | "low">
    }}
  ]
}}

Rules:
- Only include insight modules that are RELEVANT given the numbers and the user's context.
- Rank the insights array by dollarImpact DESCENDING.
- Use ONLY the official IRS reference figures above for the return's tax year in every calculation.
- If the return's tax year is NOT listed in the reference figures above, use the most recent listed year's
  official IRS figures as the best available basis, and add a short note in the relevant insight's explanation
  that the figure is an estimate pending the official IRS inflation-adjustment update for that year.
- If a numeric field cannot be found, estimate reasonably or use 0; never use null for rawFields numbers.
- Keep tone educational, not advisory. Output JSON only."""


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start: end + 1]
    return json.loads(text)


async def run_gemini_analysis(pdf_path: str, context: dict) -> dict:
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key is not configured.")

    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        system_instruction=ANALYSIS_SYSTEM_PROMPT,
    )

    # Upload PDF to Gemini Files API
    uploaded_file = None
    last_err = None

    for attempt in range(3):
        try:
            # Upload the file
            uploaded_file = genai.upload_file(
                path=pdf_path,
                mime_type="application/pdf",
            )

            prompt = build_analysis_prompt(context)
            response = await asyncio.to_thread(
                model.generate_content,
                [uploaded_file, prompt],
                generation_config=genai.GenerationConfig(
                    temperature=0.1,
                    max_output_tokens=4096,
                ),
            )

            text = response.text
            result = _extract_json(text)

            # Clean up uploaded file
            try:
                genai.delete_file(uploaded_file.name)
            except Exception:
                pass

            return result

        except Exception as e:
            last_err = e
            transient = any(k in str(e).lower() for k in ["503", "unavailable", "overloaded", "429", "rate"])
            logger.warning("Gemini attempt %s failed: %s", attempt + 1, e)
            if uploaded_file:
                try:
                    genai.delete_file(uploaded_file.name)
                except Exception:
                    pass
                uploaded_file = None
            if transient and attempt < 2:
                await asyncio.sleep(2 * (attempt + 1))
                continue
            break

    logger.exception("Gemini call failed", exc_info=last_err)
    raise HTTPException(
        status_code=503,
        detail="The analyzer is temporarily busy. Please try again in a moment."
    )


@api.post("/returns/analyze")
async def analyze_return(
    pdf: UploadFile = File(...),
    filingStatus: str = Form(...),
    dependents: int = Form(0),
    selfEmployment: str = Form("no"),
    goal: str = Form("general awareness"),
    lifeChanges: str = Form("[]"),
    user: dict = Depends(get_current_user),
):
    if not (pdf.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")
    try:
        life_changes = json.loads(lifeChanges)
    except Exception:
        life_changes = []

    context = {
        "filingStatus": filingStatus,
        "dependents": dependents,
        "selfEmployment": selfEmployment,
        "goal": goal,
        "lifeChanges": life_changes,
    }

    tmp_path = None
    try:
        contents = await pdf.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
        analysis = await run_gemini_analysis(tmp_path, context)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

    raw_fields = analysis.get("rawFields", {})
    insights = analysis.get("insights", [])
    insights = sorted(insights, key=lambda i: i.get("dollarImpact", 0) or 0, reverse=True)
    tax_year = analysis.get("taxYear") or datetime.now(timezone.utc).year - 1

    doc = {
        "user_id": str(user["_id"]),
        "tax_year": int(tax_year),
        "raw_fields": raw_fields,
        "insights": insights,
        "context": context,
        "sources": tax_reference.sources_for_year(int(tax_year)),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.tax_returns.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_return(doc)


def serialize_return(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "taxYear": doc.get("tax_year"),
        "rawFields": doc.get("raw_fields", {}),
        "insights": doc.get("insights", []),
        "context": doc.get("context", {}),
        "sources": doc.get("sources") or tax_reference.sources_for_year(doc.get("tax_year")),
        "createdAt": doc.get("created_at"),
    }


@api.get("/returns")
async def list_returns(user: dict = Depends(get_current_user)):
    cursor = db.tax_returns.find({"user_id": str(user["_id"])}).sort("tax_year", -1)
    docs = await cursor.to_list(length=200)
    return {"returns": [serialize_return(d) for d in docs]}


@api.get("/returns/{return_id}")
async def get_return(return_id: str, user: dict = Depends(get_current_user)):
    try:
        doc = await db.tax_returns.find_one({"_id": ObjectId(return_id), "user_id": str(user["_id"])})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not doc:
        raise HTTPException(status_code=404, detail="Return not found")
    return serialize_return(doc)


@api.delete("/returns/{return_id}")
async def delete_return(return_id: str, user: dict = Depends(get_current_user)):
    try:
        await db.tax_returns.delete_one({"_id": ObjectId(return_id), "user_id": str(user["_id"])})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    return {"ok": True}


# ---------------------------------------------------------------------------
# PDF report generation
# ---------------------------------------------------------------------------
NAVY = (15, 23, 42)
TEAL = (15, 118, 110)
GREEN = (5, 150, 105)
SLATE = (100, 116, 139)
LIGHT = (241, 245, 249)


def _clean(text) -> str:
    if text is None:
        return ""
    s = str(text)
    repl = {"\u2014": "-", "\u2013": "-", "\u2018": "'", "\u2019": "'",
            "\u201c": '"', "\u201d": '"', "\u2026": "...", "\u2022": "-", "\u00a0": " "}
    for k, v in repl.items():
        s = s.replace(k, v)
    return s.encode("latin-1", "replace").decode("latin-1")


def _usd(n) -> str:
    try:
        return "${:,.0f}".format(float(n or 0))
    except Exception:
        return "$0"


def _pct(n) -> str:
    try:
        v = float(n or 0)
        v = v * 100 if v <= 1 else v
        return "{:.1f}%".format(v)
    except Exception:
        return "0.0%"


def build_report_pdf(ret: dict) -> bytes:
    rf = ret.get("rawFields", {}) or {}
    insights = ret.get("insights", []) or []
    sources = ret.get("sources", []) or []
    year = ret.get("taxYear", "")

    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    W = pdf.w - 2 * pdf.l_margin

    pdf.set_fill_color(*NAVY)
    pdf.rect(0, 0, pdf.w, 34, "F")
    pdf.set_xy(pdf.l_margin, 10)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 22)
    pdf.cell(0, 9, "TaxLens", ln=1)
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(180, 190, 205)
    pdf.cell(0, 6, _clean(f"Tax Year {year} Insight Report"), ln=1)

    pdf.set_y(42)
    pdf.set_text_color(*NAVY)

    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, "Summary", ln=1)
    pdf.ln(1)
    stats = [
        ("AGI", _usd(rf.get("agi"))),
        ("Taxable income", _usd(rf.get("taxableIncome"))),
        ("Total tax", _usd(rf.get("totalTax"))),
        ("Effective rate", _pct(rf.get("effectiveRate"))),
    ]
    col_w = W / 4
    pdf.set_fill_color(*LIGHT)
    for label, _ in stats:
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(*SLATE)
        pdf.cell(col_w, 6, _clean(label.upper()), border=0, align="L")
    pdf.ln(6)
    for _, value in stats:
        pdf.set_font("Helvetica", "B", 14)
        pdf.set_text_color(*NAVY)
        pdf.cell(col_w, 8, _clean(value), border=0, align="L")
    pdf.ln(12)

    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(*NAVY)
    pdf.cell(0, 8, _clean(f"Your Insights ({len(insights)}) - ranked by estimated dollar impact"), ln=1)
    pdf.ln(2)

    for idx, ins in enumerate(insights):
        impact = ins.get("dollarImpact", 0) or 0
        pdf.set_draw_color(*LIGHT)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(*NAVY)
        pdf.multi_cell(W * 0.72, 6, _clean(f"{idx + 1}. {ins.get('title', 'Insight')}"))
        title_y = pdf.get_y()
        pdf.set_xy(pdf.l_margin + W * 0.72, title_y - 6)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(*GREEN)
        sign = "+" if impact >= 0 else "-"
        pdf.cell(W * 0.28, 6, _clean(f"{sign}{_usd(abs(impact))}"), align="R")
        pdf.set_xy(pdf.l_margin, title_y)

        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(60, 70, 85)
        pdf.multi_cell(W, 5, _clean(ins.get("explanation", "")))
        pdf.ln(1)
        pdf.set_fill_color(*LIGHT)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(*SLATE)
        pdf.multi_cell(W, 5, "ASK YOUR CPA", fill=True)
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(40, 50, 65)
        pdf.multi_cell(W, 5, _clean(ins.get("askYourCPA", "")), fill=True)
        pdf.ln(5)

    if sources:
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(*NAVY)
        pdf.cell(0, 7, "Sources & Methodology", ln=1)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(*SLATE)
        for s in sources:
            pdf.multi_cell(W, 4.5, _clean(f"- {s}"))
        pdf.ln(2)

    pdf.set_draw_color(*SLATE)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(*SLATE)
    pdf.multi_cell(
        W, 4.5,
        _clean("This is for educational purposes only and does not constitute tax or financial advice. "
               "TaxLens calculations are grounded in official IRS figures for the relevant tax year and are "
               "estimates intended to help you prepare questions for a licensed professional."),
    )

    out = pdf.output()
    return bytes(out)


@api.get("/returns/{return_id}/pdf")
async def download_return_pdf(return_id: str, user: dict = Depends(get_current_user)):
    try:
        doc = await db.tax_returns.find_one({"_id": ObjectId(return_id), "user_id": str(user["_id"])})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not doc:
        raise HTTPException(status_code=404, detail="Return not found")
    ret = serialize_return(doc)
    pdf_bytes = build_report_pdf(ret)
    filename = f"TaxLens_Report_{ret.get('taxYear', 'report')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# Billing / Stripe
# ---------------------------------------------------------------------------
@api.get("/billing/plans")
async def billing_plans():
    return {"plans": [{"id": k, "name": v["name"], "amount": v["amount"] / 100} for k, v in PLANS.items()]}


@api.post("/billing/checkout")
async def create_checkout(body: CheckoutRequest, user: dict = Depends(get_current_user)):
    if body.planId not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe is not configured.")

    plan = PLANS[body.planId]
    origin = body.originUrl.rstrip("/")
    success_url = f"{origin}/billing/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/settings"

    try:
        session = await asyncio.to_thread(
            stripe.checkout.Session.create,
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": f"TaxLens {plan['name']}"},
                    "unit_amount": plan["amount"],
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": str(user["_id"]),
                "email": user["email"],
                "plan_id": body.planId,
            },
        )
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await db.payment_transactions.insert_one({
        "session_id": session.id,
        "user_id": str(user["_id"]),
        "email": user["email"],
        "plan_id": body.planId,
        "amount": plan["amount"] / 100,
        "currency": "usd",
        "payment_status": "initiated",
        "status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": session.url, "sessionId": session.id}


@api.get("/billing/status/{session_id}")
async def checkout_status(session_id: str):
    txn = await db.payment_transactions.find_one({"session_id": session_id})
    if not txn:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        session = await asyncio.to_thread(stripe.checkout.Session.retrieve, session_id)
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    payment_status = session.get("payment_status", "unpaid")

    if payment_status == "paid" and txn.get("payment_status") != "paid":
        plan_id = txn.get("plan_id")
        plan = PLANS.get(plan_id, {})
        await db.users.update_one(
            {"_id": ObjectId(txn["user_id"])},
            {"$set": {"billing_status": plan.get("label", "pro"), "plan": plan_id}},
        )
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "status": session.get("status")}},
        )

    return {
        "status": session.get("status"),
        "paymentStatus": payment_status,
        "planId": txn.get("plan_id"),
    }


@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature")

    if STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(body, sig, STRIPE_WEBHOOK_SECRET)
        except Exception as e:
            logger.error("Webhook error: %s", e)
            raise HTTPException(status_code=400, detail="Invalid webhook")
    else:
        try:
            event = json.loads(body)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid payload")

    if event.get("type") == "checkout.session.completed":
        session = event["data"]["object"]
        if session.get("payment_status") == "paid":
            txn = await db.payment_transactions.find_one({"session_id": session["id"]})
            if txn and txn.get("payment_status") != "paid":
                plan_id = txn.get("plan_id")
                plan = PLANS.get(plan_id, {})
                await db.users.update_one(
                    {"_id": ObjectId(txn["user_id"])},
                    {"$set": {"billing_status": plan.get("label", "pro"), "plan": plan_id}},
                )
                await db.payment_transactions.update_one(
                    {"session_id": session["id"]},
                    {"$set": {"payment_status": "paid", "status": "complete"}},
                )
    return {"ok": True}


@api.get("/")
async def root():
    return {"service": "TaxLens API", "status": "ok"}


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.tax_returns.create_index("user_id")
    await db.payment_transactions.create_index("session_id")
    logger.info("TaxLens API started")


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:3000",
        "https://taxlab-ivory.vercel.app",
        "https://taxlab-ocyey2pka-lukestenson1s-projects.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
