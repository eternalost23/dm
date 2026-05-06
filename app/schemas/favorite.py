from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.product import ProductRead


class FavoriteRead(BaseModel):
    id: int
    user_id: int
    product_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FavoriteDetailRead(FavoriteRead):
    product: ProductRead