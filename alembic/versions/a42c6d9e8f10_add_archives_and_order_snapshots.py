"""add archives and order snapshots

Revision ID: a42c6d9e8f10
Revises: 7a91d4f0c3b6
Create Date: 2026-05-10 00:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a42c6d9e8f10"
down_revision: Union[str, Sequence[str], None] = "7a91d4f0c3b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "categories",
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.alter_column("categories", "is_archived", server_default=None)

    op.add_column("orders", sa.Column("product_title_snapshot", sa.String(length=255), nullable=True))
    op.add_column("orders", sa.Column("product_image_url_snapshot", sa.String(length=500), nullable=True))
    op.add_column("orders", sa.Column("seller_username_snapshot", sa.String(length=100), nullable=True))

    op.execute(
        """
        UPDATE orders
        SET product_title_snapshot = products.title,
            product_image_url_snapshot = products.image_url,
            seller_username_snapshot = users.username
        FROM products
        JOIN users ON users.id = products.seller_id
        WHERE orders.product_id = products.id
        """
    )


def downgrade() -> None:
    op.drop_column("orders", "seller_username_snapshot")
    op.drop_column("orders", "product_image_url_snapshot")
    op.drop_column("orders", "product_title_snapshot")
    op.drop_column("categories", "is_archived")
