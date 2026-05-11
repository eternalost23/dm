from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models import Category, ChatMessage, ChatThread, DigitalItem, Favorite, Order, Product, Review, User
from app.models.user import UserRole
from app.schemas.admin import AdminProductCreate, AdminProductUpdate
from app.schemas.product import ProductCreate, ProductUpdate
from app.services import categories as category_service


def ensure_seller(db: Session, seller_id: int) -> User:
    seller = db.get(User, seller_id)

    if seller is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seller not found",
        )

    if seller.role != UserRole.SELLER.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a seller",
        )

    return seller


def ensure_category(db: Session, category_id: int) -> Category:
    category = db.get(Category, category_id)

    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    return category


def list_public_products(
    db: Session,
    *,
    category_id: int | None = None,
    search: str | None = None,
    sort: str | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
) -> list[Product]:
    query = (
        db.query(Product)
        .options(
            joinedload(Product.category)
            .joinedload(Category.parent)
            .joinedload(Category.parent)
        )
        .filter(Product.is_active == True)
        .filter(Product.is_deleted == False)
        .filter(Category.is_archived == False)
    )

    if category_id is not None:
        category_ids = category_service.get_descendant_category_ids(db, category_id)
        query = query.filter(Product.category_id.in_(category_ids))

    if search:
        search_terms = [search.strip()]
        normalized_search = search.strip().lower().replace(" ", "")
        aliases = {
            "rdr2": "red dead redemption 2",
            "rdr": "red dead redemption",
        }
        if normalized_search in aliases:
            search_terms.append(aliases[normalized_search])
            if normalized_search == "rdr2":
                search_terms.append("red dead redemption")

        matching_category_ids: set[int] = set()
        lowered_terms = [term.lower() for term in search_terms if term]
        for category in category_service.list_categories(db):
            haystack = f"{category.name} {category.slug}".lower()
            if any(term in haystack for term in lowered_terms):
                matching_category_ids.update(
                    category_service.get_descendant_category_ids(db, category.id)
                )

        search_filters = [
            Product.title.ilike(f"%{term}%")
            for term in search_terms
        ]
        search_filters.extend(
            Product.description.ilike(f"%{term}%")
            for term in search_terms
        )
        search_filters.extend(
            Category.name.ilike(f"%{term}%")
            for term in search_terms
        )
        search_filters.extend(
            Category.slug.ilike(f"%{term}%")
            for term in search_terms
        )
        if matching_category_ids:
            search_filters.append(Product.category_id.in_(matching_category_ids))

        query = query.join(Category, Product.category_id == Category.id).filter(
            or_(*search_filters)
        )

    if min_price is not None:
        query = query.filter(Product.price >= min_price)

    if max_price is not None:
        query = query.filter(Product.price <= max_price)

    if sort == "sales":
        return query.order_by(Product.purchases_count.desc(), Product.created_at.desc()).all()

    if sort == "price_asc":
        return query.order_by(Product.price.asc(), Product.created_at.desc()).all()

    if sort == "price_desc":
        return query.order_by(Product.price.desc(), Product.created_at.desc()).all()

    return query.order_by(Product.created_at.desc()).all()


def list_products(
    db: Session,
    *,
    seller_id: int | None = None,
    category_id: int | None = None,
    is_active: bool | None = None,
) -> list[Product]:
    query = db.query(Product).filter(Product.is_deleted == False)

    if seller_id is not None:
        query = query.filter(Product.seller_id == seller_id)

    if category_id is not None:
        query = query.filter(Product.category_id == category_id)

    if is_active is not None:
        query = query.filter(Product.is_active == is_active)

    return query.order_by(Product.created_at.desc()).all()


def list_seller_products(db: Session, seller_id: int) -> list[Product]:
    return (
        db.query(Product)
        .filter(Product.seller_id == seller_id)
        .filter(Product.is_deleted == False)
        .order_by(Product.created_at.desc())
        .all()
    )


def get_product_or_404(db: Session, product_id: int) -> Product:
    product = db.get(Product, product_id)

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    return product


def get_public_product_or_404(db: Session, product_id: int) -> Product:
    product = (
        db.query(Product)
        .options(
            joinedload(Product.category)
            .joinedload(Category.parent)
            .joinedload(Category.parent)
        )
        .filter(Product.id == product_id)
        .filter(Product.is_active == True)
        .filter(Product.is_deleted == False)
        .first()
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    return product


def get_seller_product_or_404(
    db: Session,
    *,
    product_id: int,
    seller_id: int,
) -> Product:
    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .filter(Product.seller_id == seller_id)
        .filter(Product.is_deleted == False)
        .first()
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    return product


def create_seller_product(
    db: Session,
    *,
    seller_id: int,
    product_data: ProductCreate,
) -> Product:
    ensure_category(db, product_data.category_id)

    product = Product(
        seller_id=seller_id,
        category_id=product_data.category_id,
        title=product_data.title,
        description=product_data.description,
        price=product_data.price,
        image_url=product_data.image_url,
        is_active=True,
    )

    db.add(product)
    db.commit()
    db.refresh(product)

    return product


def create_admin_product(
    db: Session,
    product_data: AdminProductCreate,
) -> Product:
    ensure_seller(db, product_data.seller_id)
    ensure_category(db, product_data.category_id)

    product = Product(**product_data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)

    return product


def update_product_fields(
    db: Session,
    product: Product,
    data: dict,
) -> Product:
    required_fields = {"seller_id", "category_id", "title", "price"}

    for field in required_fields:
        if field in data and data[field] is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{field} cannot be null",
            )

    if "seller_id" in data:
        ensure_seller(db, data["seller_id"])

    if "category_id" in data:
        ensure_category(db, data["category_id"])

    for field, value in data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)

    return product


def update_seller_product(
    db: Session,
    *,
    product_id: int,
    seller_id: int,
    product_data: ProductUpdate,
) -> Product:
    product = get_seller_product_or_404(
        db,
        product_id=product_id,
        seller_id=seller_id,
    )
    data = product_data.model_dump(exclude_unset=True)

    return update_product_fields(db, product, data)


def update_admin_product(
    db: Session,
    *,
    product_id: int,
    product_data: AdminProductUpdate,
) -> Product:
    product = get_product_or_404(db, product_id)
    data = product_data.model_dump(exclude_unset=True)

    return update_product_fields(db, product, data)


def delete_product_links(db: Session, product: Product) -> None:
    db.query(Favorite).filter(Favorite.product_id == product.id).delete(
        synchronize_session=False,
    )
    thread_ids = [
        thread_id
        for (thread_id,) in db.query(ChatThread.id)
        .filter(ChatThread.product_id == product.id)
        .all()
    ]
    if thread_ids:
        db.query(ChatMessage).filter(ChatMessage.thread_id.in_(thread_ids)).delete(
            synchronize_session=False,
        )
    db.query(ChatThread).filter(ChatThread.product_id == product.id).delete(
        synchronize_session=False,
    )
    db.query(Order).filter(Order.product_id == product.id).update(
        {Order.digital_item_id: None},
        synchronize_session=False,
    )
    db.query(DigitalItem).filter(DigitalItem.product_id == product.id).delete(
        synchronize_session=False,
    )


def soft_delete_product(db: Session, product: Product) -> Product:
    product.is_active = False
    product.is_deleted = True
    delete_product_links(db, product)
    db.commit()
    db.refresh(product)

    return product


def delete_product(db: Session, product: Product) -> Product | None:
    has_orders = (
        db.query(Order.id)
        .filter(Order.product_id == product.id)
        .first()
        is not None
    )

    if has_orders:
        return soft_delete_product(db, product)

    delete_product_links(db, product)
    db.query(Review).filter(Review.product_id == product.id).delete(
        synchronize_session=False,
    )
    db.delete(product)
    db.commit()

    return None


def hard_delete_product(db: Session, product: Product) -> None:
    delete_product_links(db, product)
    db.query(Review).filter(Review.product_id == product.id).delete(
        synchronize_session=False,
    )
    db.delete(product)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Product has related orders, reviews, favorites, or digital items",
        ) from exc
