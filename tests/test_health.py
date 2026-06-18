import pytest
from httpx import ASGITransport, AsyncClient
from nightrunner_backend.main import app

@pytest.mark.asyncio
async def test_health_check():
    """
    Test that the /health endpoint returns 200 OK and status: ok.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
