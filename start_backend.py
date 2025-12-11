#!/usr/bin/env python3
"""
Start script for Video Caption Generator Backend
Run with: python start_backend.py
"""

import uvicorn
import os
from pathlib import Path

if __name__ == "__main__":
    # Set environment variables
    os.environ.setdefault("HOST", "0.0.0.0")
    os.environ.setdefault("PORT", "8000")
    
    print("🎬 Starting Video Caption Generator Backend...")
    print("📍 Backend will be available at: http://localhost:8000")
    print("📚 API Documentation: http://localhost:8000/docs")
    print("🔧 Health Check: http://localhost:8000/api/health")
    print("=" * 60)
    
    # Run the FastAPI application
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
