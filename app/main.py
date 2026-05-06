from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.categories import router as categories_router
from app.api.chats import router as chats_router
from app.api.favorites import router as favorites_router
from app.api.health import router as health_router
from app.api.orders import router as orders_router
from app.api.products import router as products_router
from app.api.reviews import router as reviews_router
from app.api.seller import router as seller_router
from app.api.users import router as users_router

app = FastAPI(
    title="Digital Market API",
    description="API for a digital goods marketplace",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(users_router)
app.include_router(categories_router)
app.include_router(chats_router)
app.include_router(products_router)
app.include_router(seller_router)
app.include_router(orders_router)
app.include_router(reviews_router)
app.include_router(favorites_router)


@app.get("/")
def root():
    return {
        "message": "Digital Market API is running",
    }
