<div align="center">

### ≡اجû AI-Powered CV Analysis Platform

### Intelligent Resume Analysis ظت RAG Chat ظت AI Quiz Generation ظت Semantic Search

<p>
An end-to-end recruitment platform that leverages Large Language Models and Retrieval-Augmented Generation (RAG) to analyze resumes, chat with candidate profiles, and automatically generate technical assessments.
</p>

</div>

---

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge)
![ChromaDB](https://img.shields.io/badge/ChromaDB-FF6B35?style=for-the-badge)

</div>

<div align="center">

![License](https://img.shields.io/badge/License-MIT-success?style=flat-square)
![Status](https://img.shields.io/badge/Status-Completed-blue?style=flat-square)
![Monorepo](https://img.shields.io/badge/Architecture-Monorepo-orange?style=flat-square)
![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square)

</div>

---

### ≡اôّ Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Solution](#-solution)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [AI Pipeline](#-ai-pipeline)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Screenshots](#-screenshots)
- [Installation](#-installation)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Database Design](#-database-design)
- [Security](#-security)
- [Challenges & Solutions](#-challenges--solutions)
- [Roadmap](#-roadmap)
- [Future Improvements](#-future-improvements)
- [Contributing](#-contributing)
- [License](#-license)
  
---

### ≡اôû Overview

The **AI-Powered CV Analysis Platform** is an intelligent recruitment platform designed to streamline the candidate screening process using Artificial Intelligence.

The platform enables recruiters to upload resumes, analyze candidate profiles, interact with CVs through Retrieval-Augmented Generation (RAG), generate AI-powered technical quizzes, and manage the recruitment workflow from a centralized dashboard.

By combining semantic search, Large Language Models, and modern web technologies, the platform transforms traditional CV management into a faster, more interactive, and data-driven recruitment experience.

---

### ظإù Problem Statement

Recruitment teams often receive hundreds of resumes for a single job opening. Reviewing each CV manually is time-consuming, repetitive, and makes it difficult to consistently identify the most relevant candidates.

Traditional recruitment workflows also lack intelligent interaction with candidate information, requiring recruiters to spend valuable time searching through resumes, preparing interview questions, and evaluating applicants manually.

These challenges slow down the hiring process and reduce overall recruitment efficiency.

---

### ≡اْة Solution

This platform leverages Artificial Intelligence and Retrieval-Augmented Generation (RAG) to automate and enhance key stages of the recruitment process.

The system allows recruiters to upload resumes, extract and index their content into a vector database, ask natural language questions about candidates, automatically generate technical quizzes based on each CV, and manage candidates through a secure web interface.

By integrating semantic search, AI-powered reasoning, and modern backend architecture, the platform provides recruiters with faster access to relevant information while reducing manual effort throughout the hiring workflow.

----

### ظ£ذ Key Features

- ≡اô Upload and analyze PDF resumes
- ≡اجû Chat with CVs using Retrieval-Augmented Generation (RAG)
- ≡ادب Generate AI-powered technical quizzes
- ≡اôè Manage candidates through an admin dashboard
- ≡ا¤ Secure authentication with JWT and role-based access control
- ≡اôد Email verification and quiz sharing
- ظأة Fast semantic search using vector embeddings
 
---

### ≡اùي╕ System Architecture

The platform follows a modular **monorepo architecture**, separating the frontend and backend while integrating AI services, vector search, and authentication into a scalable recruitment platform.

```text
                               ظ¤îظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤
                               ظ¤é        Recruiter        ظ¤é
                               ظ¤¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤شظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ء
                                            ظ¤é
                                            ظû╝
                             ظ¤îظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤
                             ظ¤é     Next.js Frontend       ظ¤é
                             ظ¤é  React ظت Tailwind CSS      ظ¤é
                             ظ¤¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤شظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ء
                                          ظ¤é REST API
                                          ظû╝
                        ظ¤îظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤
                        ظ¤é        NestJS Backend API          ظ¤é
                        ظ¤¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤شظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤شظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ء
                                ظ¤é          ظ¤é
                 ظ¤îظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ء          ظ¤¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤
                 ظû╝                                        ظû╝
         Authentication                          AI Services
       JWT ظت OTP ظت Roles                    CV & Quiz Modules
                 ظ¤é                                        ظ¤é
                 ظ¤é                                        ظû╝
                 ظ¤é                          OpenAI GPT-4o-mini
                 ظ¤é                          Google Gemini Embeddings
                 ظ¤é
                 ظû╝
         ظ¤îظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤
         ظ¤é    ChromaDB      ظ¤é
         ظ¤é  Vector Database ظ¤é
         ظ¤¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ء
```

The application is organized into independent backend modules responsible for authentication, CV management, AI-powered chat, and quiz generation. Candidate resumes are transformed into vector embeddings and stored in ChromaDB, enabling semantic search and Retrieval-Augmented Generation (RAG) for accurate AI responses.

---

### ≡اجû AI Pipeline

The platform follows a Retrieval-Augmented Generation (RAG) pipeline to analyze resumes and provide context-aware responses.


```text
          PDF Resume
               ظ¤é
               ظû╝
      Text Extraction
               ظ¤é
               ظû╝
      Text Chunking
               ظ¤é
               ظû╝
   Gemini Embedding Model
               ظ¤é
               ظû╝
  Store Embeddings in ChromaDB
               ظ¤é
               ظû╝
     Semantic Similarity Search
               ظ¤é
               ظû╝
     Relevant Context Retrieval
               ظ¤é
               ظû╝
        Prompt Construction
               ظ¤é
               ظû╝
        OpenAI GPT-4o-mini
               ظ¤é
        ظ¤îظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤┤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤
        ظû╝               ظû╝
  Chat Response    Quiz Generation
```
---

### Pipeline Overview

1. Upload a candidate's resume in PDF format.
2. Extract and clean the document text.
3. Split the content into semantic chunks.
4. Generate vector embeddings using Google Gemini.
5. Store embeddings inside ChromaDB.
6. Retrieve the most relevant chunks for each user query.
7. Enrich prompts with retrieved context.
8. Generate accurate AI responses or technical interview quizzes using OpenAI.
---
## ≡اؤبي╕ Technology Stack

<div align="center"> 
  
| Layer | Technologies |
|--------|--------------|
| **Frontend** | Next.js, React, Tailwind CSS, TypeScript |
| **Backend** | NestJS, Node.js, Express |
| **Artificial Intelligence** | OpenAI GPT-4o-mini, Google Gemini Embeddings, LangChain |
| **Vector Database** | ChromaDB |
| **Machine Learning** | Retrieval-Augmented Generation (RAG), Semantic Search |
| **Authentication** | JWT, OTP Verification, Role-Based Access Control |
| **Email Service** | SendGrid |
| **Validation** | class-validator, DTOs |
| **Development Tools** | Docker, Git, GitHub, VS Code |

</div>

---

## ≡اأ Installation

### Prerequisites

Before getting started, make sure you have:

- Node.js **18+**
- pnpm
- Docker & Docker Compose *(optional but recommended)*
- Git
- OpenAI API Key
- Google Gemini API Key
- SendGrid Account

---

### Clone the Repository

```bash
git clone https://github.com/BkHassan/ai-powered-cv-analysis-platform.git
cd ai-powered-cv-analysis-platform
```

---

### Install Dependencies

```bash
pnpm install
```

---

### Configure Environment Variables

Create the following files:

```
apps/backend/.env
apps/frontend/.env.local
```

Backend

```env
# AI Services
OPENAI_API_KEY=
GEMINI_API_KEY=

# Vector Database
CHROMADB_URL=http://chromadb:8000

# Authentication
JWT_SECRET=

# SendGrid
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=

# SMTP
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# Admin Account
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_FIRST_NAME=
ADMIN_LAST_NAME=

# Frontend URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Frontend

```env
NEXT_PUBLIC_API_URL=http://localhost:3003
```

---

### Run the Application

#### Option 1 ظ¤ Docker (Recommended)

```bash
pnpm run dev
```

---

#### Option 2 ظ¤ Development Mode

Backend

```bash
pnpm run backend:dev
```

Frontend

```bash
cd apps/frontend
pnpm run dev
```

---

### Access the Application

<div align="center"> 
  
| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3003 |

</div>

---

## ظû╢ي╕ Usage

After launching the application, the recruitment workflow is straightforward.

### 1ي╕ظâث Create an Account

- Register a new recruiter account
- Verify your email using the OTP code
- Sign in securely

---

### 2ي╕ظâث Upload a Resume

Upload a candidate's PDF resume.

The platform automatically:

- extracts the text
- splits it into semantic chunks
- generates vector embeddings
- indexes the content in ChromaDB

---

### 3ي╕ظâث Chat with the CV

Ask natural language questions such as:

- *What are the candidate's strongest skills?*
- *Does the candidate have React experience?*
- *Summarize this profile.*
- *What projects has the candidate worked on?*

The system retrieves the most relevant context before generating an AI response.

---

### 4ي╕ظâث Generate an AI Quiz

Generate interview questions directly from the uploaded CV.

The platform can:

- create multiple-choice questions
- send quizzes by email
- evaluate answers automatically
- calculate the candidate's score

---

### 5ي╕ظâث Manage Candidates

Administrators can:

- manage uploaded resumes
- monitor users
- review quiz attempts
- analyze recruitment data

---

## ≡اôة REST API

### ≡ا¤ Authentication
<div align="center"> 
  
| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | `/auth/signup` | Register a new account |
| POST | `/auth/login` | Authenticate a user |
| POST | `/auth/verify-otp` | Verify email address |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password |
| GET | `/auth/users` | Retrieve all users *(Admin)* |
| PATCH | `/auth/users/:id/role` | Update user role *(Admin)* |

</div>

---

### ≡اô CV Management

<div align="center"> 
  
| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | `/cv/upload` | Upload a resume |
| GET | `/cv/list` | Retrieve uploaded resumes |
| POST | `/cv/chat` | Chat with a specific CV |
| POST | `/cv/global-chat` | Chat across all uploaded CVs |
| DELETE | `/cv/:id` | Delete a resume |

</div>

---

### ≡اôإ Quiz

<div align="center"> 
  
| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | `/quiz/generate` | Generate an AI interview quiz |
| POST | `/quiz/send-email` | Send quiz to candidate |
| POST | `/quiz/submit` | Submit quiz answers |
| GET | `/quiz/results/:quizId` | Retrieve quiz results |
| GET | `/quiz/attempts/:quizId` | Retrieve quiz attempts |

</div>

---

### ≡ا¤ْ Authentication

Protected endpoints require a valid JWT access token.

```
Authorization: Bearer <access_token>
```
---

## ≡ا¤ Request Lifecycle

 
```text
Recruiter
     ظ¤é
     ظû╝
Next.js Frontend
     ظ¤é
     ظû╝
NestJS REST API
     ظ¤é
     ظû╝
Authentication
     ظ¤é
     ظû╝
CV Processing
     ظ¤é
     ظû╝
Vector Search (ChromaDB)
     ظ¤é
     ظû╝
OpenAI / Gemini
     ظ¤é
     ظû╝
AI Response
     ظ¤é
     ظû╝
Frontend UI
```

---

## ≡اôé Folder Structure

```text
ai-powered-cv-analysis-platform
ظ¤é
ظ¤£ظ¤ظ¤ apps
ظ¤é   ظ¤£ظ¤ظ¤ backend
ظ¤é   ظ¤é   ظ¤£ظ¤ظ¤ src
ظ¤é   ظ¤é   ظ¤é   ظ¤£ظ¤ظ¤ auth
ظ¤é   ظ¤é   ظ¤é   ظ¤£ظ¤ظ¤ cv
ظ¤é   ظ¤é   ظ¤é   ظ¤£ظ¤ظ¤ quiz
ظ¤é   ظ¤é   ظ¤é   ظ¤£ظ¤ظ¤ email
ظ¤é   ظ¤é   ظ¤é   ظ¤£ظ¤ظ¤ common
ظ¤é   ظ¤é   ظ¤é   ظ¤£ظ¤ظ¤ app.module.ts
ظ¤é   ظ¤é   ظ¤é   ظ¤¤ظ¤ظ¤ main.ts
ظ¤é   ظ¤é   ظ¤£ظ¤ظ¤ Dockerfile
ظ¤é   ظ¤é   ظ¤¤ظ¤ظ¤ package.json
ظ¤é   ظ¤é
ظ¤é   ظ¤¤ظ¤ظ¤ frontend
ظ¤é       ظ¤£ظ¤ظ¤ app
ظ¤é       ظ¤é   ظ¤£ظ¤ظ¤ admin
ظ¤é       ظ¤é   ظ¤£ظ¤ظ¤ quiz
ظ¤é       ظ¤é   ظ¤¤ظ¤ظ¤ auth
ظ¤é       ظ¤£ظ¤ظ¤ components
ظ¤é       ظ¤£ظ¤ظ¤ hooks
ظ¤é       ظ¤£ظ¤ظ¤ lib
ظ¤é       ظ¤¤ظ¤ظ¤ package.json
ظ¤é
ظ¤£ظ¤ظ¤ libs
ظ¤£ظ¤ظ¤ package.json
ظ¤£ظ¤ظ¤ pnpm-workspace.yaml
ظ¤¤ظ¤ظ¤ README.md
```

The project follows a **monorepo architecture**, separating the frontend and backend while sharing dependencies through a single workspace configuration.

---

### ≡اùي╕ Database Design

The platform stores structured and vectorized information inside **ChromaDB**.

```text
Users
ظ¤é
ظ¤£ظ¤ظ¤ id
ظ¤£ظ¤ظ¤ name
ظ¤£ظ¤ظ¤ email
ظ¤£ظ¤ظ¤ role
ظ¤¤ظ¤ظ¤ cv_ids

CVs
ظ¤é
ظ¤£ظ¤ظ¤ id
ظ¤£ظ¤ظ¤ filename
ظ¤£ظ¤ظ¤ uploadedBy
ظ¤£ظ¤ظ¤ uploadDate
ظ¤¤ظ¤ظ¤ metadata

CV Chunks
ظ¤é
ظ¤£ظ¤ظ¤ chunkId
ظ¤£ظ¤ظ¤ cvId
ظ¤£ظ¤ظ¤ text
ظ¤£ظ¤ظ¤ embedding
ظ¤¤ظ¤ظ¤ metadata

Chat History
ظ¤é
ظ¤£ظ¤ظ¤ id
ظ¤£ظ¤ظ¤ cvId
ظ¤£ظ¤ظ¤ question
ظ¤£ظ¤ظ¤ answer
ظ¤¤ظ¤ظ¤ timestamp

Quizzes
ظ¤é
ظ¤£ظ¤ظ¤ quizId
ظ¤£ظ¤ظ¤ cvId
ظ¤£ظ¤ظ¤ questions[]
ظ¤£ظ¤ظ¤ secureToken
ظ¤¤ظ¤ظ¤ createdAt

Quiz Attempts
ظ¤é
ظ¤£ظ¤ظ¤ attemptId
ظ¤£ظ¤ظ¤ quizId
ظ¤£ظ¤ظ¤ score
ظ¤£ظ¤ظ¤ timeTaken
ظ¤¤ظ¤ظ¤ completedAt
```

Each resume is transformed into multiple semantic chunks. Every chunk is embedded into a high-dimensional vector and indexed inside ChromaDB, enabling fast semantic retrieval for Retrieval-Augmented Generation (RAG).

---

## ≡ا¤ْ Security

The platform incorporates several security mechanisms to protect user accounts and sensitive recruitment data.

### Authentication

- JWT-based authentication
- Role-Based Access Control (RBAC)
- Protected API endpoints

### Password Security

- Password hashing with bcrypt
- Strong password policy
- Password reset workflow

### Email Verification

- One-Time Password (OTP) verification
- Email confirmation before account activation

### API Security

- DTO validation
- Request validation
- Secure file uploads
- Authentication guards

### AI & Data Security

- Private vector embeddings stored in ChromaDB
- Context-aware retrieval using Retrieval-Augmented Generation (RAG)
- API keys managed through environment variables

### Infrastructure

- Dockerized deployment
- Environment-based configuration
- Separation of frontend and backend services

---

## ≡ادب AI Models

<div align="center"> 
  
| Model | Purpose |
|--------|---------|
| **OpenAI GPT-4o-mini** | CV analysis, context-aware conversations, and interview quiz generation |
| **Google Gemini Embeddings** | Semantic embedding generation for Retrieval-Augmented Generation (RAG) |
| **LangChain** | Prompt orchestration, retrieval pipeline, and LLM integration |
| **ChromaDB** | Vector storage and semantic similarity search |

</div>

### AI Workflow

- ≡اô Extract text from uploaded PDF resumes
- ظ£éي╕ Split documents into semantic chunks
- ≡ادب Generate embeddings using Google Gemini
- ≡اùي╕ Store vectors inside ChromaDB
- ≡ا¤ Retrieve relevant context using semantic search
- ≡اْش Generate accurate responses with GPT-4o-mini
- ≡اôإ Create AI-powered technical interview quizzes

---

## ظأة Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Large PDF resumes cannot be efficiently processed by an LLM in a single prompt. | Implemented document chunking and Retrieval-Augmented Generation (RAG). |
| LLM responses need relevant context from each resume. | Integrated ChromaDB for semantic vector search. |
| OpenAI embedding costs and limitations. | Switched to Google Gemini Embeddings while keeping OpenAI for reasoning tasks. |
| Secure recruiter authentication. | Implemented JWT authentication with email OTP verification and role-based access control. |
| Automatic interview preparation. | Built an AI-powered quiz generator based on candidate resumes. |
| Managing both frontend and backend efficiently. | Adopted a pnpm monorepo architecture with shared dependency management. |
| Production deployment consistency. | Dockerized the backend using a multi-stage build. |

---

## ≡اأ Future Improvements

<div align="center"> 
  
| Status | Feature |
|--------|----------|
| ≡ا¤ | Job Description ظ¤ CV Matching |
| ≡ا¤ | AI Candidate Ranking |
| ≡ا¤ | OCR Support for Scanned Resumes |
| ≡ا¤ | Multilingual Resume Analysis |
| ≡ا¤ | Recruitment Analytics Dashboard |
| ≡ا¤ | Hybrid Search & Reranking |
| ≡ا¤ | Multi-LLM Support |
| ≡ا¤ | Cloud Deployment & CI/CD |

</div>

---

## ≡اّح Contributing

<div align="center"> 
  
<table>
<tr>
<td align="center">

<a href="https://github.com/BkHassan">
<img src="https://github.com/BkHassan.png" width="120px;" alt="Hassan Boukatena"/><br>

<b>Hassan Boukatena</b>

</a>

AI Engineer ظت Full-Stack Developer

</td>
</tr>
</table>

Special thanks to the open-source community and the creators of the technologies that made this project possible.

</div>

---

## ≡اô License

<div align="center"> 
  
This project is licensed under the **MIT License**.

Feel free to use, modify, and distribute this project in accordance with the terms of the license.

See the [LICENSE](LICENSE) file for more information.

</div>

----
## ظص Support

<div align="center"> 
  
If you found this project helpful, consider giving it a ظص on GitHub.

It helps others discover the project and motivates future improvements.

</div>
