#!/bin/bash
"""
Video Caption Generator - Production Start Script
Industry-standard deployment script
"""

# Set environment variables
export FLASK_ENV=production
export PORT=${PORT:-5000}

# Create necessary directories
mkdir -p data uploads

# Install dependencies if needed
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

# Start the application
echo "🎬 Starting Video Caption Generator..."
echo "Environment: $FLASK_ENV"
echo "Port: $PORT"
echo "================================"

# Use Gunicorn for production
exec gunicorn -c gunicorn.conf.py main:app
