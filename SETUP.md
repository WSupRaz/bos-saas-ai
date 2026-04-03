# BOS — Business Operating System
## Complete Setup Guide

---

## Prerequisites

Install these before starting:

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | comes with Node |
| PostgreSQL | 15+ | https://postgresql.org or Docker |
| Redis | 7+ | https://redis.io or Docker |
| Git | any | https://git-scm.com |

---

## Step 1 — Get the code

```bash
# Clone (replace with your actual repo path)
git clone <your-repo-url> bos-saas
cd bos-saas
```

If you built this manually, your folder is already at `/home/claude/bos`.  
Copy it somewhere convenient:

```bash
cp -r /home/claude/bos ~/bos-saas
cd ~/bos-saas
```

---

## Step 2 — Install dependencies

```bash
# From the root of the monorepo
npm install
```

This installs packages for all workspaces: `apps/web`, `apps/worker`, `packages/database`, `packages/shared`.

---

## Step 3 — Start PostgreSQL

### Option A: Docker (easiest for local dev)

```bash
docker run \
  --name bos-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=bos_dev \
  -p 5432:5432 \
  -d postgres:16

# Verify it's running
docker ps
```

### Option B: Local PostgreSQL already installed

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE bos_dev;"
```

### Option C: Railway / Supabase (cloud)

Create a new PostgreSQL project at https://railway.app or https://supabase.com.  
Copy the `DATABASE_URL` from the dashboard.

---

## Step 4 — Start Redis

### Option A: Docker

```bash
docker run \
  --name bos-redis \
  -p 6379:6379 \
  -d redis:7

# Verify
docker exec bos-redis redis-cli ping
# Should print: PONG
```

### Option B: Local Redis

```bash
# macOS
brew install redis && brew services start redis

# Ubuntu
sudo apt install redis-server && sudo systemctl start redis
```

### Option C: Upstash (serverless, free tier)

Go to https://upstash.com → Create Redis → Copy the `REDIS_URL` (it starts with `rediss://`).

---

## Step 5 — Set up environment variables

```bash
# Copy the example file
cp .env.example .env.local

# Open in your editor
nano .env.local    # or: code .env.local
```

### Minimum required variables to run locally:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/bos_dev"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth — generate with:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET="paste_your_64_char_hex_here"
JWT_REFRESH_SECRET="paste_a_different_64_char_hex_here"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# OpenAI (for AI chat — get from platform.openai.com)
OPENAI_API_KEY="sk-..."
```

### Optional (needed for WhatsApp / email to actually send):

```env
# WhatsApp (Meta Business API — developers.facebook.com)
WA_TOKEN="EAABs..."
WA_PHONE_ID="1234567890"
WA_PHONE_NUMBER="919876543210"
WA_VERIFY_TOKEN="choose-any-random-string"

# Email (SendGrid — sendgrid.com, free tier = 100 emails/day)
SENDGRID_API_KEY="SG...."
EMAIL_FROM_ADDRESS="noreply@yourdomain.com"
EMAIL_FROM_NAME="BOS"
```

> **Note:** Without WA and email credentials, the app still works — messages will be saved in the DB with `FAILED` status. Everything else is fully functional.

---

## Step 6 — Set up the database

```bash
# Navigate to the database package
cd packages/database

# Generate Prisma client from schema
npx prisma generate

# Run migrations — creates all 18 tables
npx prisma migrate dev --name init

# Seed with demo data (org, users, leads, inventory)
npx prisma db seed

# Go back to root
cd ../..
```

### Verify tables were created:

```bash
cd packages/database
npx prisma studio
# Opens at http://localhost:5555 — you can browse all tables
```

---

## Step 7 — Run the app

### Terminal 1 — Next.js web app:

```bash
cd apps/web
npm run dev
```

Open: http://localhost:3000

### Terminal 2 — Worker process (background jobs):

```bash
cd apps/worker
npm run dev
```

You should see:
```
✅ Redis connected
🚀 BOS Worker running. Queues: messages, emails, automations, reports
⏰ Cron jobs registered
```

### Or run both at once with Turborepo:

```bash
# From the root
npx turbo dev
```

---

## Step 8 — Log in

Open http://localhost:3000/login and use:

| Email | Password | Role |
|-------|----------|------|
| owner@demo.com | Demo@1234 | Owner (full access) |
| admin@demo.com | Demo@1234 | Admin |
| manager@demo.com | Demo@1234 | Manager |
| employee@demo.com | Demo@1234 | Employee |

Or register a fresh account at http://localhost:3000/register.

---

## Step 9 — Set up WhatsApp (optional but powerful)

### 9a. Create a Meta Developer App

1. Go to https://developers.facebook.com
2. Create a new App → Business type
3. Add "WhatsApp" product
4. Go to **WhatsApp → API Setup**
5. Note your **Phone Number ID** and **WhatsApp Business Account ID**
6. Generate a **Permanent System User Access Token** (valid forever — do NOT use the temporary token)
7. Add these to `.env.local`:
   ```env
   WA_TOKEN="your-permanent-token"
   WA_PHONE_ID="your-phone-number-id"
   WA_PHONE_NUMBER="919XXXXXXXXX"
   WA_VERIFY_TOKEN="any-secret-string-you-choose"
   ```

### 9b. Set up webhook (local dev with ngrok)

```bash
# Install ngrok from ngrok.com, then:
ngrok http 3000

# You'll get a URL like: https://abc123.ngrok-free.app
```

In Meta Developer Console → WhatsApp → Configuration → Webhooks:
- **Callback URL:** `https://abc123.ngrok-free.app/api/webhooks/whatsapp`
- **Verify Token:** (same as your `WA_VERIFY_TOKEN`)
- **Webhook fields to subscribe:** `messages`, `message_deliveries`, `message_reads`

### 9c. Store your WhatsApp Phone ID in org settings

After logging in as Owner, update your org settings to include the `waPhoneId`.  
Or run this SQL directly:

```sql
UPDATE organizations
SET settings = settings || '{"waPhoneId": "YOUR_PHONE_NUMBER_ID"}'::jsonb
WHERE slug = 'your-org-slug';
```

### 9d. Test it

Send a WhatsApp message to your business number with:
```
Stock: 250 kg
```
Check the **Reports** page — it should appear automatically parsed.

---

## Step 10 — Production deployment

### Frontend → Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from apps/web
cd apps/web
vercel --prod
```

Set all environment variables in the Vercel dashboard.

### Worker + DB + Redis → Railway

1. Go to https://railway.app → New Project
2. Add a **PostgreSQL** service
3. Add a **Redis** service
4. Add a **GitHub repo** service pointing to `apps/worker`
   - Start command: `npm run build && npm start`
   - Root directory: `apps/worker`
5. Set all environment variables (copy from `.env.local`)
6. Run migrations against production DB:
   ```bash
   DATABASE_URL="your-prod-url" npx prisma migrate deploy
   DATABASE_URL="your-prod-url" npx prisma db seed
   ```

### Update CORS / App URL

In production, update `.env`:
```env
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
NEXTAUTH_URL="https://your-app.vercel.app"
```

---

## Troubleshooting

### "Cannot find module '@prisma/client'"
```bash
cd packages/database && npx prisma generate
cd apps/web && npx prisma generate --schema=../../packages/database/prisma/schema.prisma
```

### "REDIS_URL connection refused"
Make sure Redis is running: `docker start bos-redis` or `redis-cli ping`

### "JWT_SECRET is not set"
You must set `JWT_SECRET` in `.env.local` before running the app.

### Worker not picking up jobs
Check both the web app AND worker have the same `REDIS_URL`.

### WhatsApp webhook returns 403
Verify that `WA_VERIFY_TOKEN` in `.env.local` matches exactly what you entered in Meta Developer Console.

### Prisma migration fails on "already exists"
```bash
cd packages/database
npx prisma migrate reset   # WARNING: drops all data
npx prisma migrate dev
npx prisma db seed
```

---

## Project structure recap

```
bos-saas/
├── packages/
│   ├── database/           Prisma schema + seed
│   └── shared/             TypeScript types + Redis util
│
└── apps/
    ├── web/                Next.js 14 — frontend + all API routes
    │   ├── app/
    │   │   ├── (auth)/     Login + Register pages
    │   │   ├── (dashboard)/ All dashboard pages
    │   │   └── api/        All 20+ API routes
    │   ├── components/     React components
    │   ├── lib/            DB, JWT, permissions, queues
    │   └── services/       WhatsApp, Email, AI, Automation
    │
    └── worker/             BullMQ worker process
        └── src/
            ├── processors/ WA, Email, Automation, Report jobs
            ├── crons.ts    Scheduled jobs (8am, 6pm, 7am, midnight)
            └── index.ts    Entry point
```

---

## API reference (quick)

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Create org + owner |
| POST | /api/auth/login | Login, get JWT |
| GET  | /api/auth/me | Current user |
| GET/POST | /api/leads | List / create leads |
| GET/PATCH/DELETE | /api/leads/:id | Lead detail |
| GET/POST | /api/tasks | List / create tasks |
| GET/PATCH/DELETE | /api/tasks/:id | Task detail |
| GET/POST | /api/reports | List / submit reports |
| GET | /api/reports/summary | Today's submission status |
| GET/POST | /api/messages | List / send message |
| GET/POST | /api/webhooks/whatsapp | WA webhook |
| GET/POST | /api/orders | Orders |
| GET/POST | /api/inventory | Inventory |
| PATCH/DELETE | /api/inventory/:id | Update stock |
| GET/POST | /api/rates | Market rates |
| GET/POST | /api/automations | Automation rules |
| PATCH/DELETE | /api/automations/:id | Toggle / delete |
| POST | /api/ai/chat | AI assistant |
| GET | /api/analytics/dashboard | Dashboard stats |
| GET/POST | /api/users | Team management |
| GET/PATCH | /api/notifications | In-app notifications |

---

## What's already wired up

- ✅ Multi-tenant: every query is scoped to `organizationId`
- ✅ RBAC: 6 roles, 20 permissions, enforced at API level
- ✅ JWT auth: access token (7d) + refresh token (30d)
- ✅ WhatsApp: send, schedule, broadcast, inbound parsing
- ✅ Email: send, schedule, broadcast via SendGrid
- ✅ Automation engine: IF/THEN rules, 9 triggers, 6 action types
- ✅ AI assistant: GPT-4o with 6 live-data function tools
- ✅ Background workers: BullMQ on Redis, 4 queues, concurrency
- ✅ Cron jobs: 8am report requests, 6pm follow-ups, 7am rate collection
- ✅ Dashboard: revenue chart, lead pipeline, real-time stats
- ✅ All 7 main pages: Dashboard, CRM, Tasks, Reports, Inventory, Market, AI Chat, Automation, Team
