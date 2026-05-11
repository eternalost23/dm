"""add chat message attachments

Revision ID: 3f8d7a1c9b2e
Revises: 9c2e124f0e5f
Create Date: 2026-05-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "3f8d7a1c9b2e"
down_revision: Union[str, Sequence[str], None] = "9c2e124f0e5f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("chat_messages", sa.Column("media_url", sa.String(length=500), nullable=True))
    op.add_column("chat_messages", sa.Column("media_type", sa.String(length=100), nullable=True))
    op.add_column("chat_messages", sa.Column("media_name", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("chat_messages", "media_name")
    op.drop_column("chat_messages", "media_type")
    op.drop_column("chat_messages", "media_url")
