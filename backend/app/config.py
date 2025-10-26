
import os
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# prefer project-level backend/.env (one level up) if present, otherwise fallback to app/.env
env_path = os.path.abspath(os.path.join(BASE_DIR, "..", ".env"))
if not os.path.exists(env_path):
    env_path = os.path.abspath(os.path.join(BASE_DIR, ".env"))


class Settings(BaseSettings):
    # App
    secret_key: str = "cambia-esto-por-un-valor-largo-aleatorio"
    access_token_expire_minutes: int = 120

    # DB
    database_url: str = f"sqlite+aiosqlite:///{os.path.join(BASE_DIR, 'app.db')}"

    # Nessie
    nessie_api_key: str = ""  # vacío = DEMO
    nessie_base_url: str = "http://api.nessieisreal.com"

    # Gemini (demo / real)
    gemini_api_key: str = ""
    gemini_api_secret: str = ""
    gemini_base_url: str = "https://api.gemini.com"
    # If True and gemini_api_key+secret provided, the server will attempt to place real orders
    gemini_execute_trades: bool = False

    # Frontend (raíz donde están index.html, style.css, etc.)
    frontend_dir: str = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))

    model_config = SettingsConfigDict(
        env_file=env_path,
        case_sensitive=False,
        extra="allow"
    )

settings = Settings()
