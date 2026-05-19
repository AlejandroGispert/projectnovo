import uuid
from typing import Any

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from qdrant_client import QdrantClient
from langchain_qdrant import QdrantVectorStore

from app.core.config import settings
from app.services.qdrant_service import get_qdrant_client, user_filter


SYSTEM_PROMPT = """You are a helpful assistant that answers questions using only the provided context.
If the answer is not in the context, say you don't know based on the uploaded documents.
Cite source filenames when relevant. Be concise and accurate.

Context:
{context}
"""


def _format_docs(docs: list) -> str:
    parts = []
    for doc in docs:
        meta = doc.metadata
        filename = meta.get("filename", "unknown")
        parts.append(f"[{filename}]\n{doc.page_content}")
    return "\n\n---\n\n".join(parts)


def build_retriever(user_id: uuid.UUID, document_ids: list[uuid.UUID] | None = None):
    client: QdrantClient = get_qdrant_client()
    embeddings = OpenAIEmbeddings(model=settings.embedding_model, api_key=settings.openai_api_key)
    vector_store = QdrantVectorStore(
        client=client,
        collection_name=settings.qdrant_collection,
        embedding=embeddings,
    )
    q_filter = user_filter(user_id, document_ids)
    return vector_store.as_retriever(
        search_kwargs={"k": settings.retrieval_k, "filter": q_filter},
    )


async def answer_question(
    question: str,
    user_id: uuid.UUID,
    document_ids: list[uuid.UUID] | None = None,
) -> tuple[str, list[dict[str, Any]]]:
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not configured")

    retriever = build_retriever(user_id, document_ids)
    docs = retriever.invoke(question)

    sources: list[dict[str, Any]] = []
    for doc in docs:
        meta = doc.metadata
        sources.append(
            {
                "document_id": meta.get("document_id"),
                "filename": meta.get("filename"),
                "chunk_index": meta.get("chunk_index"),
                "text_preview": (doc.page_content or "")[:300],
            }
        )

    context = _format_docs(docs)
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", SYSTEM_PROMPT),
            ("human", "{question}"),
        ]
    )
    llm = ChatOpenAI(model=settings.chat_model, temperature=0, api_key=settings.openai_api_key)

    chain = (
        {"context": lambda _: context, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    answer = chain.invoke(question)
    return answer, sources
