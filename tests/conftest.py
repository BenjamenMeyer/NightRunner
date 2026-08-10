import pytest
import asyncio
import os
import sys
import time
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
# Ensure the project root is on the Python path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import importlib
app_ctx = importlib.import_module('nightrunner_backend.app_context')
close_driver = app_ctx.close_driver
get_driver = app_ctx.get_driver

# In-memory SQLite DB for each test function
@pytest.fixture(scope="function", autouse=True)
async def test_database():
    """Create an in‑memory SQLite database, run migrations, and provide a fresh driver per test."""
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"
    from nightrunner_backend import app_context
    app_context._driver = None
    driver = app_context.get_driver()
    await driver.run_migrations()
    yield driver
    await app_context.close_driver()

# Generate RSA key pair for JWT signing
@pytest.fixture(scope="session")
def rsa_keypair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return private_pem, public_pem

# Patch JWKS client to return our public key
@pytest.fixture(autouse=True)
def mock_jwks(monkeypatch, rsa_keypair):
    _, public_pem = rsa_keypair
    class DummySigningKey:
        def __init__(self, key):
            self.key = key
    class DummyPyJWKClient:
        def __init__(self, url):
            self.url = url
        def get_signing_key_from_jwt(self, token):
            return DummySigningKey(public_pem)
    monkeypatch.setattr('jwt.PyJWKClient', DummyPyJWKClient, raising=False)
    # Ensure settings expect a JWKS URL but are not in dev mode
    from nightrunner_backend.config.settings import settings
    # dev_mode is set via enable_dev_mode fixture
    settings.jwks_url = "http://dummy/jwks"
    settings.oidc_issuer = "http://test-issuer"
    settings.oidc_audience = "test-audience"
    yield

# Fixture that creates a JWT token with optional roles and admin flag and returns Authorization header
@pytest.fixture
def token_factory(rsa_keypair):
    def _factory(roles=None, is_admin=False):
        private_pem, _ = rsa_keypair
        payload = {
            "sub": "test-user-id",
            "iss": "http://test-issuer",
            "aud": "test-audience",
            "exp": int(time.time() + 3600),
            "roles": roles or {},
            "isAdmin": is_admin,
        }
        token = jwt.encode(payload, private_pem, algorithm="RS256")
        return {"Authorization": f"Bearer {token}"}
    return _factory

# Fixture to enable dev_mode during tests (use as needed)
@pytest.fixture
def dev_mode_enabled(monkeypatch):
    from nightrunner_backend.config.settings import settings
    monkeypatch.setattr(settings, "dev_mode", True)
