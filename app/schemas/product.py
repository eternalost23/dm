from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.category import CategoryRead


class ProductCategoryPathItem(BaseModel):
    id: int
    name: str
    slug: str


class ProductBase(BaseModel):
    seller_id: int
    category_id: int
    title: str
    description: str | None = None
    price: Decimal
    image_url: str | None = None
    purchases_count: int = 0
    is_active: bool = True


class ProductCreate(BaseModel):
    category_id: int
    title: str = Field(min_length=3, max_length=255)
    description: str | None = None
    price: Decimal = Field(gt=0)
    image_url: str | None = None

class ProductUpdate(BaseModel):
    category_id: int | None = None
    title: str | None = Field(default=None, min_length=3, max_length=255)
    description: str | None = None
    price: Decimal | None = Field(default=None, gt=0)
    image_url: str | None = None
    is_active: bool | None = None


class ProductRead(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime
    category_path: list[ProductCategoryPathItem] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ProductDetailRead(ProductRead):
    category: CategoryRead
