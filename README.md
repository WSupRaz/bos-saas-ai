# BOS SaaS — AI-Powered Business Operating System

A full-stack AI SaaS combining CRM, task management, analytics, and an AI assistant in one product. Built to give small businesses the operational tooling that usually requires 4 separate subscriptions.

🚀 **Live app:** https://bos-saas-ai-web.vercel.app
📹 **4-min demo:** https://www.loom.com/share/8166af05340d43758d47d2880eca91e1
🔗 **LinkedIn:** [linkedin.com/in/himanshu-patel-5195501a2](https://www.linkedin.com/in/himanshu-patel-5195501a2/)

---

## The Problem

Small businesses (5–50 employees) lose 3–4 hours/day to manual CRM updates, scattered task tracking, and ad-hoc customer follow-ups. The existing tools either cost too much (Salesforce, HubSpot) or only solve one piece (Trello, Notion, basic CRMs).

## The Solution

BOS SaaS is a single platform combining:

- **CRM module** — Lead capture, status pipeline (New → Contacted → Negotiating → Closed), contact history
- **Task management** — Role-based assignment (Admin / Manager / Staff), deadlines, completion tracking
- **Analytics dashboard** — Revenue, lead conversion, task velocity, team performance
- **AI assistant** — Ask questions about your business data in plain English (LangChain + OpenAI)
- **WhatsApp module** — Automated customer follow-ups

---

## Live Demo

Try it live: **https://bos-saas-ai-web.vercel.app**

Or watch the 4-minute walkthrough: https://www.loom.com/share/8166af05340d43758d47d2880eca91e1

---

## Architecture
User Browser
↓
Next.js 14 Frontend (App Router + Zustand state)
↓
Next.js API Routes (REST endpoints)
↓
┌─────────────────┬──────────────────┐
↓                 ↓                  ↓
Prisma ORM        LangChain          Auth layer
↓                 ↓
PostgreSQL        OpenAI API

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| State management | Zustand |
| Backend | Next.js API Routes (Node.js runtime) |
| Database | PostgreSQL |
| ORM | Prisma |
| AI / LLM | LangChain, OpenAI API |
| Deployment | Vercel |

---

## Key Features

- Role-based access control (Admin · Manager · Staff)
- CRM lead pipeline with status transitions
- Task assignment with deadline tracking
- AI assistant reading live business data (not static FAQ)
- Real-time analytics dashboard
- WhatsApp automation for customer follow-ups
- Responsive UI (works on mobile)

---

## Running Locally

```bash
git clone https://github.com/WSupRaz/bos-saas-ai
cd bos-saas-ai

npm install
cp .env.example .env
# Fill in your values

npx prisma migrate dev
npm run dev
```

Open http://localhost:3000

---

## What I'd Improve Next

This is v1. Honest list of what's not built yet:

- [ ] Test suite (Jest + Playwright)
- [ ] Move AI logic to a dedicated FastAPI microservice
- [ ] ChromaDB for persistent context across sessions
- [ ] Email notification system
- [ ] PDF export for analytics
- [ ] Multi-tenancy (currently single-org)

---

## Why I Built This

2+ years in digital marketing meant watching small business owners juggle 4–5 tools to run one company. BOS SaaS is what I wished existed. Built solo, end-to-end.

---

## Author

**Himanshu Patel** — Full-stack AI engineer based in Bangalore.
🔗 [LinkedIn](https://www.linkedin.com/in/himanshu-patel-5195501a2/) · 🌐 [Portfolio](https://himanshu-portfolio-khaki.vercel.app/) · 💻 [GitHub](https://github.com/WSupRaz)

Open to GenAI Engineer / AI Product Engineer roles.
