from dotenv import load_dotenv

load_dotenv()

import os
import re
import json
import uuid
import asyncio
import tempfile
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient

from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
    CheckoutStatusResponse,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("taxlens")

# ---------------------------------------------------------------------------
# Config / DB
# ---------------------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "sk_test_emergent")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
JWT_ALGORITHM = "HS256"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Subscription plans (server-defined; never trust the client for amounts)
PLANS = {
    "pro": {"amount": 29.00, "name": "Pro", "label": "pro"},
    "lifetime": {"amount": 199.00, "name": "Lifetime", "label": "lifetime"},
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
You NEVER give tax advice. You explain what the numbers mean and what the user should ask their CPA.
You ALWAYS respond with ONLY valid minified JSON. No markdown fences, no prose outside the JSON."""


def build_analysis_prompt(context: dict) -> str:
    return f"""Analyze the attached US individual tax return PDF using the user's context below.

USER CONTEXT:
- Filing status: {context.get('filingStatus')}
- Number of dependents: {context.get('dependents')}
- Has self-employment income: {context.get('selfEmployment')}
- Primary financial goal this year: {context.get('goal')}
- Major life changes expected this year: {context.get('lifeChanges')}

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
- If a numeric field cannot be found, estimate reasonably or use 0; never use null for rawFields numbers.
- Keep tone educational, not advisory. Output JSON only."""


def _extract_json(text: str) -> dict:
    text = text.strip()
    # strip markdown fences if present
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
    # find first { and last }
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start : end + 1]
    return json.loads(text)


async def run_gemini_analysis(pdf_path: str, context: dict) -> dict:
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key is not configured.")
    chat = LlmChat(
        api_key=GEMINI_API_KEY,
        session_id=f"taxlens-{uuid.uuid4()}",
        system_message=ANALYSIS_SYSTEM_PROMPT,
    ).with_model("gemini", "gemini-2.5-flash")
    pdf_file = FileContentWithMimeType(file_path=pdf_path, mime_type="application/pdf")
    user_msg = UserMessage(text=build_analysis_prompt(context), file_contents=[pdf_file])

    result = None
    last_err = None
    for attempt in range(3):
        try:
            result = await chat.send_message(user_msg)
            break
        except Exception as e:
            last_err = e
            transient = any(k in str(e).lower() for k in ["503", "unavailable", "overloaded", "high demand", "429", "rate"])
            logger.warning("Gemini attempt %s failed: %s", attempt + 1, e)
            if transient and attempt < 2:
                await asyncio.sleep(2 * (attempt + 1))
                continue
            break
    if result is None:
        logger.exception("Gemini call failed", exc_info=last_err)
        raise HTTPException(status_code=503, detail="The analyzer is temporarily busy. Please try again in a moment.")
    text = result if isinstance(result, str) else str(result)
    try:
        return _extract_json(text)
    except Exception:
        logger.error("Failed to parse Gemini JSON: %s", text[:2000])
        raise HTTPException(status_code=502, detail="The analyzer could not read this PDF. Please ensure it is a valid tax return.")


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
        # NEVER store the raw PDF
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
# Billing / Stripe
# ---------------------------------------------------------------------------
@api.get("/billing/plans")
async def billing_plans():
    return {"plans": [{"id": k, "name": v["name"], "amount": v["amount"]} for k, v in PLANS.items()]}


@api.post("/billing/checkout")
async def create_checkout(body: CheckoutRequest, request: Request, user: dict = Depends(get_current_user)):
    if body.planId not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    plan = PLANS[body.planId]
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    origin = body.originUrl.rstrip("/")
    success_url = f"{origin}/billing/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/settings"
    metadata = {
        "user_id": str(user["_id"]),
        "email": user["email"],
        "plan_id": body.planId,
    }
    checkout_request = CheckoutSessionRequest(
        amount=float(plan["amount"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session = await stripe_checkout.create_checkout_session(checkout_request)

    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": str(user["_id"]),
        "email": user["email"],
        "plan_id": body.planId,
        "amount": float(plan["amount"]),
        "currency": "usd",
        "metadata": metadata,
        "payment_status": "initiated",
        "status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": session.url, "sessionId": session.session_id}


async def _apply_successful_payment(txn: dict):
    """Idempotently upgrade the user once a payment is confirmed."""
    if txn.get("payment_status") == "paid":
        return
    plan_id = txn.get("plan_id")
    plan = PLANS.get(plan_id, {})
    await db.users.update_one(
        {"_id": ObjectId(txn["user_id"])},
        {"$set": {"billing_status": plan.get("label", "pro"), "plan": plan_id}},
    )


@api.get("/billing/status/{session_id}")
async def checkout_status(session_id: str, request: Request):
    txn = await db.payment_transactions.find_one({"session_id": session_id})
    if not txn:
        raise HTTPException(status_code=404, detail="Session not found")
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)

    if status.payment_status == "paid" and txn.get("payment_status") != "paid":
        await _apply_successful_payment(txn)
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "status": status.status}},
        )
    elif txn.get("payment_status") != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"status": status.status, "payment_status": status.payment_status}},
        )
    return {
        "status": status.status,
        "paymentStatus": status.payment_status,
        "planId": txn.get("plan_id"),
    }


@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature")
    webhook_url = f"{str(request.base_url)}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    try:
        event = await stripe_checkout.handle_webhook(body, sig)
    except Exception as e:
        logger.error("Webhook error: %s", e)
        raise HTTPException(status_code=400, detail="Invalid webhook")
    if event.payment_status == "paid":
        txn = await db.payment_transactions.find_one({"session_id": event.session_id})
        if txn and txn.get("payment_status") != "paid":
            await _apply_successful_payment(txn)
            await db.payment_transactions.update_one(
                {"session_id": event.session_id},
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
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
