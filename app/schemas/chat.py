from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ChatStart(BaseModel):
    product_id: int
    message: str | None = Field(default=None, min_length=1, max_length=5000)


class ChatMessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


class ChatMessageRead(BaseModel):
    id: int
    thread_id: int
    sender_id: int
    body: str
    created_at: datetime
    is_read: bool

    model_config = ConfigDict(from_attributes=True)


class ChatThreadRead(BaseModel):
    id: int
    buyer_id: int
    seller_id: int
    product_id: int
    product_image_url: str | None = None
    created_at: datetime
    updated_at: datetime
    product_title: str
    buyer_username: str
    seller_username: str
    last_message: ChatMessageRead | None = None

    model_config = ConfigDict(from_attributes=True)
