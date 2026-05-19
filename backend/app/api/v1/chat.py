import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.conversation import Conversation
from app.models.message import Message, MessageRole
from app.models.user import User
from app.schemas.chat import (
    ChatReplyResponse,
    ConversationCreate,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
)
from app.services.rag import answer_question

router = APIRouter(prefix="/chat", tags=["chat"])


def _message_response(msg: Message) -> MessageResponse:
    return MessageResponse(
        id=str(msg.id),
        role=msg.role,
        content=msg.content,
        sources=msg.sources,
        created_at=msg.created_at,
    )


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    body: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationResponse:
    conv = Conversation(
        user_id=current_user.id,
        title=body.title or "New conversation",
    )
    db.add(conv)
    await db.flush()
    return ConversationResponse(
        id=str(conv.id),
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    )


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ConversationResponse]:
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .options(selectinload(Conversation.messages))
        .order_by(Conversation.updated_at.desc())
    )
    items = []
    for conv in result.scalars().all():
        preview = None
        if conv.messages:
            preview = conv.messages[-1].content[:120]
        items.append(
            ConversationResponse(
                id=str(conv.id),
                title=conv.title,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                last_message_preview=preview,
            )
        )
    return items


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MessageResponse]:
    conv = await _get_conversation(db, conversation_id, current_user.id)
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conv.id)
        .order_by(Message.created_at.asc())
    )
    return [_message_response(m) for m in result.scalars().all()]


@router.post("/conversations/{conversation_id}/messages", response_model=ChatReplyResponse)
async def send_message(
    conversation_id: uuid.UUID,
    body: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChatReplyResponse:
    conv = await _get_conversation(db, conversation_id, current_user.id)

    doc_ids: list[uuid.UUID] | None = None
    if body.document_ids:
        doc_ids = []
        for raw in body.document_ids:
            try:
                doc_ids.append(uuid.UUID(raw))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid document_ids")

    user_msg = Message(
        conversation_id=conv.id,
        role=MessageRole.user,
        content=body.content,
    )
    db.add(user_msg)
    await db.flush()

    try:
        answer, sources = await answer_question(body.content, current_user.id, doc_ids)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"RAG failed: {exc}") from exc

    assistant_msg = Message(
        conversation_id=conv.id,
        role=MessageRole.assistant,
        content=answer,
        sources=sources,
    )
    db.add(assistant_msg)

    if conv.title == "New conversation":
        conv.title = body.content[:80] + ("..." if len(body.content) > 80 else "")
    conv.updated_at = datetime.now(UTC)
    await db.flush()

    return ChatReplyResponse(
        user_message=_message_response(user_msg),
        assistant_message=_message_response(assistant_msg),
    )


async def _get_conversation(
    db: AsyncSession, conversation_id: uuid.UUID, user_id: uuid.UUID
) -> Conversation:
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv
