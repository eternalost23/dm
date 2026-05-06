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
    description: str | None = None,
    image_url: str | None = None,
) -> Category:
    category = db.query(Category).filter(Category.slug == slug).first()

    if category:
        category.name = name
        category.parent_id = parent_id
        category.description = description
        category.image_url = image_url
        db.commit()
        db.refresh(category)
        return category

    category = Category(
        name=name,
        slug=slug,
        parent_id=parent_id,
        description=description,
        image_url=image_url,
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
    purchases_count: int = 0,
) -> Product:
    product = db.query(Product).filter(Product.title == title).first()

    if product:
        product.seller_id = seller_id
        product.category_id = category_id
        product.description = description
        product.price = price
        product.image_url = image_url
        product.purchases_count = max(product.purchases_count, purchases_count)
        product.is_active = True
        db.commit()
        db.refresh(product)
        return product

    product = Product(
        seller_id=seller_id,
        category_id=category_id,
        title=title,
        description=description,
        price=price,
        image_url=image_url,
        purchases_count=purchases_count,
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

        root_data = [
            ("Игры", "games", "Игры, дополнения, валюта и игровые сервисы"),
            ("Социальные сети", "social-networks", "Аккаунты, подписки и продвижение"),
            ("Программное обеспечение", "software", "Лицензии, подписки и AI-инструменты"),
            ("Подарочные карты", "gift-cards", "Карты оплаты и пополнение баланса"),
        ]

        roots = {
            slug: get_or_create_category(
                db,
                name=name,
                slug=slug,
                description=description,
            )
            for name, slug, description in root_data
        }

        popular_data = [
            ("Steam пополнение", "steam-wallet", "games", "Пополнение баланса и подарочные карты Steam", "https://cdn.cloudflare.steamstatic.com/store/home/store_home_share.jpg"),
            ("Red Dead Redemption", "red-dead-redemption", "games", "Ключи и аккаунты Red Dead Redemption", "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80"),
            ("Forza Horizon", "forza-horizon", "games", "Ключи и дополнения Forza Horizon", "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=600&q=80"),
            ("Diablo IV", "diablo-iv", "games", "Ключи, аккаунты и внутриигровые товары Diablo IV", "https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=600&q=80"),
            ("World of Warcraft", "world-of-warcraft", "games", "Подписки, таймкарты и аккаунты WoW", "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80"),
            ("PlayStation", "playstation", "gift-cards", "Карты PlayStation Store и подписки", "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?auto=format&fit=crop&w=600&q=80"),
            ("Xbox / Microsoft Store", "xbox-microsoft-store", "gift-cards", "Game Pass, карты Xbox и Microsoft Store", "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=600&q=80"),
            ("Nintendo eShop", "nintendo-eshop", "gift-cards", "Карты оплаты Nintendo eShop", "https://images.unsplash.com/photo-1612404730960-5c71577fca11?auto=format&fit=crop&w=600&q=80"),
            ("ChatGPT", "chatgpt", "software", "Подписки и доступы ChatGPT", "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=600&q=80"),
            ("Claude", "claude", "software", "Подписки и доступы Claude", "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=600&q=80"),
            ("Gemini", "gemini", "software", "Подписки и доступы Gemini", "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80"),
            ("Cursor AI", "cursor-ai", "software", "Лицензии Cursor и AI-инструменты для разработки", "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80"),
            ("Windows", "windows", "software", "Ключи Windows и системное ПО", "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80"),
            ("Adobe", "adobe", "software", "Подписки и лицензии Adobe", "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&w=600&q=80"),
            ("Spotify", "spotify", "social-networks", "Premium-подписки Spotify", "https://images.unsplash.com/photo-1611339555312-e607c8352fd7?auto=format&fit=crop&w=600&q=80"),
            ("Telegram", "telegram", "social-networks", "Premium, номера и аккаунты Telegram", "https://images.unsplash.com/photo-1611605698335-8b1569810432?auto=format&fit=crop&w=600&q=80"),
        ]

        popular_categories = {
            slug: get_or_create_category(
                db,
                name=name,
                slug=slug,
                parent_id=roots[root_slug].id,
                description=description,
                image_url=image_url,
            )
            for name, slug, root_slug, description, image_url in popular_data
        }

        leaf_data = [
            ("Steam ключи пополнения", "steam-wallet-keys", "steam-wallet"),
            ("Steam подарочные карты", "steam-gift-cards", "steam-wallet"),
            ("RDR ключи Steam", "rdr-steam-keys", "red-dead-redemption"),
            ("RDR аккаунты", "rdr-accounts", "red-dead-redemption"),
            ("Forza ключи Xbox", "forza-xbox-keys", "forza-horizon"),
            ("Diablo Battle.net ключи", "diablo-battlenet-keys", "diablo-iv"),
            ("WoW таймкарты", "wow-timecards", "world-of-warcraft"),
            ("Xbox Game Pass", "xbox-game-pass", "xbox-microsoft-store"),
            ("PlayStation Plus", "playstation-plus", "playstation"),
            ("Nintendo eShop карты", "nintendo-cards", "nintendo-eshop"),
            ("ChatGPT Plus", "chatgpt-plus", "chatgpt"),
            ("Claude Pro", "claude-pro", "claude"),
            ("Gemini Advanced", "gemini-advanced", "gemini"),
            ("Cursor Pro", "cursor-pro", "cursor-ai"),
            ("Windows 11 ключи", "windows-11", "windows"),
            ("Adobe Creative Cloud", "adobe-creative-cloud", "adobe"),
            ("Spotify Premium", "spotify-premium", "spotify"),
            ("Telegram Premium", "telegram-premium", "telegram"),
        ]

        leaves = {
            slug: get_or_create_category(
                db,
                name=name,
                slug=slug,
                parent_id=popular_categories[parent_slug].id,
            )
            for name, slug, parent_slug in leaf_data
        }

        product_data = [
            ("Steam Gift Card 10$", "steam-wallet-keys", "Цифровой код пополнения баланса Steam.", "999.00", 1280),
            ("Steam Gift Card 25$", "steam-gift-cards", "Подарочная карта Steam на 25 долларов.", "2299.00", 940),
            ("Red Dead Redemption 2 Steam Key", "rdr-steam-keys", "Ключ активации Red Dead Redemption 2 для Steam.", "1799.00", 720),
            ("Red Dead Online Account", "rdr-accounts", "Аккаунт Red Dead Online с базовой прокачкой.", "899.00", 210),
            ("Forza Horizon 5 Xbox Key", "forza-xbox-keys", "Ключ Forza Horizon 5 для Xbox/Microsoft Store.", "2499.00", 650),
            ("Diablo IV Battle.net Key", "diablo-battlenet-keys", "Ключ Diablo IV для Battle.net.", "3499.00", 530),
            ("World of Warcraft 60 Days", "wow-timecards", "Таймкарта World of Warcraft на 60 дней.", "2199.00", 490),
            ("Xbox Game Pass Ultimate 1 Month", "xbox-game-pass", "Подписка Xbox Game Pass Ultimate на 1 месяц.", "799.00", 870),
            ("PlayStation Plus Essential 1 Month", "playstation-plus", "Подписка PlayStation Plus Essential.", "699.00", 760),
            ("Nintendo eShop Card 15$", "nintendo-cards", "Карта оплаты Nintendo eShop.", "1499.00", 430),
            ("ChatGPT Plus 1 Month", "chatgpt-plus", "Доступ к ChatGPT Plus на 1 месяц.", "1899.00", 1120),
            ("Claude Pro 1 Month", "claude-pro", "Доступ к Claude Pro на 1 месяц.", "1999.00", 680),
            ("Gemini Advanced 1 Month", "gemini-advanced", "Доступ к Gemini Advanced.", "1799.00", 360),
            ("Cursor Pro 1 Month", "cursor-pro", "Лицензия Cursor Pro на 1 месяц.", "1599.00", 590),
            ("Windows 11 Pro Key", "windows-11", "Лицензионный цифровой ключ Windows 11 Pro.", "1499.00", 840),
            ("Adobe Creative Cloud 1 Month", "adobe-creative-cloud", "Подписка Adobe Creative Cloud.", "2499.00", 310),
            ("Spotify Premium 1 Month", "spotify-premium", "Spotify Premium на 1 месяц.", "399.00", 610),
            ("Telegram Premium 1 Month", "telegram-premium", "Telegram Premium на 1 месяц.", "349.00", 450),
        ]

        products: list[Product] = []
        for title, category_slug, description, price, purchases_count in product_data:
            products.append(
                get_or_create_product(
                    db,
                    seller_id=seller.id,
                    category_id=leaves[category_slug].id,
                    title=title,
                    description=description,
                    price=Decimal(price),
                    image_url=popular_categories[leaves[category_slug].parent.slug].image_url,
                    purchases_count=purchases_count,
                )
            )

        for product in products:
            create_digital_items(
                db,
                product_id=product.id,
                contents=[
                    f"{product.title.upper().replace(' ', '-')}-AAAA-BBBB",
                    f"{product.title.upper().replace(' ', '-')}-CCCC-DDDD",
                    f"{product.title.upper().replace(' ', '-')}-EEEE-FFFF",
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
