from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

from app.core.config import settings


def require_google_api_key() -> None:
    if not settings.google_api_key:
        raise ValueError("GOOGLE_API_KEY is not configured")


def get_embeddings() -> GoogleGenerativeAIEmbeddings:
    require_google_api_key()
    return GoogleGenerativeAIEmbeddings(
        model=settings.embedding_model,
        google_api_key=settings.google_api_key,
    )


def get_chat_model() -> ChatGoogleGenerativeAI:
    require_google_api_key()
    return ChatGoogleGenerativeAI(
        model=settings.chat_model,
        google_api_key=settings.google_api_key,
        temperature=0,
    )
