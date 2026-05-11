from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_admin, get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.chat import (
    ChatMessageCreate,
    ChatMessageRead,
    ChatStart,
    ChatThreadRead,
)
from app.services import chats

router = APIRouter(
    prefix="/chats",
    tags=["Chats"],
)


@router.get("", response_model=list[ChatThreadRead])
def list_my_chats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [chats.thread_to_read(thread) for thread in chats.list_user_threads(db, current_user)]


@router.post("", response_model=ChatThreadRead, status_code=status.HTTP_201_CREATED)
def start_chat(
    chat_data: ChatStart,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing_thread = chats.get_product_thread_or_none(
        db,
        product_id=chat_data.product_id,
        user=current_user,
    )

    if existing_thread is not None and not chat_data.message and not chat_data.media_url:
        return chats.thread_to_read(existing_thread)

    if existing_thread is None and not chat_data.message and not chat_data.media_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message is required to start a new chat",
        )

    thread = chats.get_or_create_product_thread(
        db,
        product_id=chat_data.product_id,
        buyer=current_user,
    )

    if chat_data.message or chat_data.media_url:
        chats.create_message(
            db,
            thread=thread,
            sender=current_user,
            message_data=ChatMessageCreate(
                body=chat_data.message,
                media_url=chat_data.media_url,
                media_type=chat_data.media_type,
                media_name=chat_data.media_name,
            ),
        )
        thread = chats.get_thread_for_user_or_404(db, thread.id, current_user)

    return chats.thread_to_read(thread)


@router.get("/product/{product_id}", response_model=ChatThreadRead)
def get_product_chat(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    thread = chats.get_product_thread_or_none(
        db,
        product_id=product_id,
        user=current_user,
    )

    if thread is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat thread not found",
        )

    return chats.thread_to_read(thread)


@router.post("/support", response_model=ChatThreadRead, status_code=status.HTTP_201_CREATED)
def open_support_chat(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return chats.thread_to_read(chats.get_or_create_support_thread(db, current_user))


@router.get("/{thread_id}/messages", response_model=list[ChatMessageRead])
def list_messages(
    thread_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    thread = chats.get_thread_for_user_or_404(db, thread_id, current_user)
    chats.mark_thread_messages_read(db, thread=thread, reader=current_user)
    return thread.messages


@router.post(
    "/{thread_id}/messages",
    response_model=ChatMessageRead,
    status_code=status.HTTP_201_CREATED,
)
def send_message(
    thread_id: int,
    message_data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    thread = chats.get_thread_for_user_or_404(db, thread_id, current_user)
    return chats.create_message(
        db,
        thread=thread,
        sender=current_user,
        message_data=message_data,
    )


@router.get("/admin/all", response_model=list[ChatThreadRead])
def list_all_chats(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return [chats.thread_to_read(thread) for thread in chats.list_all_threads(db)]
