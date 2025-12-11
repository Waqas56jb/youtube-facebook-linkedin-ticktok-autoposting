"""
Configuration settings for the Video Caption Generator
Industry-standard configuration management
"""

import os
from pathlib import Path

class Config:
    """Base configuration class"""
    
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    HOST = os.environ.get('HOST') or '127.0.0.1'
    PORT = int(os.environ.get('PORT') or 5000)
    DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    # Database settings
    DATABASE_PATH = os.environ.get('DATABASE_PATH') or 'data/captions_database.json'
    
    # Video settings
    SUPPORTED_VIDEO_FORMATS = {'.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'}
    CAPTION_EXTENSIONS = {'.txt', '.caption', '.srt', '.vtt'}
    
    # Caption settings
    DEFAULT_TEMPLATE = 'ai_tech'
    AVAILABLE_TEMPLATES = ['ai_tech', 'tutorial', 'general']
    
    # File paths
    BASE_DIR = Path(__file__).parent.parent.parent
    DATA_DIR = BASE_DIR / 'data'
    UPLOAD_DIR = BASE_DIR / 'uploads'
    
    # YouTube settings
    YOUTUBE_CREDENTIALS_FILE = 'client_sectets.json'
    YOUTUBE_TOKEN_FILE = 'data/youtube_token.pickle'
    YOUTUBE_UPLOADS_FILE = 'data/youtube_uploads.json'
    
    @classmethod
    def init_app(cls, app):
        """Initialize application with config"""
        # Create necessary directories
        cls.DATA_DIR.mkdir(exist_ok=True)
        cls.UPLOAD_DIR.mkdir(exist_ok=True)
        
        # Set Flask config
        app.config['SECRET_KEY'] = cls.SECRET_KEY
        app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    HOST = '127.0.0.1'
    PORT = 5000

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    HOST = '0.0.0.0'
    PORT = int(os.environ.get('PORT', 5000))
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'production-secret-key-change-this'

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True
    DATABASE_PATH = 'data/test_captions_database.json'

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
