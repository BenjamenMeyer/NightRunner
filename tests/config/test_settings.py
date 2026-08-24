import pytest
from nightrunner_backend.config.settings import Settings

def test_settings_dev_mode_allows_missing_oidc():
    # dev_mode True should bypass validation even if issuer is set without JWKS or audience
    s = Settings(dev_mode=True, oidc_issuer='https://example.com')
    assert s.dev_mode is True
    # No exception should be raised

def test_settings_missing_jwks_url_raises():
    # With dev_mode=False and issuer set, missing jwks_url should raise
    with pytest.raises(ValueError, match='jwks_url must be set'):
        Settings(dev_mode=False, oidc_issuer='https://example.com')

def test_settings_missing_audience_raises():
    # Provide jwks_url but missing audience should raise
    with pytest.raises(ValueError, match='oidc_audience must be set'):
        Settings(dev_mode=False, oidc_issuer='https://example.com', jwks_url='https://example.com/.well-known/jwks.json')
