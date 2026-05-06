from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DigitalItemCreate(BaseModel):
    content: str = Field(min_length=1)


class DigitalItemRead(BaseModel):
    id: int
    product_id: int
    content: str
    is_sold: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)