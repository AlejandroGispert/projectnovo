from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    google_api_key: str = ""
    database_url: str = "postgresql+asyncpg://rag:rag@localhost:5432/rag"
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "document_chunks_gemini_v2"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    upload_dir: str = "/data/uploads"
    max_upload_mb: int = 25
    cors_origins: str = "http://localhost:3000"

    embedding_model: str = "models/gemini-embedding-001"
    embedding_dimensions: int = 3072
    chat_model: str = "gemini-2.5-flash-lite"
    chunk_size: int = 1000
    chunk_overlap: int = 200
    retrieval_k: int = 5

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


settings = Settings()
