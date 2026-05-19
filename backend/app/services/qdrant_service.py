import uuid

from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

from app.core.config import settings

_client: QdrantClient | None = None


def get_qdrant_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(url=settings.qdrant_url)
    return _client


def ensure_collection() -> None:
    client = get_qdrant_client()
    collections = [c.name for c in client.get_collections().collections]
    if settings.qdrant_collection not in collections:
        client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config=qmodels.VectorParams(
                size=settings.embedding_dimensions,
                distance=qmodels.Distance.COSINE,
            ),
        )


def user_filter(user_id: uuid.UUID, document_ids: list[uuid.UUID] | None = None) -> qmodels.Filter:
    must: list[qmodels.FieldCondition] = [
        qmodels.FieldCondition(
            key="user_id",
            match=qmodels.MatchValue(value=str(user_id)),
        )
    ]
    if document_ids:
        must.append(
            qmodels.FieldCondition(
                key="document_id",
                match=qmodels.MatchAny(any=[str(d) for d in document_ids]),
            )
        )
    return qmodels.Filter(must=must)


def chunk_point_id(document_id: uuid.UUID, chunk_index: int) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{document_id}:{chunk_index}"))


def upsert_chunks(
    *,
    user_id: uuid.UUID,
    document_id: uuid.UUID,
    filename: str,
    texts: list[str],
    embeddings: list[list[float]],
) -> None:
    client = get_qdrant_client()
    points = []
    for idx, (text, vector) in enumerate(zip(texts, embeddings, strict=True)):
        points.append(
            qmodels.PointStruct(
                id=chunk_point_id(document_id, idx),
                vector=vector,
                payload={
                    "user_id": str(user_id),
                    "document_id": str(document_id),
                    "chunk_index": idx,
                    "text": text,
                    "filename": filename,
                },
            )
        )
    if points:
        client.upsert(collection_name=settings.qdrant_collection, points=points)


def delete_document_chunks(document_id: uuid.UUID) -> None:
    client = get_qdrant_client()
    client.delete(
        collection_name=settings.qdrant_collection,
        points_selector=qmodels.FilterSelector(
            filter=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="document_id",
                        match=qmodels.MatchValue(value=str(document_id)),
                    )
                ]
            )
        ),
    )
