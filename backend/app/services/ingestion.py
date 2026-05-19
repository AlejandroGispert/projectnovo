import uuid
from pathlib import Path

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import async_session_maker
from app.models.document import Document, DocumentStatus
from app.services.qdrant_service import delete_document_chunks, upsert_chunks


def extract_text(file_path: Path, content_type: str) -> str:
    suffix = file_path.suffix.lower()
    if suffix == ".pdf" or "pdf" in content_type:
        reader = PdfReader(str(file_path))
        parts = [page.extract_text() or "" for page in reader.pages]
        return "\n\n".join(parts).strip()
    return file_path.read_text(encoding="utf-8", errors="ignore").strip()


async def process_document(document_id: uuid.UUID) -> None:
    async with async_session_maker() as db:
        result = await db.execute(select(Document).where(Document.id == document_id))
        doc = result.scalar_one_or_none()
        if not doc:
            return
        doc.status = DocumentStatus.processing
        await db.commit()

        try:
            if not settings.openai_api_key:
                raise ValueError("OPENAI_API_KEY is not configured")

            text = extract_text(Path(doc.file_path), doc.content_type)
            if not text:
                raise ValueError("No text could be extracted from the document")

            splitter = RecursiveCharacterTextSplitter(
                chunk_size=settings.chunk_size,
                chunk_overlap=settings.chunk_overlap,
            )
            chunks = splitter.split_text(text)
            if not chunks:
                raise ValueError("Document produced no chunks after splitting")

            embeddings_model = OpenAIEmbeddings(
                model=settings.embedding_model,
                api_key=settings.openai_api_key,
            )
            vectors = embeddings_model.embed_documents(chunks)

            delete_document_chunks(doc.id)
            upsert_chunks(
                user_id=doc.user_id,
                document_id=doc.id,
                filename=doc.filename,
                texts=chunks,
                embeddings=vectors,
            )

            doc.status = DocumentStatus.ready
            doc.chunk_count = len(chunks)
            doc.error_message = None
        except Exception as exc:
            doc.status = DocumentStatus.failed
            doc.error_message = str(exc)[:2000]
        await db.commit()


async def run_ingestion_background(document_id: uuid.UUID) -> None:
    await process_document(document_id)
