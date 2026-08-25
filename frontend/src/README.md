# Support Ticket & SLA Tracker

A production-ready full-stack application built for tracking support tickets, enforcing business-hours SLA compliance, and managing role-based agent workflows.

## 🛠️ Tech Stack
- **Backend**: Node.js, TypeScript (Strict Mode), GraphQL Yoga, Prisma ORM, PostgreSQL.
- **Frontend**: React, Vite, TypeScript, TailwindCSS, `graphql-request`.
- **Testing**: Vitest (Unit tests for SLA engine + Integration tests against real PostgreSQL).

---

## 🏛️ Architecture Overview
```text
assignment/
├── backend/
│   ├── prisma/           # Prisma schema, migrations, and seed script
│   ├── src/
│   │   ├── graphql/      # Schema definition (.graphql) and resolvers
│   │   ├── services/     # Business logic (SLA engine, Auth service)
│   │   └── tests/        # Unit & real database integration tests
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/          # GraphQL client & operations definitions
    │   └── App.tsx       # Dashboard, login, and ticket management UI
    └── package.json