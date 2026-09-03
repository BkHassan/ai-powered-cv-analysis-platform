<div align="center">

# MindCraft — AI-Powered CV Analysis Platform

**Upload a resume. Chat with it. Generate an interview quiz.**

A recruitment tool that turns PDF CVs into searchable knowledge using embeddings, RAG chat, and AI-generated assessments.

[**Live demo**](https://ai-powered-cv-analysis-platform-bac-ten.vercel.app) · [Try with demo login](#try-the-app)

</div>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/ChromaDB-vector-FF6B35" alt="ChromaDB" />
  <img src="https://img.shields.io/badge/Gemini-embeddings-4285F4?logo=google&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?logo=openai&logoColor=white" alt="OpenAI" />
</p>

---

## Try the app

**Demo:** [https://ai-powered-cv-analysis-platform-bac-ten.vercel.app](https://ai-powered-cv-analysis-platform-bac-ten.vercel.app)

| | |
|---|---|
| **Email** | `admin@craftmind.local` |
| **Password** | `Admin123!` |

Use this **admin** account — it is already verified. Creating a new account may fail email OTP if SendGrid is not configured.

The backend may sleep after idle time. If login takes ~1 minute the first time, wait and retry.

**What to try**

1. Sign in with the credentials above.
2. Upload a **PDF** resume.
3. Ask questions about the candidate (skills, experience, projects).
4. Generate an AI quiz from that CV.

---

## Screenshots

<p align="center">
  <img src="docs/screenshots/login.png" alt="Login screen" width="800" />
  <br />
  <em>Sign in</em>
</p>

<p align="center">
  <img src="docs/screenshots/dashboard.png" alt="Recruiter dashboard" width="800" />
  <br />
  <em>Dashboard — upload CVs and start chatting</em>
</p>

<p align="center">
  <img src="docs/screenshots/chat-quiz.png" alt="RAG chat and quiz generation" width="800" />
  <br />
  <em>RAG chat on a CV and AI interview quiz</em>
</p>

---

## What it does

Recruiters often scan dozens of PDFs by hand. This platform indexes each resume so you can **ask questions in natural language** and **generate interview questions** from the same document.

| Feature | Detail |
|---------|--------|
| PDF upload | Extract text, chunk it, store embeddings |
| Chat with a CV | RAG: retrieve relevant chunks, then answer with GPT-4o-mini |
| Chat across CVs | Ask questions over all uploaded resumes |
| AI quizzes | Multiple-choice questions from a CV, email to candidates, auto-score |
| Auth | JWT, OTP email verification, admin vs user roles |

---

## How it works

```text
PDF  →  extract + chunk  →  Gemini embeddings  →  ChromaDB
                                              ↓
                         recruiter question  →  retrieve context  →  GPT-4o-mini
```

- **Frontend:** Next.js (React, Tailwind) — deployed on Vercel  
- **Backend:** NestJS — REST API (auth, CV, quiz, email)  
- **Vectors:** ChromaDB `0.5.23` (v1 API, matches the JS client)  
- **AI:** Gemini for embeddings, OpenAI for chat and quizzes  

---

## Run locally

**Need:** Node 18+, pnpm, Docker Desktop, keys for Gemini, OpenAI, and (optional) SendGrid.

```bash
git clone https://github.com/BkHassan/ai-powered-cv-analysis-platform.git
cd ai-powered-cv-analysis-platform
```

1. Copy [`.env.example`](.env.example) to `.env` and fill in your keys. For Docker:

```env
CHROMADB_URL=http://chromadb:8000
PORT=3003
FRONTEND_URL=http://localhost:3000
ADMIN_EMAIL=admin@craftmind.local
ADMIN_PASSWORD=Admin123!
```

2. Frontend:

```env
# apps/frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3003
```

3. Start backend + ChromaDB, then the UI:

```bash
docker compose up --build
```

```bash
cd apps/frontend
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the same admin credentials.

---

## Repo layout

```text
apps/frontend   Next.js UI
apps/backend    NestJS API (auth, cv, quiz, email)
docker-compose.yml        local backend + ChromaDB
docker-compose.prod.yml   production backend + ChromaDB
```

---

## Author

[Hassan Boukatena](https://github.com/BkHassan) — AI / full-stack

If this is useful, a star on the repo is appreciated.
