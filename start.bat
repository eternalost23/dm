@echo off
echo Starting Digital Market...

echo Setting up backend...
cd /d "%~dp0"
if not exist .venv (
    echo Creating virtual environment...
    py -3.9 -m venv .venv
)

echo Activating virtual environment...
call .venv\Scripts\activate.bat

echo Installing backend dependencies...
pip install -e .

echo Setting up database...
alembic upgrade head

echo Seeding database...
python scripts\seed.py

echo Starting backend server...
start cmd /k "call .venv\Scripts\activate.bat && uvicorn app.main:app --host 127.0.0.1 --port 8000"

echo Setting up frontend...
cd frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    npm install
)

echo Starting frontend server...
start cmd /k "npm run dev"

echo.
echo Digital Market is starting up!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8000/docs
echo.
echo Default users (password: password):
echo - Admin: admin@example.com
echo - Seller: seller@example.com
echo - Buyer: buyer@example.com
pause
