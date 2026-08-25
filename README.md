# Support Ticket & SLA Tracker

## Project Overview
A full-stack Support Ticket & SLA (Service Level Agreement) Tracker built to manage support requests, track resolution times strictly using business hours, and enforce strict status transition rules.

## Tech Stack
- **Backend:** Node.js, TypeScript (Strict Mode, no `any`), GraphQL Yoga (Schema-first)
- **Database:** PostgreSQL (Docker Compose), Prisma ORM
- **Frontend:** React, TypeScript, TailwindCSS

## Architecture Overview
The project is structured as a monorepo containing isolated `frontend` and `backend` workspaces[cite: 1]. The GraphQL API uses a schema-first approach with distinct `.graphql` files and TypeScript resolvers[cite: 1]. The SLA business logic is decoupled from resolvers into a highly testable, isolated service[cite: 1]. 

## SLA Calculation Approach & Timezones
- **Business Hours:** 09:00 to 18:00, Monday through Friday[cite: 1].
- **Timezone:** Configured via `BUSINESS_TIMEZONE=Asia/Kolkata`[cite: 1].
- **Rules:** Weekends and configured public holidays contribute 0 hours to the SLA budget[cite: 1]. Time outside of business hours is ignored[cite: 1].
- **Clock Freezing:** SLA clocks freeze permanently upon the first agent comment (`firstResponseAt`) or ticket resolution (`resolvedAt`)[cite: 1].

## Database Schema Overview
Managed entirely via Prisma migrations, the core models include:
- `User`: Supports `REPORTER` and `AGENT` roles with securely hashed passwords (Argon2/Bcrypt)[cite: 1].
- `Ticket`: Tracks priority, status, assignee, and SLA timestamps[cite: 1].
- `Comment`: Belongs to a ticket and tracks the author[cite: 1].
- `Holiday`: Configurable calendar dates excluded from SLA calculations[cite: 1].

## Status Transition Rules
Tickets follow a strict lifecycle validated on the server: `OPEN` -> `IN_PROGRESS` -> `RESOLVED` -> `CLOSED`[cite: 1].
Invalid transitions (e.g., `CLOSED` directly to `IN_PROGRESS`) return a machine-readable `INVALID_STATUS_TRANSITION` GraphQL error[cite: 1].

## Setup Instructions

### 1. Environment Variables
Create a `.env` file in the `backend/` directory based on `.env.example`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/support_db?schema=public"
JWT_SECRET="super-secret-key"
BUSINESS_TIMEZONE="Asia/Kolkata"
