from datetime import datetime

from pydantic import BaseModel

from app.models.document import DocumentStatus


class DocumentResponse(BaseModel):
    id: str
    filename: str
    content_type: str
    status: DocumentStatus
    chunk_count: int
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
