import os
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    dev_mode: bool = True
    oidc_issuer: str = ""
    oidc_client_id: str = "test-client"
    oidc_redirect_uri: str = "http://localhost/callback"
    oidc_audience: str = ""
    jwks_url: str = ""

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

settings = Settings()
