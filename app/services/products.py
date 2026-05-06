from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models import Category, Product, User
from app.models.user import UserRole
from app.schemas.admin import AdminProductCreate, AdminProductUpdate
from app.schemas.product import ProductCreate, ProductUpdate


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
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
) -> list[Product]:
    query = db.query(Product).filter(Product.is_active == True)

    if category_id is not None:
        query = query.filter(Product.category_id == category_id)

    if search:
        query = query.filter(Product.title.ilike(f"%{search}%"))

    if min_price is not None:
        query = query.filter(Product.price >= min_price)

    if max_price is not None:
        query = query.filter(Product.price <= max_price)

    return query.order_by(Product.created_at.desc()).all()


def list_products(
    db: Session,
    *,
    seller_id: int | None = None,
    category_id: int | None = None,
    is_active: bool | None = None,
) -> list[Product]:
    query = db.query(Product)

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
        .options(joinedload(Product.category))
        .filter(Product.id == product_id)
        .filter(Product.is_active == True)
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


def soft_delete_product(db: Session, product: Product) -> Product:
    product.is_active = False
    db.commit()
    db.refresh(product)

    return product


def hard_delete_product(db: Session, product: Product) -> None:
    db.delete(product)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Product has related orders, reviews, favorites, or digital items",
        ) from exc
