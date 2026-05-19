import sys
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT_DIR))

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models import (
    Category,
    ChatMessage,
    ChatThread,
    DigitalItem,
    Favorite,
    Order,
    Product,
    Review,
    User,
)
from app.models.order import OrderStatus
from app.models.user import UserRole


def clear_market_data(db) -> None:
    """Clear marketplace data while preserving existing users."""
    for model in (
        ChatMessage,
        ChatThread,
        Order,
        Review,
        Favorite,
        DigitalItem,
        Product,
        Category,
    ):
        db.query(model).delete(synchronize_session=False)

    db.commit()


def get_seed_seller(db) -> User:
    seller = (
        db.query(User)
        .filter(User.role == UserRole.SELLER.value)
        .filter(User.is_active == True)
        .order_by(User.id.asc())
        .first()
    )

    if seller is not None:
        return seller

    seller = (
        db.query(User)
        .filter(User.role == UserRole.SELLER.value)
        .order_by(User.id.asc())
        .first()
    )

    if seller is not None:
        return seller

    seller = User(
        email="seed-seller@example.com",
        username="seed_seller",
        hashed_password=get_password_hash("password"),
        role=UserRole.SELLER.value,
        is_active=True,
    )
    db.add(seller)
    db.commit()
    db.refresh(seller)

    return seller


def get_seed_buyers(db) -> list[User]:
    demo_buyers = [
        ("ivan.petrov@example.com", "Иван Петров"),
        ("anna.smirnova@example.com", "Анна Смирнова"),
        ("sergey.ivanov@example.com", "Сергей Иванов"),
        ("maria.kuznetsova@example.com", "Мария Кузнецова"),
        ("dmitry.popov@example.com", "Дмитрий Попов"),
        ("elena.sokolova@example.com", "Елена Соколова"),
        ("alexey.lebedev@example.com", "Алексей Лебедев"),
        ("olga.novikova@example.com", "Ольга Новикова"),
        ("pavel.morozov@example.com", "Павел Морозов"),
        ("natalia.volkova@example.com", "Наталья Волкова"),
        ("andrey.fedorov@example.com", "Андрей Федоров"),
        ("ekaterina.orlova@example.com", "Екатерина Орлова"),
    ]

    for email, username in demo_buyers:
        user = db.query(User).filter(User.email == email).first()

        if user is None:
            user = User(
                email=email,
                username=username,
                hashed_password=get_password_hash("password"),
                role=UserRole.BUYER.value,
                is_active=True,
            )
            db.add(user)
        else:
            user.username = username
            user.role = UserRole.BUYER.value
            user.is_active = True

    db.commit()

    buyer_emails = [email for email, _ in demo_buyers]
    return db.query(User).filter(User.email.in_(buyer_emails)).order_by(User.id.asc()).all()


def create_category(
    db,
    *,
    name: str,
    slug: str,
    parent_id: int | None = None,
    description: str | None = None,
    image_url: str | None = None,
) -> Category:
    category = Category(
        name=name,
        slug=slug,
        parent_id=parent_id,
        description=description,
        image_url=image_url,
    )

    db.add(category)
    db.flush()

    return category


def create_product(
    db,
    *,
    seller_id: int,
    category_id: int,
    title: str,
    description: str,
    price: str,
    image_url: str,
) -> Product:
    product = Product(
        seller_id=seller_id,
        category_id=category_id,
        title=title,
        description=description,
        price=Decimal(price),
        image_url=image_url,
        purchases_count=0,
        is_active=True,
        is_deleted=False,
    )

    db.add(product)
    db.flush()

    return product


def create_available_digital_items(db, *, product: Product, amount: int = 6) -> None:
    for index in range(1, amount + 1):
        digital_item = DigitalItem(
            product_id=product.id,
            content=f"CG-{product.id:04d}-FREE-{index:03d}-KEY-{(product.id * 97 + index * 13):05d}",
            is_sold=False,
        )
        db.add(digital_item)


def create_paid_order(
    db,
    *,
    buyer: User,
    product: Product,
    created_at: datetime,
    sequence: int,
) -> None:
    digital_item = DigitalItem(
        product_id=product.id,
        content=f"CG-{product.id:04d}-SOLD-{sequence:05d}-KEY-{(product.id * 193 + sequence * 17):06d}",
        is_sold=True,
        created_at=created_at,
    )
    db.add(digital_item)
    db.flush()

    order = Order(
        buyer_id=buyer.id,
        product_id=product.id,
        digital_item_id=digital_item.id,
        status=OrderStatus.PAID.value,
        total_price=product.price,
        product_title_snapshot=product.title,
        product_image_url_snapshot=product.image_url,
        seller_username_snapshot=product.seller.username if product.seller else None,
        created_at=created_at,
    )
    product.purchases_count += 1
    db.add(order)


def create_sales_history(db, *, products: list[Product], buyers: list[User]) -> int:
    sequence = 1
    today = date.today()

    for product_index, product in enumerate(products):
        sales_count = 3 + (product_index % 3)

        for sale_index in range(sales_count):
            days_ago = (product_index * 5 + sale_index * 11) % 90
            order_date = today - timedelta(days=days_ago)
            buyer = buyers[(sequence - 1) % len(buyers)]
            created_at = datetime.combine(
                order_date,
                time(
                    hour=9 + (product_index + sale_index * 2) % 10,
                    minute=(product_index * 7 + sale_index * 19) % 60,
                    second=0,
                ),
            )

            create_paid_order(
                db,
                buyer=buyer,
                product=product,
                created_at=created_at,
                sequence=sequence,
            )
            sequence += 1

    return sequence - 1


def seed_database() -> None:
    db = SessionLocal()

    try:
        clear_market_data(db)
        seller = get_seed_seller(db)
        buyers = get_seed_buyers(db)

        root_data = [
            ("Подписки и сервисы", "subscriptions", "Российские онлайн-сервисы, кино, музыка и книги"),
            ("Игры", "games", "Ключи игр, внутриигровая валюта и пополнение"),
            ("Программное обеспечение", "software", "Ключи Windows, Office, антивирусы и рабочие сервисы"),
            ("Подарочные карты", "gift-cards", "Цифровые сертификаты и карты оплаты"),
        ]

        roots = {
            slug: create_category(
                db,
                name=name,
                slug=slug,
                description=description,
            )
            for name, slug, description in root_data
        }

        category_data = [
            ("Яндекс", "yandex-services", "subscriptions", "Яндекс Плюс, Кинопоиск и Яндекс 360", "/images/yandex-services.svg"),
            ("Онлайн-кинотеатры", "online-cinemas", "subscriptions", "Иви, Okko, Wink, START и PREMIER", "/images/online-cinemas.svg"),
            ("Музыка и книги", "music-books", "subscriptions", "VK Музыка, Литрес и MyBook", "/images/music-books.svg"),
            ("Telegram", "telegram", "subscriptions", "Telegram Premium", "/images/telegram-premium.svg"),
            ("Windows", "windows", "software", "Ключи Windows 10 и Windows 11", "/images/windows-keys.svg"),
            ("Office и рабочие пакеты", "office-tools", "software", "Office, МойОфис и офисные сервисы", "/images/office-tools.svg"),
            ("Антивирусы", "antiviruses", "software", "Kaspersky, Dr.Web и защитное ПО", "/images/antiviruses.svg"),
            ("Облака", "cloud-storage", "software", "Яндекс 360 и Облако Mail.ru", "/images/cloud-storage.svg"),
            ("VK Play", "vk-play", "games", "Пополнение VK Play и ключи игр", "/images/vk-play.svg"),
            ("Российские игры", "russian-games", "games", "Atomic Heart, Смута, Black Book и другие игры", "/images/russian-games.svg"),
            ("Онлайн-игры", "online-games", "games", "Мир танков, Warface, Аллоды Онлайн и игровые наборы", "/images/online-games.svg"),
            ("Игровые ключи", "game-keys", "games", "Ключи активации популярных игр", "/images/game-keys.svg"),
            ("Сертификаты", "certificates", "gift-cards", "Подарочные цифровые сертификаты", "/images/certificates.svg"),
        ]

        categories = {
            slug: create_category(
                db,
                name=name,
                slug=slug,
                parent_id=roots[root_slug].id,
                description=description,
                image_url=image_url,
            )
            for name, slug, root_slug, description, image_url in category_data
        }

        product_data = [
            ("Яндекс Плюс 1 месяц", "yandex-services", "Код активации Яндекс Плюс на 1 месяц.", "299.00"),
            ("Яндекс Плюс 3 месяца", "yandex-services", "Код активации Яндекс Плюс на 3 месяца.", "749.00"),
            ("Кинопоиск 1 месяц", "yandex-services", "Доступ к подписке Кинопоиск на 1 месяц.", "399.00"),
            ("Иви 1 месяц", "online-cinemas", "Промокод подписки Иви на 1 месяц.", "299.00"),
            ("Okko 1 месяц", "online-cinemas", "Промокод Okko на 1 месяц просмотра.", "299.00"),
            ("Wink 1 месяц", "online-cinemas", "Код подписки Wink на 1 месяц.", "249.00"),
            ("START 1 месяц", "online-cinemas", "Промокод START на 1 месяц.", "299.00"),
            ("PREMIER 1 месяц", "online-cinemas", "Промокод PREMIER на 1 месяц.", "249.00"),
            ("VK Музыка 1 месяц", "music-books", "Код доступа к VK Музыке на 1 месяц.", "199.00"),
            ("Литрес сертификат 500 ₽", "music-books", "Цифровой сертификат Литрес номиналом 500 рублей.", "500.00"),
            ("MyBook Premium 1 месяц", "music-books", "Промокод MyBook Premium на 1 месяц.", "349.00"),
            ("Telegram Premium 1 месяц", "telegram", "Код активации Telegram Premium на 1 месяц.", "349.00"),
            ("Windows 11 Pro Key", "windows", "Цифровой ключ активации Windows 11 Pro.", "1499.00"),
            ("Windows 10 Pro Key", "windows", "Цифровой ключ активации Windows 10 Pro.", "1199.00"),
            ("Windows 11 Home Key", "windows", "Цифровой ключ активации Windows 11 Home.", "1099.00"),
            ("Microsoft Office 2021 Professional Plus Key", "office-tools", "Ключ активации Microsoft Office 2021 Professional Plus.", "2299.00"),
            ("Microsoft Office 2019 Professional Plus Key", "office-tools", "Ключ активации Microsoft Office 2019 Professional Plus.", "1799.00"),
            ("МойОфис Профессиональный", "office-tools", "Лицензия МойОфис Профессиональный для работы с документами.", "1599.00"),
            ("Яндекс 360 Премиум 1 месяц", "cloud-storage", "Промокод Яндекс 360 Премиум на 1 месяц.", "299.00"),
            ("Облако Mail.ru 1 ТБ 1 месяц", "cloud-storage", "Промокод Облако Mail.ru на 1 ТБ сроком на 1 месяц.", "399.00"),
            ("Kaspersky Standard 1 год", "antiviruses", "Лицензия Kaspersky Standard на 1 устройство на 1 год.", "1299.00"),
            ("Kaspersky Plus 1 год", "antiviruses", "Лицензия Kaspersky Plus на 1 устройство на 1 год.", "1799.00"),
            ("Dr.Web Security Space 1 год", "antiviruses", "Лицензия Dr.Web Security Space на 1 устройство на 1 год.", "1199.00"),
            ("VK Play пополнение 500 ₽", "vk-play", "Код пополнения баланса VK Play на 500 рублей.", "500.00"),
            ("VK Play пополнение 1000 ₽", "vk-play", "Код пополнения баланса VK Play на 1000 рублей.", "1000.00"),
            ("Atomic Heart VK Play Key", "russian-games", "Ключ активации Atomic Heart для VK Play.", "1899.00"),
            ("Смута VK Play Key", "russian-games", "Ключ активации игры Смута для VK Play.", "1599.00"),
            ("Black Book Steam Key", "russian-games", "Ключ активации Black Book в Steam.", "699.00"),
            ("Pathfinder: Wrath of the Righteous Steam Key", "game-keys", "Ключ активации Pathfinder: Wrath of the Righteous в Steam.", "999.00"),
            ("Loop Hero Steam Key", "game-keys", "Ключ активации Loop Hero в Steam.", "499.00"),
            ("Escape from Tarkov Standard", "game-keys", "Цифровой ключ Escape from Tarkov Standard Edition.", "3499.00"),
            ("Мир танков 2500 золота", "online-games", "Код пополнения Мир танков на 2500 золота.", "799.00"),
            ("Мир кораблей 2500 дублонов", "online-games", "Код пополнения Мир кораблей на 2500 дублонов.", "899.00"),
            ("Warface 1000 кредитов", "online-games", "Код пополнения Warface на 1000 кредитов.", "499.00"),
            ("Аллоды Онлайн 1000 кристаллов", "online-games", "Код пополнения Аллоды Онлайн на 1000 кристаллов.", "699.00"),
            ("Подарочный сертификат Литрес 1000 ₽", "certificates", "Цифровой подарочный сертификат Литрес на 1000 рублей.", "1000.00"),
        ]

        products: list[Product] = []
        for title, category_slug, description, price in product_data:
            category = categories[category_slug]
            products.append(
                create_product(
                    db,
                    seller_id=seller.id,
                    category_id=category.id,
                    title=title,
                    description=description,
                    price=price,
                    image_url=category.image_url or "/images/sgc.jpg",
                )
            )

        for product in products:
            create_available_digital_items(db, product=product)

        sales_count = create_sales_history(db, products=products, buyers=buyers)

        db.commit()

        print("Seed completed successfully.")
        print("Users table preserved.")
        print(f"Seller used: {seller.email}")
        print(f"Categories created: {len(roots) + len(categories)}")
        print(f"Products created: {len(products)}")
        print(f"Paid orders created: {sales_count}")
        print(f"Available digital keys created: {len(products) * 6}")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
