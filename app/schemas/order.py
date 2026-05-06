from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.product import ProductRead


class OrderCreate(BaseModel):
    product_id: int


class OrderRead(BaseModel):
    id: int
    buyer_id: int
    product_id: int
    digital_item_id: int | None
    status: str
    total_price: Decimal
    created_at: datetime
    product: ProductRead | None = None

    model_config = ConfigDict(from_attributes=True)


class OrderDetailRead(OrderRead):
    digital_item_content: str | None = None

class SellerOrderRead(OrderRead):
    buyer_email: str
    product_title: str
