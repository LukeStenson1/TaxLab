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
