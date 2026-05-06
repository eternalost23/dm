"""add sales count, category media, and chats

Revision ID: 9c2e124f0e5f
Revises: 66dacbad7cef
Create Date: 2026-05-06 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9c2e124f0e5f"
down_revision: Union[str, Sequence[str], None] = "66dacbad7cef"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("categories", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("categories", sa.Column("image_url", sa.String(length=500), nullable=True))

    op.add_column(
        "products",
        sa.Column("purchases_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.execute(
        """
        UPDATE products
        SET purchases_count = COALESCE((
            SELECT COUNT(*)
            FROM orders
            WHERE orders.product_id = products.id
              AND orders.status = 'paid'
        ), 0)
        """
    )
    op.alter_column("products", "purchases_count", server_default=None)

    op.create_table(
        "chat_threads",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("buyer_id", sa.Integer(), nullable=False),
        sa.Column("seller_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["buyer_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "buyer_id",
            "seller_id",
            "product_id",
            name="uq_chat_thread_participants_product",
        ),
    )
    op.create_index(op.f("ix_chat_threads_buyer_id"), "chat_threads", ["buyer_id"], unique=False)
    op.create_index(op.f("ix_chat_threads_product_id"), "chat_threads", ["product_id"], unique=False)
    op.create_index(op.f("ix_chat_threads_seller_id"), "chat_threads", ["seller_id"], unique=False)

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("thread_id", sa.Integer(), nullable=False),
        sa.Column("sender_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["thread_id"], ["chat_threads.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_chat_messages_sender_id"), "chat_messages", ["sender_id"], unique=False)
    op.create_index(op.f("ix_chat_messages_thread_id"), "chat_messages", ["thread_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_chat_messages_thread_id"), table_name="chat_messages")
    op.drop_index(op.f("ix_chat_messages_sender_id"), table_name="chat_messages")
    op.drop_table("chat_messages")
    op.drop_index(op.f("ix_chat_threads_seller_id"), table_name="chat_threads")
    op.drop_index(op.f("ix_chat_threads_product_id"), table_name="chat_threads")
    op.drop_index(op.f("ix_chat_threads_buyer_id"), table_name="chat_threads")
    op.drop_table("chat_threads")
    op.drop_column("products", "purchases_count")
    op.drop_column("categories", "image_url")
    op.drop_column("categories", "description")
