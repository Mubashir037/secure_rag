"""
Wraps ChromaDB for storing and retrieving document chunk embeddings.
"""

import chromadb
from chromadb.utils import embedding_functions

client = chromadb.PersistentClient(path="./chroma_data")

# Lightweight ONNX-based embedder (no torch/CUDA) — fits free-tier memory limits
embedding_fn = embedding_functions.ONNXMiniLM_L6_V2()

collection = client.get_or_create_collection(
    name="documents",
    embedding_function=embedding_fn,
)


def add_chunks(doc_id: str, chunks: list[str]):
    ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
    metadatas = [{"doc_id": doc_id, "chunk_index": i} for i in range(len(chunks))]
    collection.add(documents=chunks, ids=ids, metadatas=metadatas)


def query(question: str, n_results: int = 5, doc_ids: list[str] = None):
    where = {"doc_id": {"$in": doc_ids}} if doc_ids else None
    results = collection.query(query_texts=[question], n_results=n_results, where=where)
    return {
        "documents": results["documents"][0],
        "distances": results["distances"][0],
        "metadatas": results["metadatas"][0],
    }


def delete_doc(doc_id: str):
    collection.delete(where={"doc_id": doc_id})


def clear_all():
    client.delete_collection("documents")
    global collection
    collection = client.get_or_create_collection(
        name="documents",
        embedding_function=embedding_fn,
    )