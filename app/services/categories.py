from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Category, Product
from app.schemas.category import CategoryCreate, CategoryUpdate


def list_categories(db: Session, *, include_archived: bool = False) -> list[Category]:
    query = db.query(Category)
    if not include_archived:
        query = query.filter(Category.is_archived == False)

    return query.order_by(Category.id).all()


def get_descendant_category_ids(db: Session, category_id: int) -> list[int]:
    categories = list_categories(db)
    children_by_parent: dict[int | None, list[Category]] = {}

    for category in categories:
        children_by_parent.setdefault(category.parent_id, []).append(category)

    ids: list[int] = []
    stack = [category_id]

    while stack:
        current_id = stack.pop()
        ids.append(current_id)
        stack.extend(child.id for child in children_by_parent.get(current_id, []))

    return ids


def list_popular_categories(db: Session, *, limit: int = 16) -> list[dict]:
    all_categories = list_categories(db)
    categories_by_id = {category.id: category for category in all_categories}
    children_by_parent: dict[int | None, list[Category]] = {}

    for category in all_categories:
        children_by_parent.setdefault(category.parent_id, []).append(category)

    products = (
        db.query(Product)
        .filter(Product.is_active == True)
        .filter(Product.is_deleted == False)
        .all()
    )
    products_by_category: dict[int, list[Product]] = {}

    for product in products:
        products_by_category.setdefault(product.category_id, []).append(product)

    popular: list[dict] = []
    second_level_categories = [
        category
        for category in all_categories
        if category.parent_id is not None
        and categories_by_id.get(category.parent_id) is not None
        and categories_by_id[category.parent_id].parent_id is None
    ]

    for category in second_level_categories:
        ids = get_descendant_category_ids(db, category.id)
        category_products = [
            product
            for descendant_id in ids
            for product in products_by_category.get(descendant_id, [])
        ]
        sales_count = sum(product.purchases_count for product in category_products)
        root = categories_by_id[category.parent_id]

        popular.append(
            {
                "id": category.id,
                "name": category.name,
                "slug": category.slug,
                "parent_id": category.parent_id,
                "description": category.description,
                "image_url": category.image_url,
                "root_id": root.id,
                "root_name": root.name,
                "sales_count": sales_count,
                "products_count": len(category_products),
            }
        )

    return sorted(
        popular,
        key=lambda item: (item["sales_count"], item["products_count"], item["name"]),
        reverse=True,
    )[:limit]


def get_category_or_404(db: Session, category_id: int) -> Category:
    category = db.get(Category, category_id)

    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    return category


def get_category_descendants(db: Session, category_id: int) -> list[Category]:
    categories = list_categories(db, include_archived=True)
    children_by_parent: dict[int | None, list[Category]] = {}

    for category in categories:
        children_by_parent.setdefault(category.parent_id, []).append(category)

    descendants: list[Category] = []
    stack = [category_id]

    while stack:
        current_id = stack.pop()
        category = next((item for item in categories if item.id == current_id), None)
        if category is None:
            continue
        descendants.append(category)
        stack.extend(child.id for child in children_by_parent.get(current_id, []))

    return descendants


def create_category(db: Session, category_data: CategoryCreate) -> Category:
    category = Category(**category_data.model_dump())
    db.add(category)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category already exists or parent is invalid",
        ) from exc

    db.refresh(category)
    return category


def update_category(
    db: Session,
    category_id: int,
    category_data: CategoryUpdate,
) -> Category:
    category = get_category_or_404(db, category_id)
    data = category_data.model_dump(exclude_unset=True)

    if data.get("parent_id") == category_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category cannot be its own parent",
        )

    for field, value in data.items():
        setattr(category, field, value)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category update conflicts with existing data",
        ) from exc

    db.refresh(category)
    return category


def delete_category(db: Session, category_id: int) -> None:
    from app.services import products as product_service

    category = get_category_or_404(db, category_id)
    descendants = get_category_descendants(db, category.id)
    descendant_ids = [item.id for item in descendants]
    products = (
        db.query(Product)
        .filter(Product.category_id.in_(descendant_ids))
        .filter(Product.is_deleted == False)
        .all()
    )

    if products:
        for product in products:
            product_service.delete_product(db, product)

        for descendant in descendants:
            descendant.is_archived = True

        db.commit()
        return None

    descendant_by_id = {item.id: item for item in descendants}

    def depth(item: Category) -> int:
        level = 0
        parent_id = item.parent_id
        while parent_id in descendant_by_id:
            level += 1
            parent_id = descendant_by_id[parent_id].parent_id
        return level

    for descendant in sorted(descendants, key=depth, reverse=True):
        db.delete(descendant)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category has children or products",
        ) from exc
