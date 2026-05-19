from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.message import MessageRole


class ConversationCreate(BaseModel):
    title: str | None = None


class ConversationResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    last_message_preview: str | None = None

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    id: str
    role: MessageRole
    content: str
    sources: list[dict[str, Any]] | None
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=16000)
    document_ids: list[str] | None = None


class ChatReplyResponse(BaseModel):
    user_message: MessageResponse
    assistant_message: MessageResponse
