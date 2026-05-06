import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT_DIR))

from decimal import Decimal

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models import Category, DigitalItem, Product, User
from app.models.user import UserRole


def get_or_create_user(
    db,
    *,
    email: str,
    username: str,
    role: str,
) -> User:
    user = db.query(User).filter(User.email == email).first()

    if user:
        user.username = username
        user.hashed_password = get_password_hash("password")
        user.role = role
        user.is_active = True
        db.commit()
        db.refresh(user)
        return user

    user = User(
        email=email,
        username=username,
        hashed_password=get_password_hash("password"),
        role=role,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def get_or_create_category(
    db,
    *,
    name: str,
    slug: str,
    parent_id: int | None = None,
) -> Category:
    category = db.query(Category).filter(Category.slug == slug).first()

    if category:
        return category

    category = Category(
        name=name,
        slug=slug,
        parent_id=parent_id,
    )

    db.add(category)
    db.commit()
    db.refresh(category)

    return category


def get_or_create_product(
    db,
    *,
    seller_id: int,
    category_id: int,
    title: str,
    description: str,
    price: Decimal,
    image_url: str | None = None,
) -> Product:
    product = db.query(Product).filter(Product.title == title).first()

    if product:
        return product

    product = Product(
        seller_id=seller_id,
        category_id=category_id,
        title=title,
        description=description,
        price=price,
        image_url=image_url,
        is_active=True,
    )

    db.add(product)
    db.commit()
    db.refresh(product)

    return product


def create_digital_items(
    db,
    *,
    product_id: int,
    contents: list[str],
) -> None:
    existing_count = (
        db.query(DigitalItem)
        .filter(DigitalItem.product_id == product_id)
        .count()
    )

    if existing_count > 0:
        return

    for content in contents:
        digital_item = DigitalItem(
            product_id=product_id,
            content=content,
            is_sold=False,
        )

        db.add(digital_item)

    db.commit()


def seed_database() -> None:
    db = SessionLocal()

    try:
        admin = get_or_create_user(
            db,
            email="admin@example.com",
            username="admin",
            role=UserRole.ADMIN.value,
        )

        seller = get_or_create_user(
            db,
            email="seller@example.com",
            username="seller",
            role=UserRole.SELLER.value,
        )

        buyer = get_or_create_user(
            db,
            email="buyer@example.com",
            username="buyer",
            role=UserRole.BUYER.value,
        )

        games = get_or_create_category(
            db,
            name="Игры",
            slug="games",
        )

        steam = get_or_create_category(
            db,
            name="Steam",
            slug="steam",
            parent_id=games.id,
        )

        software = get_or_create_category(
            db,
            name="Программы",
            slug="software",
        )

        windows = get_or_create_category(
            db,
            name="Windows",
            slug="windows",
            parent_id=software.id,
        )

        steam_gift_card = get_or_create_product(
            db,
            seller_id=seller.id,
            category_id=steam.id,
            title="Steam Gift Card 10$",
            description="Цифровой код пополнения баланса Steam.",
            price=Decimal("999.00"),
        )

        windows_key = get_or_create_product(
            db,
            seller_id=seller.id,
            category_id=windows.id,
            title="Windows 11 Pro Key",
            description="Лицензионный цифровой ключ Windows 11 Pro.",
            price=Decimal("1499.00"),
        )

        minecraft_account = get_or_create_product(
            db,
            seller_id=seller.id,
            category_id=steam.id,
            title="Minecraft Java Account",
            description="Цифровой аккаунт Minecraft Java Edition.",
            price=Decimal("799.00"),
        )

        create_digital_items(
            db,
            product_id=steam_gift_card.id,
            contents=[
                "STEAM-AAAA-BBBB-CCCC",
                "STEAM-DDDD-EEEE-FFFF",
                "STEAM-GGGG-HHHH-IIII",
            ],
        )

        create_digital_items(
            db,
            product_id=windows_key.id,
            contents=[
                "WIN11-AAAA-BBBB-CCCC",
                "WIN11-DDDD-EEEE-FFFF",
            ],
        )

        create_digital_items(
            db,
            product_id=minecraft_account.id,
            contents=[
                "MINECRAFT-JAVA-AAAA-BBBB",
                "MINECRAFT-JAVA-CCCC-DDDD",
                "MINECRAFT-JAVA-EEEE-FFFF",
            ],
        )

        print("Seed completed successfully.")
        print(f"Admin: {admin.email}")
        print(f"Seller: {seller.email}")
        print(f"Buyer: {buyer.email}")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
