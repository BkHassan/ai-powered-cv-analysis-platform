<div align="center">

# 🤖 AI-Powered CV Analysis Platform

### Intelligent Resume Analysis • RAG Chat • AI Quiz Generation • Semantic Search

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
## 📑 Table of Contents

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
## 📖 Overview

The **AI-Powered CV Analysis Platform** is an intelligent recruitment platform designed to streamline the candidate screening process using Artificial Intelligence.

The platform enables recruiters to upload resumes, analyze candidate profiles, interact with CVs through Retrieval-Augmented Generation (RAG), generate AI-powered technical quizzes, and manage the recruitment workflow from a centralized dashboard.

By combining semantic search, Large Language Models, and modern web technologies, the platform transforms traditional CV management into a faster, more interactive, and data-driven recruitment experience.
---
## ❗ Problem Statement

Recruitment teams often receive hundreds of resumes for a single job opening. Reviewing each CV manually is time-consuming, repetitive, and makes it difficult to consistently identify the most relevant candidates.

Traditional recruitment workflows also lack intelligent interaction with candidate information, requiring recruiters to spend valuable time searching through resumes, preparing interview questions, and evaluating applicants manually.

These challenges slow down the hiring process and reduce overall recruitment efficiency.
---
## 💡 Solution

This platform leverages Artificial Intelligence and Retrieval-Augmented Generation (RAG) to automate and enhance key stages of the recruitment process.

The system allows recruiters to upload resumes, extract and index their content into a vector database, ask natural language questions about candidates, automatically generate technical quizzes based on each CV, and manage candidates through a secure web interface.

By integrating semantic search, AI-powered reasoning, and modern backend architecture, the platform provides recruiters with faster access to relevant information while reducing manual effort throughout the hiring workflow.
----
## ✨ Key Capabilities

- 📄 Upload and analyze PDF resumes
- 🤖 Chat with CVs using Retrieval-Augmented Generation (RAG)
- 🧠 Generate AI-powered technical quizzes
- 📊 Manage candidates through an admin dashboard
- 🔐 Secure authentication with JWT and role-based access control
- 📧 Email verification and quiz sharing
- ⚡ Fast semantic search using vector embeddings
 ---
## 🏗️ System Architecture

The platform follows a modular **monorepo architecture**, separating the frontend and backend while integrating AI services, vector search, and authentication into a scalable recruitment platform.

```text
                               ┌─────────────────────────┐
                               │        Recruiter        │
                               └────────────┬────────────┘
                                            │
                                            ▼
                             ┌────────────────────────────┐
                             │     Next.js Frontend       │
                             │  React • Tailwind CSS      │
                             └────────────┬───────────────┘
                                          │ REST API
                                          ▼
                        ┌────────────────────────────────────┐
                        │        NestJS Backend API          │
                        └───────┬──────────┬─────────────────┘
                                │          │
                 ┌──────────────┘          └──────────────┐
                 ▼                                        ▼
         Authentication                          AI Services
       JWT • OTP • Roles                    CV & Quiz Modules
                 │                                        │
                 │                                        ▼
                 │                          OpenAI GPT-4o-mini
                 │                          Google Gemini Embeddings
                 │
                 ▼
         ┌──────────────────┐
         │    ChromaDB      │
         │  Vector Database │
         └──────────────────┘
```

The application is organized into independent backend modules responsible for authentication, CV management, AI-powered chat, and quiz generation. Candidate resumes are transformed into vector embeddings and stored in ChromaDB, enabling semantic search and Retrieval-Augmented Generation (RAG) for accurate AI responses.
---
## 🤖 AI Pipeline

The platform follows a Retrieval-Augmented Generation (RAG) pipeline to analyze resumes and provide context-aware responses.

```text
          PDF Resume
               │
               ▼
      Text Extraction
               │
               ▼
      Text Chunking
               │
               ▼
   Gemini Embedding Model
               │
               ▼
  Store Embeddings in ChromaDB
               │
               ▼
     Semantic Similarity Search
               │
               ▼
     Relevant Context Retrieval
               │
               ▼
        Prompt Construction
               │
               ▼
        OpenAI GPT-4o-mini
               │
        ┌──────┴────────┐
        ▼               ▼
  Chat Response    Quiz Generation
```

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
## 🛠️ Technology Stack

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
---
