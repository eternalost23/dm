"""add product deleted flag

Revision ID: 7a91d4f0c3b6
Revises: 3f8d7a1c9b2e
Create Date: 2026-05-10 00:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7a91d4f0c3b6"
down_revision: Union[str, Sequence[str], None] = "3f8d7a1c9b2e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.alter_column("products", "is_deleted", server_default=None)


def downgrade() -> None:
    op.drop_column("products", "is_deleted")
