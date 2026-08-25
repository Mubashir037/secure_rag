"""
TrustRAG backend — Step 1: upload endpoint.
Run with: uvicorn main:app --reload
"""

import uuid
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from document_utils import extract_text, chunk_text
from vector_store import add_chunks, query, clear_all
from llm_client import answer_question
from trust_score import score_trust
from pydantic import BaseModel

app = FastAPI(title="TrustRAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this before real deployment
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health():
    return {"status": "ok", "service": "TrustRAG"}


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    file_bytes = await file.read()
    text = extract_text(file.filename, file_bytes)

    if not text.strip():
        return {"error": "Could not extract any text from this file."}

    chunks = chunk_text(text)
    doc_id = str(uuid.uuid4())
    add_chunks(doc_id, chunks)

    return {
        "doc_id": doc_id,
        "filename": file.filename,
        "chunks_created": len(chunks),
    }


@app.post("/clear")
async def clear():
    clear_all()
    return {"status": "cleared"}


class AskRequest(BaseModel):
    question: str
    doc_ids: list[str] | None = None
    history: list[dict] | None = None


@app.post("/ask")
async def ask(req: AskRequest):
    results = query(req.question, n_results=5, doc_ids=req.doc_ids)
    chunks = results["documents"]

    if not chunks:
        return {"answer": "No documents uploaded yet.", "sources": []}

    answer = answer_question(req.question, chunks, history=req.history)
    trust = score_trust(results["distances"])

    return {
        "answer": answer,
        "sources": chunks,
        "distances": results["distances"],
        "trust_score": trust["trust_score"],
        "flagged_chunk_indices": trust["flagged_indices"],
    }