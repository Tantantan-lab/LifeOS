"""Runtime configuration — env + apps/api/.env. Tokens live only here
(plus TickTick's .tokens.json); they are never stored in the database."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    database_url: str = "postgresql://lifeos:lifeos@127.0.0.1:5432/lifeos"
    timezone: str = "Asia/Shanghai"

    github_token: str = ""
    weread_api_key: str = ""
    maimemo_token: str = ""
    xunji_token: str = ""

    ticktick_region: str = "cn"  # cn → dida365.com · intl → ticktick.com
    ticktick_client_id: str = ""
    ticktick_client_secret: str = ""
    ticktick_scope: str = "tasks:read tasks:write"
    ticktick_access_token: str = ""
    ticktick_refresh_token: str = ""

    llm_provider: str = "deepseek"
    llm_base_url: str = "https://api.deepseek.com"
    llm_api_key: str = ""
    llm_model: str = "deepseek-flash"

    # Scheduled sync cadence (0 disables the in-process loop).
    sync_interval_minutes: int = 180


settings = Settings()
