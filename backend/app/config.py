from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Nessie
    USE_NESSIE: bool = True
    NESSIE_BASE_URL: str = "http://api.nessieisreal.com"  # HTTP por red restringida
    NESSIE_API_KEY: str = ""
    DEFAULT_NESSIE_ACCOUNT_ID: str | None = None

    # Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-pro"

    # Permite claves extra en .env para no romper (DATABASE_URL, etc.)
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

settings = Settings()
