"""TaxLens backend regression tests.

Covers:
- Auth: register, login, /auth/me, change-password, logout
- Returns: analyze (Gemini), list, get, delete, cross-user isolation
- Billing: plans, checkout (creates Stripe session + payment_transactions record)
"""
import os
import io
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fall back to reading frontend/.env
    try:
        with open("/app/frontend/.env") as f:
            for ln in f:
                if ln.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = ln.split("=", 1)[1].strip().strip('"').rstrip("/")
                    break
    except Exception:
        pass

API = f"{BASE_URL}/api"
SAMPLE_PDF = "/tmp/sample_1040.pdf"

# A unique throwaway user per run, so tests are idempotent
RUN_ID = uuid.uuid4().hex[:8]
TEST_EMAIL = f"test_{RUN_ID}@taxlens.com"
TEST_PASSWORD = "test12345"

# Shared state between tests
STATE = {}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Accept": "application/json"})
    return s


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class TestAuth:
    def test_register(self, session):
        r = session.post(f"{API}/auth/register", json={"email": TEST_EMAIL, "password": TEST_PASSWORD}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 20
        assert data["user"]["email"] == TEST_EMAIL
        assert data["user"]["billingStatus"] == "free"
        STATE["token"] = data["token"]
        STATE["user_id"] = data["user"]["id"]

    def test_register_duplicate(self, session):
        r = session.post(f"{API}/auth/register", json={"email": TEST_EMAIL, "password": TEST_PASSWORD}, timeout=30)
        assert r.status_code == 400

    def test_login_existing(self, session):
        # The seeded test@taxlens.com should also work
        r = session.post(f"{API}/auth/login", json={"email": "test@taxlens.com", "password": "test123"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["email"] == "test@taxlens.com"
        assert "token" in data
        STATE["seed_token"] = data["token"]
        STATE["seed_user_id"] = data["user"]["id"]

    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": "wrongpass"}, timeout=30)
        assert r.status_code == 401

    def test_me_bearer(self, session):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {STATE['token']}"}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["user"]["email"] == TEST_EMAIL

    def test_me_unauth(self, session):
        r = requests.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 401

    def test_change_password(self, session):
        new_pw = "test123new"
        r = requests.post(
            f"{API}/auth/change-password",
            headers={"Authorization": f"Bearer {STATE['token']}"},
            json={"currentPassword": TEST_PASSWORD, "newPassword": new_pw},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        # login with new password
        r2 = requests.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": new_pw}, timeout=30)
        assert r2.status_code == 200
        STATE["token"] = r2.json()["token"]

    def test_logout(self, session):
        r = requests.post(f"{API}/auth/logout", timeout=30)
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# Returns
# ---------------------------------------------------------------------------
class TestReturns:
    def test_analyze_pdf(self):
        assert os.path.exists(SAMPLE_PDF), "Sample PDF missing"
        with open(SAMPLE_PDF, "rb") as f:
            files = {"pdf": ("sample_1040.pdf", f, "application/pdf")}
            data = {
                "filingStatus": "single",
                "dependents": "0",
                "selfEmployment": "no",
                "goal": "reduce taxes",
                "lifeChanges": '["New job"]',
            }
            r = requests.post(
                f"{API}/returns/analyze",
                headers={"Authorization": f"Bearer {STATE['token']}"},
                files=files,
                data=data,
                timeout=180,
            )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "id" in body
        assert "rawFields" in body and isinstance(body["rawFields"], dict)
        assert "agi" in body["rawFields"]
        insights = body["insights"]
        assert isinstance(insights, list) and len(insights) >= 1
        # Verify sorted desc by dollarImpact
        impacts = [i.get("dollarImpact", 0) or 0 for i in insights]
        assert impacts == sorted(impacts, reverse=True), f"Insights not sorted desc: {impacts}"
        STATE["return_id"] = body["id"]

    def test_list_returns(self):
        r = requests.get(
            f"{API}/returns",
            headers={"Authorization": f"Bearer {STATE['token']}"},
            timeout=30,
        )
        assert r.status_code == 200
        data = r.json()
        assert "returns" in data and len(data["returns"]) >= 1
        assert any(rt["id"] == STATE["return_id"] for rt in data["returns"])

    def test_get_return(self):
        r = requests.get(
            f"{API}/returns/{STATE['return_id']}",
            headers={"Authorization": f"Bearer {STATE['token']}"},
            timeout=30,
        )
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == STATE["return_id"]
        # No raw PDF stored — only extracted fields/insights
        assert "rawFields" in body
        assert "pdf" not in body
        assert "raw_pdf" not in body

    def test_cross_user_isolation(self):
        # Use seeded user token to try to access run user's return
        r = requests.get(
            f"{API}/returns/{STATE['return_id']}",
            headers={"Authorization": f"Bearer {STATE['seed_token']}"},
            timeout=30,
        )
        assert r.status_code == 404, f"Expected 404 for cross-user access, got {r.status_code}: {r.text}"

    def test_delete_return(self):
        r = requests.delete(
            f"{API}/returns/{STATE['return_id']}",
            headers={"Authorization": f"Bearer {STATE['token']}"},
            timeout=30,
        )
        assert r.status_code == 200
        r2 = requests.get(
            f"{API}/returns/{STATE['return_id']}",
            headers={"Authorization": f"Bearer {STATE['token']}"},
            timeout=30,
        )
        assert r2.status_code == 404


# ---------------------------------------------------------------------------
# Billing
# ---------------------------------------------------------------------------
class TestBilling:
    def test_plans(self):
        r = requests.get(f"{API}/billing/plans", timeout=30)
        assert r.status_code == 200
        plans = {p["id"]: p for p in r.json()["plans"]}
        assert "pro" in plans and "lifetime" in plans
        assert plans["pro"]["amount"] == 29.0
        assert plans["lifetime"]["amount"] == 199.0

    def test_checkout_creates_session(self):
        origin = BASE_URL
        r = requests.post(
            f"{API}/billing/checkout",
            headers={"Authorization": f"Bearer {STATE['token']}"},
            json={"planId": "pro", "originUrl": origin},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["url"].startswith("http"), body
        assert body["sessionId"]
        STATE["checkout_session"] = body["sessionId"]

    def test_checkout_invalid_plan(self):
        r = requests.post(
            f"{API}/billing/checkout",
            headers={"Authorization": f"Bearer {STATE['token']}"},
            json={"planId": "bogus", "originUrl": BASE_URL},
            timeout=30,
        )
        assert r.status_code == 400


# ---------------------------------------------------------------------------
# Teardown
# ---------------------------------------------------------------------------
def test_zz_cleanup_account():
    # Delete throwaway account so it doesn't pile up
    r = requests.delete(
        f"{API}/auth/account",
        headers={"Authorization": f"Bearer {STATE['token']}"},
        timeout=30,
    )
    assert r.status_code in (200, 204)
