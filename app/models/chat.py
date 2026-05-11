from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ChatThread(Base):
    __tablename__ = "chat_threads"
    __table_args__ = (
        UniqueConstraint(
            "buyer_id",
            "seller_id",
            "product_id",
            name="uq_chat_thread_participants_product",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    buyer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    seller_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id"),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    buyer = relationship(
        "User",
        foreign_keys=[buyer_id],
        back_populates="buyer_chat_threads",
    )

    seller = relationship(
        "User",
        foreign_keys=[seller_id],
        back_populates="seller_chat_threads",
    )

    product = relationship(
        "Product",
        back_populates="chat_threads",
    )

    messages = relationship(
        "ChatMessage",
        back_populates="thread",
        cascade="all, delete-orphan",
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)

    thread_id: Mapped[int] = mapped_column(
        ForeignKey("chat_threads.id"),
        nullable=False,
        index=True,
    )

    sender_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    body: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    media_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    media_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    media_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    thread = relationship(
        "ChatThread",
        back_populates="messages",
    )

    sender = relationship(
        "User",
        back_populates="chat_messages",
    )
