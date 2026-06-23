# TaxLens — Test Credentials

## Free-plan test user (created via /signup)
- Email: test@taxlens.com
- Password: test123
- Plan: free (billingStatus = "free")

Notes:
- New signups default to the FREE plan — useful for testing insight/simulator/PDF gating.
- There is no UI shortcut to a paid plan without completing Stripe checkout.
- App URL: https://tax-analysis-1.preview.emergentagent.com
- IRS 1040 sample PDF for upload tests:
  https://customer-assets.emergentagent.com/job_tax-analysis-1/artifacts/wgqio7fr_Chapter%201%20-%20Sarah%20Bellum.pdf

## IMPORTANT (preview env)
- backend/.env GEMINI_API_KEY is currently invalid in preview (Google 401 ACCESS_TOKEN_TYPE_UNSUPPORTED).
  The upload→analysis flow will 503 until a valid Google AI Studio key (AIza...) is provided.
