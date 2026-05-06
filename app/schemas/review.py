from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserRead


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = None


class ReviewRead(BaseModel):
    id: int
    product_id: int
    buyer_id: int
    rating: int
    comment: str | None
    created_at: datetime
    buyer: UserRead | None = None

    model_config = ConfigDict(from_attributes=True)
