from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional


class Settings(BaseSettings):
    api_title: str = "StoryVerse API"
    api_version: str = "1.0.0"

    # CORS
    cors_allow_origins: List[str] = Field(default_factory=lambda: ["*"])

    # Whisper
    whisper_model: str = Field(default="distil-small.en", alias="WHISPER_MODEL")
    whisper_device: str = Field(default="auto", alias="WHISPER_DEVICE")
    whisper_compute_type: str = Field(default="int8", alias="WHISPER_COMPUTE_TYPE")
    whisper_cpu_threads: int = Field(default=0, alias="WHISPER_CPU_THREADS")
    whisper_chunk_length: int = Field(default=30, alias="WHISPER_CHUNK_LENGTH")  # seconds
    whisper_beam_size: int = Field(default=1, alias="WHISPER_BEAM_SIZE")
    whisper_language: Optional[str] = Field(default=None, alias="WHISPER_LANGUAGE")

    # Google / Gemini API keys
    google_api_key: Optional[str] = Field(default=None, alias="GOOGLE_API_KEY")
    gemini_api_key: Optional[str] = Field(default=None, alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-1.5-flash", alias="GEMINI_MODEL")
    
    # Pydantic v2 settings
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",  # do not fail on unrelated env vars like GOOGLE_API_KEY
    )


settings = Settings()  # type: ignore


