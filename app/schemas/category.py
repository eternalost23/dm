from pydantic import BaseModel, ConfigDict


class CategoryBase(BaseModel):
    name: str
    slug: str
    parent_id: int | None = None
    description: str | None = None
    image_url: str | None = None
    is_archived: bool = False


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    parent_id: int | None = None
    description: str | None = None
    image_url: str | None = None
    is_archived: bool | None = None


class CategoryRead(CategoryBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class PopularCategoryRead(CategoryRead):
    root_id: int
    root_name: str
    sales_count: int
    products_count: int
