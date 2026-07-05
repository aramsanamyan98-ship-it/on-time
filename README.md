# On-Time

Booking and growth platform for independent barbers and beauty specialists
in Armenia. See `docs/` for product background.

This repo is the `app.ontime.am` app: Next.js (App Router) + TypeScript +
Tailwind CSS + PostgreSQL (Prisma), with Armenian/Russian/English support
from day one via next-intl.

## Current scope

Authentication only (register, email verification, login, forgot/reset
password) plus an empty post-login dashboard. See `docs/02_PRD.md` Section
3 and `docs/05_Database.md` for the source requirements.

## Local setup

1. Copy `.env.example` to `.env` and fill in `AUTH_SECRET` (any long random
   string for local dev).
2. Start Postgres: `docker compose up -d` (uses `docker-compose.yml`,
   matches the default `DATABASE_URL` in `.env.example`). If you don't have
   Docker, point `DATABASE_URL` at any local Postgres instead.
3. Install dependencies and apply migrations:
   ```
   npm install
   npx prisma migrate deploy
   ```
4. `npm run dev` and open http://localhost:3000.

Emails (verification, password reset) are logged to the console instead of
sent unless `SMTP_HOST` is set in `.env` — look for `[dev mailer]` lines in
the terminal running `npm run dev`.
