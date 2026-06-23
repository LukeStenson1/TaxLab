# TaxLens — PRD & Build Log

## Original Problem Statement
Full-stack tax return analyzer. Users upload an IRS tax return PDF and receive AI-generated, plain-English financial insights ranked by dollar impact (educational, not advice). Includes landing, auth, upload + intake form, analysis report with insight modules + scenario simulator, dashboard (YoY), settings/billing.

## Tech Stack (as built)
- Frontend: React (CRA + craco) + Tailwind CSS, react-router-dom, recharts, lucide-react
- Backend: FastAPI + MongoDB (motor), JWT auth (bcrypt + PyJWT)
- AI: Google Gemini 2.5 Flash via emergentintegrations (user's own GEMINI_API_KEY), PDF sent inline
- Payments: Stripe via emergentintegrations (test key sk_test_emergent); plans pro=$29, lifetime=$199
- Note: Spec requested Next.js/NextAuth/Vercel; built on Emergent-native React+FastAPI+Mongo (portable to Next.js later).

## User Choices
Gemini 2.5 Flash · own Gemini key · email/password auth only · real Stripe · core flow first.

## Data Model
- users: { email, password_hash, billing_status, plan, created_at }
- tax_returns: { user_id, tax_year, raw_fields(JSON), insights(JSON), context, created_at }  (raw PDF NEVER stored)
- payment_transactions: { session_id, user_id, plan_id, amount, payment_status, status, created_at }

## Implemented (2026-06-22)
- Landing (hero, 3-step how-it-works, sample insights, Free+Pro pricing, disclaimer)
- Signup/Login (JWT httpOnly cookie + bearer), protected routes, logout
- Upload: PDF drag-drop + 5-question intake (filing status, dependents, self-employment, goal, life changes)
- Analysis report: summary stats, insight cards ranked by $ impact w/ "Ask your CPA", Scenario Simulator (client-side, live)
- Dashboard: returns by year, summary stats, YoY effective-rate AreaChart, delete
- Settings: email, change password, billing status + upgrade (Stripe checkout), delete account
- BillingSuccess: polls checkout status, upgrades plan idempotently
- Gemini analysis with 3x retry/backoff on transient 503/429
- Disclaimer on all output pages

## Iteration 2 (2026-06-22) — PDF export + IRS grounding
- Download report as PDF: GET /api/returns/{id}/pdf (fpdf2) → branded report with stats, ranked insights, Ask-your-CPA, sources, disclaimer. "Download PDF" button on analysis page.
- Authoritative IRS grounding: backend/tax_reference.py holds official IRS figures for TY 2023/2024/2025 (brackets, std deduction, 401k/IRA/SEP limits, LTCG breakpoints, QBI/NIIT/CTC/education thresholds) sourced from IRS Rev. Procs & pubs. Injected into every Gemini prompt; model forced to use exact figures + cite IRS sources.
- "Sources & methodology" section added to analysis page; `sources` field added to return API + stored docs.
- Annual maintenance = add one new year block to tax_reference.TAX_REFERENCE + bump CURRENT_TAX_YEAR.
- Testing: backend 21/21 passed (incl. PDF auth/404/401, sources Rev.Proc. mapping, grounding correctness). Frontend code-verified + compiles; full browser E2E of analysis page constrained by preview latency (signup page rendered correctly; iteration-1 analysis flow passed).

## Testing
- Backend: 17/17 pytest passed (auth, returns CRUD + isolation, analyze, billing)
- Frontend: full E2E journeys passed (signup→upload→analyze→report, simulator live, dashboard, settings)
- Report: /app/test_reports/iteration_1.json

## Backlog / Next
- P1: Add Lifetime plan card to Landing pricing (currently Free+Pro on landing; Lifetime in Settings)
- P1: Google OAuth (deferred per user choice)
- P2: Downloadable/printable PDF report; share link
- P2: Multi-year comparison enhancements; richer Schedule C/D/E breakdowns
- P2: Webhook-driven billing confirmation hardening (currently polling + webhook both wired)

## Iteration 4 (2026-06-23) — Site-wide info tooltips, updated 2025 data, federal+state
- Synced from GitHub (user's deploy refactor: google-genai SDK, native Stripe, cents plans, Vercel CORS) before editing.
- InfoTooltip component (hover/focus/tap, light+dark tones) + shared lib/glossary.js. Tooltips added across Landing sample insights, InsightCard categories + estimated impact, Upload intake labels, Analysis stat tiles + combined section, Scenario Simulator sliders + result rates, Dashboard trend, YoY metric rows.
- Fixed outdated 2025 standard deduction to OBBBA figures: single $15,750 / MFJ $31,500 / MFS $15,750 / HoH $23,625 (was $15,000/$30,000/...). taxCalc.js upgraded to 2025 brackets + LTCG breakpoints.
- State tax: new lib/stateTax.js (2025 simplified per-state rates, 9 no-tax states). Upload now collects State; backend stores rawFields.state + adds to prompt. Analysis shows Federal+State combined card; Simulator shows federal/state/combined breakdown; YoY adds State tax + Combined rate rows.
- Verified: frontend compiles, backend boots, std deduction corrected, simulate() combined math checked, Landing renders with no JS errors. NOT yet E2E-tested on a live Gemini analysis (needs PDF upload) — code-verified only.

## Backlog / Next
- E2E test the full upload→analysis flow with a real PDF + state selected.
- State tax is a simplified flat estimate; could upgrade to true per-state brackets/standard deductions later.

## Iteration 5 (2026-06-23) — Engagement + conversion features
- NEW Mid-year Check-in (/app/checkin): PDF-free projection via taxCalc.projectTax (federal + SE + state), live tips (401k/IRA headroom, SE tax), nav item added. VERIFIED: $80k single → $9,049 tax / $64,250 taxable / 22% marginal.
- NEW public Learn page (/learn): "What does my tax bracket actually mean?" article + glossary (AMT, NIIT, QBI, cap gains, duty days, tax-loss harvesting, std deduction, marginal vs effective). Linked from Landing nav. VERIFIED rendering.
- Free vs paid gating (billingStatus !== 'free'): (a) Analysis insights — top 2 full, rest blurred w/ "Unlock full report" CTA; (b) Scenario Simulator — 2 free sliders, other 9 locked w/ upgrade banner; (c) PDF download paid-only (free → routes to Settings, button reads "Download PDF (Pro)"). Code-reviewed PASS.
- Simulator gained rental income, side-hustle (1099 w/ ~14% SE tax), home-office deduction sliders.
- YoY now has a "Here's why" narrative explaining effective-rate changes.
- Fixed check-in year label drift (pinned to TAX_YEAR=2025). Upload errors now scroll into view.

## KNOWN ISSUE (environment, not code)
- Preview backend/.env GEMINI_API_KEY is INVALID (prefix AQ.Ab8..., Google returns 401 ACCESS_TOKEN_TYPE_UNSUPPORTED — not an AIza... AI Studio key). So POST /api/returns/analyze 503s in PREVIEW and the analyzed-report flow (and its gating UI) can't run here until a valid Google AI Studio key is set. User's Render/Vercel deploy uses their own key.

## Backlog / Next
- E2E re-test free-user gating on a real analyzed return once a valid GEMINI key is in preview.
- Optional: paid-path E2E (requires Stripe checkout). Reflect 2025 figures + state in the downloadable PDF.
