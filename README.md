# MindCraft — AI-Powered CV Analysis Platform

Upload a PDF resume, ask questions about the candidate, and generate an interview quiz.

[Live demo](https://ai-powered-cv-analysis-platform-bac-ten.vercel.app) · [Video walkthrough](https://drive.google.com/file/d/1jB2rL1l5l0fVNsJEpixF3nZ7EyoIISel/view?usp=sharing)

---

## Try it

| | |
|---|---|
| **URL** | [https://ai-powered-cv-analysis-platform-bac-ten.vercel.app](https://ai-powered-cv-analysis-platform-bac-ten.vercel.app) |
| **Email** | `admin@craftmind.local` |
| **Password** | `Admin123!` |

Use this **admin** account (already verified). New sign-up needs a working email OTP.

The API can take about a minute on the first request if it was idle. Wait and retry.

---

## Screenshots

Drop your images in [`docs/screenshots/`](docs/screenshots/) using these names, then they show up here:

| File | What to capture |
|------|-----------------|
| `login.png` | Sign-in screen |
| `dashboard.png` | Dashboard (upload + chat) |
| `chat-quiz.png` | Chat with a CV and/or quiz |

![Login](docs/screenshots/login.png)

![Dashboard](docs/screenshots/dashboard.png)

![Chat and quiz](docs/screenshots/chat-quiz.png)

---

## How to use

1. Log in with the demo account.
2. Upload a **PDF** resume.
3. Open chat and ask things like: *What are the strongest skills?* *Any React experience?* *Summarize this profile.*
4. Generate an AI quiz from that CV (multiple choice). You can send it by email if SMTP is configured.
5. Admins can also list CVs, users, and quiz attempts from the navbar.

---

## Tools you need (local)

- [Node.js](https://nodejs.org/) **18+**
- [pnpm](https://pnpm.io/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/)
- API keys: **Google Gemini** (embeddings + chat) and **SendGrid / SMTP** (app will not start without them)

---

## Run locally

```bash
git clone https://github.com/BkHassan/ai-powered-cv-analysis-platform.git
cd ai-powered-cv-analysis-platform
```

**1. Backend env** — copy [`.env.example`](.env.example) to `.env` at the repo root and fill in keys:

```env
GEMINI_API_KEY=
JWT_SECRET=dev-only-change-me
CHROMADB_URL=http://chromadb:8000
PORT=3003
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=

ADMIN_EMAIL=admin@craftmind.local
ADMIN_PASSWORD=Admin123!
```

**2. Frontend env** — `apps/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3003
```

**3. Start** — backend + ChromaDB, then the UI:

```bash
docker compose up --build
```

```bash
cd apps/frontend
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with `admin@craftmind.local` / `Admin123!`.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:3003/health |

---

## How to test

No automated UI suite is required. After login:

1. `http://localhost:3003/health` returns `{"status":"ok"}`.
2. Upload a PDF and check it appears in the CV list.
3. Ask a question in chat and get an answer grounded in that CV.
4. Generate a quiz from the same CV.

Wrong password should stay on login. An unknown email should offer sign-up, not a 404 page.

---

## Stack (short)

Next.js frontend (Vercel) · NestJS API + ChromaDB (`docker-compose.yml` locally, `docker-compose.backend.yml` on Dokploy) · Gemini for embeddings, chat, and quizzes.

---

## Author

[Hassan Boukatena](https://github.com/BkHassan)
