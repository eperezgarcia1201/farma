# Farma Platform

Business platform for pharmacy/POS operations:
- Web: Next.js + TypeScript
- API: NestJS + Prisma + PostgreSQL
- Mobile: Expo React Native

## Docker First
1. `docker compose up --build -d`
2. API health: `http://localhost:14000/api/health`
3. Web app: `http://localhost:13000`
4. Postgres (host): `localhost:55432`

Notes:
- API container auto-runs `prisma db push` on startup.
- Mobile app is run with Expo tooling, not Docker.

## Single-Business Mode
This project now runs in single-business mode.
- Frontend does not ask for tenant/company selection.
- API auto-uses one default business internally.

## Core API Endpoints
- `POST /api/inventory/products`
- `GET /api/inventory/catalog`
- `POST /api/inventory/lots/schedule`
- `POST /api/sales`
- `POST /api/purchases`
- `GET /api/purchases`
- `POST /api/masters/customers`
- `POST /api/masters/suppliers`
- `POST /api/masters/employees`
- `POST /api/finance/expenses`
- `GET /api/finance/receivables`
- `GET /api/finance/payables`
- `GET /api/stats/top-products`
- `GET /api/stats/dashboard`

## Top 10 Advanced Features Implemented
1. Open invoices as the default invoice view.
2. Low-stock alerts (current stock vs reorder point).
3. Expiring-lot alerts (batch tracking with days left).
4. Receivables aging buckets (current, 1-30, 31-60, 61+ days).
5. Payables aging buckets (current, 1-30, 31-60, 61+ days).
6. Top customers by revenue and outstanding balance.
7. Top suppliers by purchasing volume and payable balance.
8. Employee performance metrics (sales, invoices, collected).
9. Unified activity timeline (sales, purchases, expenses).
10. Enhanced CSV/XLSX exports with KPI overview + alert sheets.
