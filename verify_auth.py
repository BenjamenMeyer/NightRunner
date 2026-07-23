import os
import asyncio
import jwt
import falcon.asgi
import falcon.testing
from nightrunner_backend.main import app
from nightrunner_backend.drivers.base import DatabaseDriver
import uuid6

async def setup_test_data():
    db = DatabaseDriver()
    user_id = str(uuid6.uuid7())
    external_id = "test-sub-123"
    
    # Insert user
    await db.execute(
        "INSERT INTO users (id, external_id, username, email) VALUES (:id, :ext_id, :user, :email)",
        {"id": user_id, "ext_id": external_id, "user": "testuser", "email": "test@example.com"}
    )
    
    # Insert role
    await db.execute(
        "INSERT INTO user_roles (user_id, role) VALUES (:user_id, :role)",
        {"user_id": user_id, "role": "admin"}
    )
    return external_id

async def run_test():
    # Set environment variables for the middleware
    os.environ["DEV_MODE"] = "True"
    os.environ["OIDC_ISSUER"] = "test-issuer"
    os.environ["OIDC_AUDIENCE"] = "test-audience"
    
    from nightrunner_backend.config.settings import settings
    settings.dev_mode = True
    settings.oidc_issuer = "test-issuer"
    settings.oidc_audience = "test-audience"

    # Setup database
    from nightrunner_backend.main import run_migrations
    await run_migrations()
    
    # Cleanup old test data
    db = DatabaseDriver()
    await db.execute("DELETE FROM user_roles")
    await db.execute("DELETE FROM users")
    
    external_id = await setup_test_data()

    client = falcon.testing.TestClient(app)
    
    # Create a mock token
    token = jwt.encode({"sub": external_id, "iss": "test-issuer"}, "secret", algorithm="HS256")
    
    # Test protected endpoint
    print("Testing /me with valid token...")
    headers = {"Authorization": f"Bearer {token}"}
    resp = await client.simulate_get("/me", headers=headers)
    
    print(f"Status: {resp.status}")
    print(f"Body: {resp.json}")
    
    if resp.status == falcon.HTTP_OK:
        print("✅ Auth verification successful!")
    else:
        print("❌ Auth verification failed!")

if __name__ == "__main__":
    asyncio.run(run_test())
