import os
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    dev_mode: bool = False
    oidc_issuer: str = ""
    oidc_client_id: str = "test-client"
    oidc_redirect_uri: str = "http://localhost/callback"
    oidc_audience: str = ""
    jwks_url: str = ""
    app_version: str = os.getenv("APP_VERSION", "v0.1.0-dev")
    front_end_url: str = os.getenv("FRONT_END_URL", "http://localhost:3000")
    
    # Database settings might be needed by the middleware to fetch user roles
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///nightrunner.db")

    @model_validator(mode="after")
    def validate_oidc(self):
        if self.oidc_issuer and not self.dev_mode:
            if not self.jwks_url:
                raise ValueError("jwks_url must be set if oidc_issuer is configured")
            if not self.oidc_audience:
                raise ValueError("oidc_audience must be set if oidc_issuer is configured")
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

# Placeholder for store used in tests that patch StationAssignConfigurationsStore
class StationAssignConfigurationsStore:
    """Simple placeholder store used only for test patching"""
    pass

settings = Settings()
