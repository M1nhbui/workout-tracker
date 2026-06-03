from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./gym.db"
    app_secret: str = "change-me-in-development"
    frontend_origin: str = "http://localhost:5173"
    openfoodfacts_enabled: bool = True
    llm_api_base: str | None = None
    llm_api_key: str | None = None
    llm_model: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
