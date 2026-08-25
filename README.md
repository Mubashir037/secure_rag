# SecureRAG

A RAG (Retrieval-Augmented Generation) document Q&A system that goes beyond
basic RAG by scoring retrieval consistency and flagging outlier sources —
a lightweight defense against irrelevant or poisoned content being blindly
trusted by the model.

**Live demo:** https://secure-rag-lilac.vercel.app

## Problem
Standard RAG systems retrieve top-k chunks and trust all of them equally.
If an irrelevant, low-quality, or maliciously injected ("poisoned") chunk
ends up in the retrieved set, the LLM uses it anyway — producing wrong or
manipulated answers with no warning.

## What this does differently
- **Trust scoring** — retrieved chunks are checked for consistency;
  chunks whose relevance score is a statistical outlier are flagged
  instead of silently trusted.
- **Grounded refusal** — the model only answers from verified context and
  says "I don't know" rather than guessing.
- **Session-scoped retrieval** — only documents uploaded in the current
  session are searchable, preventing cross-session data leakage.
- **Conversation memory** — follow-up questions ("what's in the doc?")
  resolve correctly using recent chat context.

## Stack
- **Backend**: FastAPI, ChromaDB (vector store, ONNX MiniLM embeddings),
  Groq LLM API
- **Frontend**: React (Vite), deployed on Vercel
- **Backend hosting**: Render

## Architecture
```
Upload PDF/TXT → chunk → embed → store in ChromaDB
Question → retrieve top-k chunks → trust score (outlier check)
        → LLM answers using only retrieved context → response + trust score
```

## Project structure
```
backend/    FastAPI app, vector store, LLM client, trust scoring
frontend/   React chat + upload interface
```

## Run locally

**Backend**
```bash
cd backend
pip install -r requirements.txt
export GROQ_API_KEY=your_key_here
uvicorn main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## Skills demonstrated
RAG pipelines, vector databases, LLM API integration, retrieval security,
prompt engineering, FastAPI, React, full-stack deployment (Render + Vercel).
