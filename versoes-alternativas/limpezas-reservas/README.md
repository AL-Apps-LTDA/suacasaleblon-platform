# Sua Casa Leblon

Planning repository for the **Sua Casa Leblon** reservations website project.

## Project Identity
- This repository is for the **Sua Casa Leblon** app only.
- It is **not** the "Sua Casa Leblon - Limpezas" app.
- The Sora project is separate and out of scope for this repository.

## Domain
- Working domain target: **suacasaleblon.com.br**
- Alternative fallback (if unavailable): **app.suacasaleblon.com.br**

## Do I need GitHub?
No. GitHub is optional.
- **Required:** Git (version control) + an off-device backup of the repository.
- **Optional:** GitHub (or GitLab/Bitbucket) as a remote and CI/CD helper.
- You can deploy without GitHub (manual upload/CLI deploy).

## Absolute Minimum External Services
If you want to run this in production, the minimum non-code pieces are:
- A domain name (or subdomain).
- DNS + SSL/TLS (can be managed by your host/Cloudflare).
- App hosting (where the site/API runs).
- A database (if bookings are stored).
- Backup for the database and code.

## Minimum Stack (Security + Hosting + Deployment)
- **Frontend + Backend**: Next.js (single app) or simple Node.js app.
- **Database**: PostgreSQL (managed preferred).
- **Hosting**: One managed platform (e.g., Vercel/Render/Railway) with HTTPS.
- **Domain/DNS**: Cloudflare or registrar DNS with SSL/TLS enabled.
- **Authentication/Admin protection**: email+password with strong hashing (or magic link).
- **Security baseline**: HTTPS-only, env vars for secrets, rate limiting, backups, audit logs.
- **Deployment minimum**: one production environment + optional staging.

## Current Focus
We are proceeding with the reservations website implementation in this repository.

## Working Plan
The detailed execution plan lives here:
- [`docs/reservations-website-plan.md`](docs/reservations-website-plan.md)

## Immediate Next Actions
- Confirm final booking flow (services, dates, payments, confirmations).
- Create initial wireframes for homepage, booking page, and admin view.
- Start implementation sprint 1 (MVP website foundation).
- Reserve and configure the selected production domain.
- Choose the minimum stack and security baseline from the plan.
