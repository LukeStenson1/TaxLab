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
from google import genai
from google.genai import types
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient
from fpdf import FPDF

import tax_reference
from learning_seed import DEFAULT_SECTIONS

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

# Admin allow-list — these emails get full access + admin tools (reproducible across deploys).
ADMIN_EMAILS = {
    e.strip().lower()
    for e in os.environ.get("ADMIN_EMAILS", "luke.s.stenson@gmail.com").split(",")
    if e.strip()
}


def is_admin_user(user: dict) -> bool:
    return bool(user) and (
        (user.get("email", "").lower() in ADMIN_EMAILS) or user.get("role") == "admin"
    )

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Configure Gemini
gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

# Configure Stripe
if STRIPE_API_KEY:
    stripe.api_key = STRIPE_API_KEY

# Subscription plans (amounts in cents)
PLANS = {
    "pro_monthly": {"amount": 2000, "name": "Pro Monthly", "label": "pro", "mode": "subscription", "interval": "month"},
    "pro_annual": {"amount": 20000, "name": "Pro Annual", "label": "pro", "mode": "subscription", "interval": "year"},
    "lifetime": {"amount": 19900, "name": "Lifetime", "label": "lifetime", "mode": "payment", "interval": None},
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
    admin = is_admin_user(user)
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "createdAt": user.get("created_at"),
        "billingStatus": "admin" if admin else user.get("billing_status", "free"),
        "plan": user.get("plan"),
        "isAdmin": admin,
        "orgId": str(user["org_id"]) if user.get("org_id") else None,
        "orgRole": user.get("org_role"),
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


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if not is_admin_user(user):
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user


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
    seats: int = 1
    orgId: Optional[str] = None


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
- State of residence: {context.get('state') or 'not provided'}
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
    if not gemini_client:
        raise HTTPException(status_code=500, detail="Gemini API key is not configured.")

    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    import base64
    pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")
    prompt = build_analysis_prompt(context)

    last_err = None
    for attempt in range(3):
        try:
            response = await asyncio.to_thread(
                gemini_client.models.generate_content,
                model="gemini-2.5-flash",
                contents=[
                    types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
                    types.Part.from_text(text=prompt),
                ],
                config=types.GenerateContentConfig(
                    system_instruction=ANALYSIS_SYSTEM_PROMPT,
                    temperature=0.1,
                    max_output_tokens=8192,
                ),
            )
            text = response.text
            return _extract_json(text)

        except Exception as e:
            last_err = e
            transient = any(k in str(e).lower() for k in ["503", "unavailable", "overloaded", "429", "rate"])
            logger.warning("Gemini attempt %s failed: %s", attempt + 1, e)
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
    state: str = Form(""),
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
        "state": state,
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
    if state:
        raw_fields["state"] = state
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
    pdf.set_margins(15, 15, 15)
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    W = pdf.w - pdf.l_margin - pdf.r_margin

    # Header band
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

    # Summary stats
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

    # Insights
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(*NAVY)
    pdf.cell(0, 8, _clean(f"Your Insights ({len(insights)}) - ranked by estimated dollar impact"), ln=1)
    pdf.ln(2)

    IMPACT_COL = 45  # fixed width for the dollar impact column

    for idx, ins in enumerate(insights):
        impact = ins.get("dollarImpact", 0) or 0

        # Title + impact on same line
        y_before = pdf.get_y()
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(*NAVY)
        title_text = _clean(f"{idx + 1}. {ins.get('title', 'Insight')}")
        pdf.multi_cell(W - IMPACT_COL, 6, title_text)
        y_after = pdf.get_y()

        # Impact aligned to right — go back to same Y as title start
        pdf.set_xy(pdf.l_margin + W - IMPACT_COL, y_before)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(*GREEN)
        sign = "+" if impact >= 0 else "-"
        pdf.cell(IMPACT_COL, 6, _clean(f"{sign}{_usd(abs(impact))}"), align="R")

        # Move to after the title block
        pdf.set_xy(pdf.l_margin, y_after)

        # Explanation
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(60, 70, 85)
        pdf.multi_cell(W, 5, _clean(ins.get("explanation", "")))
        pdf.ln(1)

        # Ask your CPA box — constrained to full W
        pdf.set_fill_color(*LIGHT)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(*SLATE)
        pdf.cell(W, 5, "ASK YOUR CPA", fill=True, ln=1)
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(40, 50, 65)
        pdf.multi_cell(W, 5, _clean(ins.get("askYourCPA", "")), fill=True)
        pdf.ln(5)

    # Sources
    if sources:
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(*NAVY)
        pdf.cell(0, 7, "Sources & Methodology", ln=1)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(*SLATE)
        for s in sources:
            pdf.multi_cell(W, 4.5, _clean(f"- {s}"))
        pdf.ln(2)

    # Disclaimer
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(*SLATE)
    pdf.multi_cell(
        W, 4.5,
        _clean(
            "This is for educational purposes only and does not constitute tax or financial advice. "
            "TaxLens calculations are grounded in official IRS figures for the relevant tax year and are "
            "estimates intended to help you prepare questions for a licensed professional."
        ),
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
    return {
        "plans": [
            {
                "id": k,
                "name": v["name"],
                "amount": v["amount"] / 100,
                "mode": v["mode"],
                "interval": v["interval"],
            }
            for k, v in PLANS.items()
        ]
    }


async def _activate_from_txn(txn: dict, session: dict):
    """Grant access after a paid checkout — individual or whole org (all seats)."""
    plan = PLANS.get(txn.get("plan_id"), {})
    label = plan.get("label", "pro")
    sub_id = session.get("subscription")
    if txn.get("org_id"):
        org_id = txn["org_id"]
        await db.organizations.update_one(
            {"_id": ObjectId(org_id)},
            {"$set": {
                "billing_status": label,
                "plan": txn.get("plan_id"),
                "seats": txn.get("seats", 1),
                "stripe_subscription_id": sub_id,
            }},
        )
        # Every member + owner of the org inherits the plan.
        await db.users.update_many({"org_id": org_id}, {"$set": {"billing_status": label, "plan": "org"}})
    else:
        await db.users.update_one(
            {"_id": ObjectId(txn["user_id"])},
            {"$set": {"billing_status": label, "plan": txn.get("plan_id"), "stripe_subscription_id": sub_id}},
        )


@api.post("/billing/checkout")
async def create_checkout(body: CheckoutRequest, user: dict = Depends(get_current_user)):
    if body.planId not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe is not configured.")

    plan = PLANS[body.planId]
    seats = max(1, body.seats)
    origin = body.originUrl.rstrip("/")
    success_url = f"{origin}/billing/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/app/settings"

    # If buying for an org, the caller must own it (or be admin).
    if body.orgId:
        org = await db.organizations.find_one({"_id": ObjectId(body.orgId)})
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        if str(org.get("owner_user_id")) != str(user["_id"]) and not is_admin_user(user):
            raise HTTPException(status_code=403, detail="Only the org owner can buy seats.")

    price_data = {
        "currency": "usd",
        "product_data": {"name": f"TaxLens {plan['name']}"},
        "unit_amount": plan["amount"],
    }
    if plan["mode"] == "subscription":
        price_data["recurring"] = {"interval": plan["interval"]}

    try:
        session = await asyncio.to_thread(
            stripe.checkout.Session.create,
            payment_method_types=["card"],
            line_items=[{"price_data": price_data, "quantity": seats}],
            mode=plan["mode"],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": str(user["_id"]),
                "email": user["email"],
                "plan_id": body.planId,
                "org_id": body.orgId or "",
                "seats": str(seats),
            },
        )
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await db.payment_transactions.insert_one({
        "session_id": session.id,
        "user_id": str(user["_id"]),
        "email": user["email"],
        "plan_id": body.planId,
        "org_id": body.orgId or None,
        "seats": seats,
        "amount": plan["amount"] * seats / 100,
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
    # Subscriptions can report 'paid' or 'no_payment_required'.
    is_paid = payment_status in ("paid", "no_payment_required")

    if is_paid and txn.get("payment_status") != "paid":
        await _activate_from_txn(txn, session)
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

    etype = event.get("type")

    if etype == "checkout.session.completed":
        session = event["data"]["object"]
        if session.get("payment_status") in ("paid", "no_payment_required"):
            txn = await db.payment_transactions.find_one({"session_id": session["id"]})
            if txn and txn.get("payment_status") != "paid":
                await _activate_from_txn(txn, session)
                await db.payment_transactions.update_one(
                    {"session_id": session["id"]},
                    {"$set": {"payment_status": "paid", "status": "complete"}},
                )

    elif etype == "customer.subscription.deleted":
        sub = event["data"]["object"]
        sub_id = sub.get("id")
        # Downgrade the individual or the whole org tied to this subscription.
        org = await db.organizations.find_one({"stripe_subscription_id": sub_id})
        if org:
            await db.organizations.update_one({"_id": org["_id"]}, {"$set": {"billing_status": "free", "plan": None}})
            await db.users.update_many({"org_id": str(org["_id"])}, {"$set": {"billing_status": "free", "plan": None}})
        else:
            await db.users.update_one({"stripe_subscription_id": sub_id}, {"$set": {"billing_status": "free", "plan": None}})

    return {"ok": True}


# ---------------------------------------------------------------------------
# Organizations (business accounts with seats) — admin/owner managed
# ---------------------------------------------------------------------------
class OrgIn(BaseModel):
    name: str
    seats: int = Field(default=1, ge=1)
    ownerEmail: Optional[EmailStr] = None


class OrgUpdate(BaseModel):
    name: Optional[str] = None
    seats: Optional[int] = Field(default=None, ge=1)


class OrgMemberIn(BaseModel):
    email: EmailStr


class AdminUserUpdate(BaseModel):
    billingStatus: Optional[str] = None
    orgId: Optional[str] = None


def serialize_org(o: dict, members=None) -> dict:
    return {
        "id": str(o["_id"]),
        "name": o.get("name"),
        "seats": o.get("seats", 1),
        "billingStatus": o.get("billing_status", "free"),
        "plan": o.get("plan"),
        "ownerUserId": str(o["owner_user_id"]) if o.get("owner_user_id") else None,
        "ownerEmail": o.get("owner_email"),
        "memberCount": o.get("member_count"),
        "members": members,
    }


def serialize_admin_user(u: dict) -> dict:
    return {
        "id": str(u["_id"]),
        "email": u["email"],
        "billingStatus": "admin" if is_admin_user(u) else u.get("billing_status", "free"),
        "plan": u.get("plan"),
        "isAdmin": is_admin_user(u),
        "orgId": str(u["org_id"]) if u.get("org_id") else None,
        "orgRole": u.get("org_role"),
    }


async def _org_or_404(org_id: str) -> dict:
    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@api.get("/orgs")
async def list_orgs(admin: dict = Depends(require_admin)):
    orgs = await db.organizations.find({}).sort("name", 1).to_list(length=500)
    out = []
    for o in orgs:
        o["member_count"] = await db.users.count_documents({"org_id": str(o["_id"])})
        out.append(serialize_org(o))
    return {"orgs": out}


@api.post("/orgs")
async def create_org(body: OrgIn, admin: dict = Depends(require_admin)):
    doc = {
        "name": body.name.strip(),
        "seats": body.seats,
        "billing_status": "free",
        "plan": None,
        "owner_user_id": None,
        "owner_email": None,
        "stripe_subscription_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if body.ownerEmail:
        owner = await db.users.find_one({"email": str(body.ownerEmail).lower()})
        if not owner:
            raise HTTPException(status_code=404, detail="Owner must have a TaxLens account first.")
        if owner.get("org_id"):
            raise HTTPException(status_code=400, detail="That user already belongs to an organization.")
        doc["owner_user_id"] = owner["_id"]
        doc["owner_email"] = owner["email"]
    result = await db.organizations.insert_one(doc)
    if doc["owner_user_id"]:
        await db.users.update_one(
            {"_id": doc["owner_user_id"]},
            {"$set": {"org_id": str(result.inserted_id), "org_role": "owner"}},
        )
    doc["_id"] = result.inserted_id
    doc["member_count"] = 1 if doc["owner_user_id"] else 0
    return {"org": serialize_org(doc)}


@api.get("/orgs/{org_id}")
async def get_org(org_id: str, admin: dict = Depends(require_admin)):
    org = await _org_or_404(org_id)
    members = await db.users.find({"org_id": org_id}).to_list(length=500)
    org["member_count"] = len(members)
    return {"org": serialize_org(org, members=[serialize_admin_user(m) for m in members])}


@api.patch("/orgs/{org_id}")
async def update_org(org_id: str, body: OrgUpdate, admin: dict = Depends(require_admin)):
    org = await _org_or_404(org_id)
    update = {}
    if body.name is not None:
        update["name"] = body.name.strip()
    if body.seats is not None:
        count = await db.users.count_documents({"org_id": org_id})
        if body.seats < count:
            raise HTTPException(status_code=400, detail=f"Org already has {count} members; seats can't be lower.")
        update["seats"] = body.seats
    if update:
        await db.organizations.update_one({"_id": org["_id"]}, {"$set": update})
    org = await _org_or_404(org_id)
    org["member_count"] = await db.users.count_documents({"org_id": org_id})
    return {"org": serialize_org(org)}


@api.delete("/orgs/{org_id}")
async def delete_org(org_id: str, admin: dict = Depends(require_admin)):
    await db.users.update_many(
        {"org_id": org_id},
        {"$set": {"org_id": None, "org_role": None, "billing_status": "free", "plan": None}},
    )
    await db.organizations.delete_one({"_id": ObjectId(org_id)})
    return {"ok": True}


@api.post("/orgs/{org_id}/members")
async def add_member(org_id: str, body: OrgMemberIn, admin: dict = Depends(require_admin)):
    org = await _org_or_404(org_id)
    count = await db.users.count_documents({"org_id": org_id})
    if count >= org.get("seats", 1):
        raise HTTPException(status_code=400, detail="No seats left. Increase seats first.")
    target = await db.users.find_one({"email": str(body.email).lower()})
    if not target:
        raise HTTPException(status_code=404, detail="That person needs a TaxLens account first.")
    if target.get("org_id"):
        raise HTTPException(status_code=400, detail="That user already belongs to an organization.")
    update = {"org_id": org_id, "org_role": "member"}
    if org.get("billing_status", "free") != "free":
        update["billing_status"] = org["billing_status"]
        update["plan"] = "org"
    await db.users.update_one({"_id": target["_id"]}, {"$set": update})
    members = await db.users.find({"org_id": org_id}).to_list(length=500)
    org["member_count"] = len(members)
    return {"org": serialize_org(org, members=[serialize_admin_user(m) for m in members])}


@api.delete("/orgs/{org_id}/members/{user_id}")
async def remove_member(org_id: str, user_id: str, admin: dict = Depends(require_admin)):
    await db.users.update_one(
        {"_id": ObjectId(user_id), "org_id": org_id},
        {"$set": {"org_id": None, "org_role": None, "billing_status": "free", "plan": None}},
    )
    members = await db.users.find({"org_id": org_id}).to_list(length=500)
    org = await _org_or_404(org_id)
    org["member_count"] = len(members)
    return {"org": serialize_org(org, members=[serialize_admin_user(m) for m in members])}


# ---------------------------------------------------------------------------
# Admin: user management
# ---------------------------------------------------------------------------
@api.get("/admin/users")
async def admin_list_users(admin: dict = Depends(require_admin)):
    users = await db.users.find({}).sort("created_at", -1).to_list(length=1000)
    orgs = {str(o["_id"]): o.get("name") for o in await db.organizations.find({}).to_list(length=500)}
    out = []
    for u in users:
        su = serialize_admin_user(u)
        su["orgName"] = orgs.get(su["orgId"]) if su["orgId"] else None
        out.append(su)
    return {"users": out}


@api.patch("/admin/users/{user_id}")
async def admin_update_user(user_id: str, body: AdminUserUpdate, admin: dict = Depends(require_admin)):
    update = {}
    if body.billingStatus is not None:
        if body.billingStatus not in ("free", "pro", "lifetime"):
            raise HTTPException(status_code=400, detail="Invalid billing status.")
        update["billing_status"] = body.billingStatus
    if body.orgId is not None:
        update["org_id"] = body.orgId or None
        update["org_role"] = "member" if body.orgId else None
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update.")
    result = await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    u = await db.users.find_one({"_id": ObjectId(user_id)})
    return {"user": serialize_admin_user(u)}


@api.get("/")
async def root():
    return {"service": "TaxLens API", "status": "ok"}


# ---------------------------------------------------------------------------
# Learning center (admin-managed CMS)
# ---------------------------------------------------------------------------
class LearningSectionIn(BaseModel):
    title: str
    category: str
    body: str
    order: Optional[int] = None
    hidden: bool = False


def serialize_section(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "slug": doc.get("slug", str(doc["_id"])),
        "title": doc.get("title", ""),
        "category": doc.get("category", "General"),
        "body": doc.get("body", ""),
        "order": doc.get("order", 0),
        "hidden": doc.get("hidden", False),
    }


@api.get("/learning")
async def list_learning():
    cursor = db.learning_sections.find({"hidden": {"$ne": True}}).sort("order", 1)
    docs = await cursor.to_list(length=500)
    return {"sections": [serialize_section(d) for d in docs]}


@api.get("/learning/all")
async def list_learning_all(admin: dict = Depends(require_admin)):
    cursor = db.learning_sections.find({}).sort("order", 1)
    docs = await cursor.to_list(length=500)
    return {"sections": [serialize_section(d) for d in docs]}


@api.post("/learning")
async def create_learning(body: LearningSectionIn, admin: dict = Depends(require_admin)):
    if body.order is None:
        last = await db.learning_sections.find_one(sort=[("order", -1)])
        order = (last.get("order", 0) + 1) if last else 0
    else:
        order = body.order
    slug = re.sub(r"[^a-z0-9]+", "-", body.title.lower()).strip("-") or str(ObjectId())
    doc = {
        "title": body.title,
        "category": body.category,
        "body": body.body,
        "order": order,
        "hidden": body.hidden,
        "slug": slug,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.learning_sections.insert_one(doc)
    doc["_id"] = result.inserted_id
    return {"section": serialize_section(doc)}


@api.post("/learning/reorder")
async def reorder_learning(body: dict, admin: dict = Depends(require_admin)):
    ids = body.get("ids", [])
    for i, sid in enumerate(ids):
        try:
            await db.learning_sections.update_one({"_id": ObjectId(sid)}, {"$set": {"order": i}})
        except Exception:
            continue
    return {"ok": True}


@api.put("/learning/{section_id}")
async def update_learning(section_id: str, body: LearningSectionIn, admin: dict = Depends(require_admin)):
    update = {"title": body.title, "category": body.category, "body": body.body, "hidden": body.hidden}
    if body.order is not None:
        update["order"] = body.order
    result = await db.learning_sections.update_one({"_id": ObjectId(section_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Section not found")
    doc = await db.learning_sections.find_one({"_id": ObjectId(section_id)})
    return {"section": serialize_section(doc)}


@api.patch("/learning/{section_id}/visibility")
async def toggle_learning_visibility(section_id: str, admin: dict = Depends(require_admin)):
    doc = await db.learning_sections.find_one({"_id": ObjectId(section_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Section not found")
    new_hidden = not doc.get("hidden", False)
    await db.learning_sections.update_one({"_id": ObjectId(section_id)}, {"$set": {"hidden": new_hidden}})
    doc["hidden"] = new_hidden
    return {"section": serialize_section(doc)}


@api.delete("/learning/{section_id}")
async def delete_learning(section_id: str, admin: dict = Depends(require_admin)):
    result = await db.learning_sections.delete_one({"_id": ObjectId(section_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Section not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Admin: tax-data reference
# ---------------------------------------------------------------------------
@api.get("/admin/tax-data")
async def get_tax_data(admin: dict = Depends(require_admin)):
    meta = await db.tax_data_meta.find_one({"_id": "current"})
    return {
        "reference": tax_reference.TAX_REFERENCE,
        "lastRefreshed": (meta or {}).get("last_refreshed"),
        "refreshedBy": (meta or {}).get("refreshed_by"),
    }


@api.post("/admin/tax-data/refresh")
async def refresh_tax_data(admin: dict = Depends(require_admin)):
    now = datetime.now(timezone.utc).isoformat()
    await db.tax_data_meta.update_one(
        {"_id": "current"},
        {"$set": {"last_refreshed": now, "refreshed_by": admin.get("email")}},
        upsert=True,
    )
    years = sorted(tax_reference.TAX_REFERENCE.keys())
    return {
        "ok": True,
        "lastRefreshed": now,
        "years": years,
        "latestYear": years[-1] if years else None,
        "message": "Tax reference re-synced from the bundled IRS/state tables.",
    }


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.tax_returns.create_index("user_id")
    await db.payment_transactions.create_index("session_id")
    await db.learning_sections.create_index("order")
    # Seed the learning center on first run only.
    if await db.learning_sections.count_documents({}) == 0:
        now = datetime.now(timezone.utc).isoformat()
        await db.learning_sections.insert_many(
            [
                {**s, "order": i, "hidden": s.get("hidden", False), "created_at": now}
                for i, s in enumerate(DEFAULT_SECTIONS)
            ]
        )
        logger.info("Seeded %d learning sections", len(DEFAULT_SECTIONS))
    logger.info("TaxLens API started")


app.include_router(api)

import re

def is_allowed_origin(origin: str) -> bool:
    if not origin:
        return False
    allowed = [
        "http://localhost:3000",
        "https://taxlab-ivory.vercel.app",
    ]
    if origin in allowed:
        return True
    # Allow any Vercel preview deployment for this project
    if re.match(r"https://taxlab-[a-z0-9-]+-lukestenson1s-projects\.vercel\.app", origin):
        return True
    return False

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://(www\.)?taxlens\.site|https://taxlab(-[a-z0-9]+)*(-lukestenson1s-projects)?\.vercel\.app|http://localhost:3000",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
