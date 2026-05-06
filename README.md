# Digital Market

A full-stack digital marketplace with FastAPI backend and React frontend.

## Features

### Backend (FastAPI)
- Users CRUD with role-based access (Buyer, Seller, Admin)
- Categories CRUD with hierarchical structure
- Products CRUD with seller management
- Authentication with JWT bearer tokens
- Admin panel for managing users, categories, products, orders, reviews, and favorites
- Seller dashboard for inventory management
- Orders, reviews, and favorites system
- PostgreSQL connection through SQLAlchemy
- Alembic migrations

### Frontend (React + TypeScript)
- User authentication (login/register)
- Product catalog with category filtering
- Product details with reviews
- Shopping cart and order management
- User profile with order history and favorites
- Seller dashboard for product management
- Responsive design with Tailwind CSS
- Modern UI components

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL

### Backend Setup

1. Install Python dependencies:
```bash
pip install -e .
```

2. Set up environment variables in `.env`:
```bash
DATABASE_URL=postgresql+psycopg://admin:admin@localhost:5432/digital_market
SECRET_KEY=your-secret-key-here
DB_ECHO=false
```

3. Run database migrations:
```bash
alembic upgrade head
```

4. Seed the database:
```bash
python scripts/seed.py
```

5. Start the backend server:
```bash
fastapi dev app/main.py
```

Backend will be available at: `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Configure API URL in `.env`:
```bash
VITE_API_URL=http://localhost:8000
```

3. Start the development server:
```bash
npm run dev
```

Frontend will be available at: `http://localhost:5173`

## Default Users

All seeded users have password: `password`

- **Admin**: `admin@example.com`
- **Seller**: `seller@example.com`
- **Buyer**: `buyer@example.com`

## Project Structure

```
digital-market/
├── app/                    # FastAPI backend
│   ├── api/               # API routes
│   ├── core/              # Core functionality
│   ├── models/            # SQLAlchemy models
│   ├── schemas/           # Pydantic schemas
│   ├── services/          # Business logic
│   └── main.py            # Application entry point
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and API client
│   │   ├── pages/         # Page components
│   │   └── types/         # TypeScript definitions
│   └── package.json
├── scripts/               # Database seeding scripts
├── alembic/               # Database migrations
└── pyproject.toml         # Python dependencies
```

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user info

### Products
- `GET /products/` - List products (with filtering)
- `GET /products/{id}` - Get product details
- `POST /products/` - Create product (sellers only)
- `PUT /products/{id}` - Update product (seller only)
- `DELETE /products/{id}` - Delete product (seller only)

### Categories
- `GET /categories/` - List categories
- `POST /categories/` - Create category (admin only)

### Orders
- `GET /orders/` - List user orders
- `POST /orders/` - Create order
- `PUT /orders/{id}` - Update order status

### Reviews & Favorites
- `GET /reviews/?product_id={id}` - Get product reviews
- `POST /reviews/` - Create review
- `GET /favorites/` - List user favorites
- `POST /favorites/` - Add to favorites
- `DELETE /favorites/{id}` - Remove from favorites

## Technologies Used

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database operations
- **Pydantic** - Data validation
- **PostgreSQL** - Database
- **Alembic** - Database migrations
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Lucide React** - Icons

## Development

### Running Tests
```bash
# Backend tests
pytest

# Frontend tests
cd frontend && npm test
```

### Code Quality
```bash
# Backend linting
ruff check .

# Frontend linting
cd frontend && npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
