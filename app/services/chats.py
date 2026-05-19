from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models import Category, ChatMessage, ChatThread, Product, User
from app.models.user import UserRole
from app.schemas.chat import ChatMessageCreate, ChatThreadRead


def thread_to_read(thread: ChatThread) -> ChatThreadRead:
    last_message = thread.messages[-1] if thread.messages else None

    return ChatThreadRead(
        id=thread.id,
        buyer_id=thread.buyer_id,
        seller_id=thread.seller_id,
        product_id=thread.product_id,
        product_image_url=thread.product.image_url,
        created_at=thread.created_at,
        updated_at=thread.updated_at,
        product_title=thread.product.title,
        buyer_username=thread.buyer.username,
        seller_username=thread.seller.username,
        last_message=last_message,
    )


def list_user_threads(db: Session, current_user: User) -> list[ChatThread]:
    return (
        db.query(ChatThread)
        .options(
            joinedload(ChatThread.product),
            joinedload(ChatThread.buyer),
            joinedload(ChatThread.seller),
            joinedload(ChatThread.messages),
        )
        .filter(
            (ChatThread.buyer_id == current_user.id)
            | (ChatThread.seller_id == current_user.id)
        )
        .filter(ChatThread.messages.any())
        .order_by(ChatThread.updated_at.desc())
        .all()
    )


def list_all_threads(db: Session) -> list[ChatThread]:
    return (
        db.query(ChatThread)
        .options(
            joinedload(ChatThread.product),
            joinedload(ChatThread.buyer),
            joinedload(ChatThread.seller),
            joinedload(ChatThread.messages),
        )
        .filter(ChatThread.messages.any())
        .order_by(ChatThread.updated_at.desc())
        .all()
    )


def get_or_create_support_thread(db: Session, current_user: User) -> ChatThread:
    admin = (
        db.query(User)
        .filter(User.role == UserRole.ADMIN.value)
        .filter(User.is_active == True)
        .order_by(User.id.asc())
        .first()
    )

    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Support administrator not found",
        )

    if current_user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin cannot open support chat with themselves",
        )

    category = db.query(Category).filter(Category.slug == "support").first()
    if category is None:
        category = Category(
            name="Поддержка",
            slug="support",
            description="Служебная категория для обращений в поддержку",
            is_archived=True,
        )
        db.add(category)
        db.commit()
        db.refresh(category)

    product = (
        db.query(Product)
        .filter(Product.seller_id == admin.id)
        .filter(Product.title == "Поддержка")
        .first()
    )
    if product is None:
        product = Product(
            seller_id=admin.id,
            category_id=category.id,
            title="Поддержка",
            description="Чат с поддержкой ЦифроГрад",
            price=Decimal("0.01"),
            is_active=False,
        )
        db.add(product)
        db.commit()
        db.refresh(product)

    thread = (
        db.query(ChatThread)
        .filter(ChatThread.product_id == product.id)
        .filter(ChatThread.buyer_id == current_user.id)
        .filter(ChatThread.seller_id == admin.id)
        .first()
    )
    if thread is None:
        thread = ChatThread(
            buyer_id=current_user.id,
            seller_id=admin.id,
            product_id=product.id,
        )
        db.add(thread)
        db.commit()
        thread = get_thread_for_user_or_404(db, thread.id, current_user)
        create_message(
            db,
            thread=thread,
            sender=current_user,
            message_data=ChatMessageCreate(body="Здравствуйте, нужна помощь."),
        )

    return get_thread_for_user_or_404(db, thread.id, current_user)


def get_thread_for_user_or_404(
    db: Session,
    thread_id: int,
    current_user: User,
    *,
    allow_admin: bool = False,
) -> ChatThread:
    query = (
        db.query(ChatThread)
        .options(
            joinedload(ChatThread.product),
            joinedload(ChatThread.buyer),
            joinedload(ChatThread.seller),
            joinedload(ChatThread.messages),
        )
        .filter(ChatThread.id == thread_id)
    )

    thread = query.first()

    if thread is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat thread not found",
        )

    is_participant = current_user.id in {thread.buyer_id, thread.seller_id}
    if not is_participant and not allow_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chat access denied",
        )

    return thread


def get_or_create_product_thread(
    db: Session,
    *,
    product_id: int,
    buyer: User,
) -> ChatThread:
    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .filter(Product.is_active == True)
        .first()
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    if product.seller_id == buyer.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot open a chat with yourself",
        )

    thread = (
        db.query(ChatThread)
        .filter(ChatThread.product_id == product.id)
        .filter(ChatThread.buyer_id == buyer.id)
        .filter(ChatThread.seller_id == product.seller_id)
        .first()
    )

    if thread is None:
        thread = ChatThread(
            buyer_id=buyer.id,
            seller_id=product.seller_id,
            product_id=product.id,
        )
        db.add(thread)
        db.commit()

    return get_thread_for_user_or_404(db, thread.id, buyer)


def get_product_thread_or_none(
    db: Session,
    *,
    product_id: int,
    user: User,
) -> ChatThread | None:
    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .filter(Product.is_active == True)
        .first()
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    return (
        db.query(ChatThread)
        .options(
            joinedload(ChatThread.product),
            joinedload(ChatThread.buyer),
            joinedload(ChatThread.seller),
            joinedload(ChatThread.messages),
        )
        .filter(ChatThread.product_id == product.id)
        .filter(
            (ChatThread.buyer_id == user.id)
            | (ChatThread.seller_id == user.id)
        )
        .first()
    )


def create_message(
    db: Session,
    *,
    thread: ChatThread,
    sender: User,
    message_data: ChatMessageCreate,
) -> ChatMessage:
    if sender.id not in {thread.buyer_id, thread.seller_id}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only chat participants can send messages",
        )

    body = (message_data.body or "").strip()
    if not body and not message_data.media_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message text or attachment is required",
        )

    now = datetime.utcnow()
    message = ChatMessage(
        thread_id=thread.id,
        sender_id=sender.id,
        body=body,
        media_url=message_data.media_url,
        media_type=message_data.media_type,
        media_name=message_data.media_name,
        created_at=now,
    )
    thread.updated_at = now
    db.add(message)
    db.commit()
    db.refresh(message)

    return message


def mark_thread_messages_read(
    db: Session,
    *,
    thread: ChatThread,
    reader: User,
) -> None:
    updated = False

    for message in thread.messages:
        if message.sender_id != reader.id and not message.is_read:
            message.is_read = True
            updated = True

    if updated:
        db.commit()
        db.refresh(thread)
