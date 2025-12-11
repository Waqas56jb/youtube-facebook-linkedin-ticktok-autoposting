@echo off
REM Video Caption Generator - Production Start Script for Windows
REM Industry-standard deployment script

echo 🎬 Starting Video Caption Generator...

REM Set environment variables
set FLASK_ENV=production
set PORT=5000

REM Create necessary directories
if not exist "data" mkdir data
if not exist "uploads" mkdir uploads

REM Install dependencies if needed
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
pip install -r requirements.txt

REM Start the application with Gunicorn
echo Environment: %FLASK_ENV%
echo Port: %PORT%
echo ================================
gunicorn -c gunicorn.conf.py main:app

pause
