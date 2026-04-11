# Sua Casa Leblon — Reservations Website Execution Plan

## Project Boundary
This document covers only the **Sua Casa Leblon** reservations website.
- This is a different app from "Sua Casa Leblon - Limpezas".
- The Sora project is tracked separately and is out of scope here.

## Domain Decision
- Primary target: **suacasaleblon.com.br**
- Fallback: **app.suacasaleblon.com.br**
- Action: confirm availability and complete DNS + SSL setup during Week 1.

## GitHub Requirement
GitHub is optional, not required.
- **Required:** Git-based version control and off-device backup.
- **Optional:** GitHub/GitLab/Bitbucket as remote + automated CI/CD.
- If no GitHub: deploy via provider CLI/manual and keep scheduled backups.

## Absolute Minimum External Services (Production)
- Domain/subdomain
- DNS + SSL/TLS
- App hosting
- Database (if using online reservations persistence)
- Backups (code + database)

## Minimum Technical Stack (Lean Setup)
- **App layer**: Next.js (recommended all-in-one) for website + booking endpoints.
- **Data layer**: PostgreSQL (managed).
- **Hosting**: Managed app hosting with automatic HTTPS and logs.
- **DNS/SSL**: Cloudflare or domain registrar DNS with SSL/TLS always on.
- **Transactional notifications**: Email provider (for booking confirmations).

## Minimum Security Baseline
- Enforce HTTPS and secure headers.
- Store secrets in environment variables (never in code).
- Protect admin routes with authentication + role checks.
- Add rate limiting and bot/spam protection on booking endpoints.
- Validate/sanitize all form input server-side.
- Enable automated database backups and restore testing.
- Keep dependency updates and basic monitoring/alerts.

## Minimum Deployment Baseline
- Environments: `production` (required), `staging` (recommended).
- CI/CD: optional; manual deploy acceptable for MVP.
- Release checklist: migrations, smoke test, rollback plan.

## 1) Objectives
- Let customers book cleaning services online with a simple, mobile-first flow.
- Reduce manual WhatsApp/phone coordination for scheduling.
- Centralize booking status and customer details.

---

## 2) Scope (MVP)
- Public pages: Home, Services, About, Contact.
- Booking flow: service selection, date/time preference, customer info, confirmation.
- Admin/basic ops: booking list with status (new, confirmed, completed, cancelled).
- Notifications: confirmation message/email.

---

## 3) Workstreams

### A. Product & UX
- Define booking user journey end-to-end.
- Create wireframes and low-fidelity prototypes.
- Validate language/tone in Portuguese for local audience.

### B. Engineering
- Choose stack and deployment path.
- Implement booking forms + backend persistence.
- Add admin interface and status updates.
- Implement analytics and conversion tracking.

### C. Go-to-Market
- Landing page optimization.
- Launch campaign focused on online booking conversion.
- Retargeting funnel for incomplete bookings.

---

## 4) Suggested Timeline (6 weeks)

### Week 1: Discovery, architecture, domain, and security setup
- Finalize requirements and user flow.
- Confirm page map and data model.
- Register chosen domain and configure DNS/SSL.
- Confirm minimum stack and security controls.

### Week 2: Design sprint
- Wireframes + visual direction.
- Copywriting for core pages and booking screens.

### Week 3: Build sprint I
- Front-end page implementation.
- Booking form + API + database schema.
- Basic admin bookings table.

### Week 4: Build sprint II
- Booking confirmation and notifications.
- Validation, error states, and anti-spam protection.

### Week 5: QA & analytics
- End-to-end testing for booking flow.
- Analytics events setup (visit, start booking, complete booking).
- Performance and mobile optimization.

### Week 6: Launch
- Production deploy to the selected domain.
- Launch campaign for booking acquisition.
- Monitor metrics and collect first improvement backlog.

---

## 5) Risks & Mitigations
- **Scheduling conflicts** -> enforce slot availability logic and confirmation windows.
- **Low conversion** -> simplify form fields and test CTA/copy variants.
- **Domain delays** -> secure fallback subdomain and parallelize DNS/SSL setup.
- **Security gaps** -> apply baseline controls before public launch.
- **Operational overload** -> status automation and clear admin triage process.

---

## 6) Success Metrics
- Booking conversion rate.
- Cost per lead / cost per booking.
- Booking completion rate.
- Repeat customer rate.

---

## 7) Immediate Implementation Checklist
- [ ] Finalize MVP requirements document.
- [ ] Decide tech stack and hosting.
- [ ] Confirm final production domain.
- [ ] Configure DNS, SSL, and redirect policy.
- [ ] Define security baseline (auth, rate limiting, backups, monitoring).
- [ ] Create wireframes for booking funnel.
- [ ] Define database entities (customer, booking, service, status).
- [ ] Set up repo structure for web app implementation.
- [ ] Create launch dashboard for metrics.
