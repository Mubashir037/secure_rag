"""
Calls Groq LLM to answer a question using retrieved document chunks as context.
"""

import os
from groq import Groq

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))


def answer_question(question: str, context_chunks: list[str], history: list[dict] = None) -> str:
    context = "\n\n---\n\n".join(context_chunks)

    history_text = ""
    if history:
        recent = history[-4:]  # last 2 exchanges
        history_text = "\n".join(
            f"{'User' if h['role'] == 'user' else 'Assistant'}: {h['text']}"
            for h in recent
        )
        history_text = f"Recent conversation:\n{history_text}\n\n"

    prompt = (
        "Answer the question using ONLY the context below. Use the recent "
        "conversation to understand what the user is referring to (e.g. "
        "'it', 'the doc', 'that'), but only answer using facts in the "
        "context. If the answer isn't in the context, say you don't know.\n\n"
        f"{history_text}"
        f"Context:\n{context}\n\n"
        f"Question: {question}\n\nAnswer:"
    )
    resp = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.choices[0].message.content