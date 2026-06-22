# TaxLens — Test Credentials

## Test User (email/password auth)
- Email: `test@taxlens.com`
- Password: `test123`

(Created via /api/auth/register. Create a fresh one if deleted.)

## Auth Endpoints
- POST /api/auth/register  { email, password }
- POST /api/auth/login     { email, password }
- POST /api/auth/logout
- GET  /api/auth/me
- POST /api/auth/change-password { currentPassword, newPassword }
- DELETE /api/auth/account

## Notes
- Auth uses JWT in an httpOnly cookie (`access_token`, secure, samesite=none) AND returns a bearer token in the response body.
- Gemini analysis: POST /api/returns/analyze (multipart: pdf + intake fields).
- Stripe test key (sk_test_emergent) is configured; plans: pro ($29), lifetime ($199).
