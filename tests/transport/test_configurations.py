import json
import pytest
import falcon
from unittest.mock import AsyncMock, patch

from nightrunner_backend.main import app, register_routes


@pytest.fixture
async def test_client():
    register_routes(app)
    async with falcon.testing.ASGITestClient(app) as client:
        yield client


class DummyConfigStore:
    def __init__(self, driver=None):
        pass

    # ConfigurationGroup methods
    async def list_groups(self):
        return []

    async def get_group(self, group_id: str):
        return {"id": group_id, "name": f"Group {group_id}", "description": "A group"}

    async def create_group(self, group):
        return None

    async def update_group(self, group):
        return None

    async def delete_group(self, group_id: str):
        return None

    # Configuration methods
    async def list_configurations(self):
        return []

    async def get_configuration(self, config_id: str):
        return {
            "id": config_id,
            "group_id": "g1",
            "key": "key1",
            "value": "val1",
            "description": "desc",
        }

    async def create_configuration(self, config):
        return None

    async def update_configuration(self, config):
        return None

    async def delete_configuration(self, config_id: str):
        return None


@patch("nightrunner_backend.transport.configuration_groups.ConfigurationStore", DummyConfigStore)
@patch("nightrunner_backend.transport.configurations.ConfigurationStore", DummyConfigStore)
@patch(
    "nightrunner_backend.transport.middleware.auth.AuthMiddleware.process_request",
    AsyncMock(return_value=None),
)
@pytest.mark.asyncio
async def test_configuration_endpoints(test_client, dev_mode_enabled):
    # ----- Configuration Groups -----
    # List groups (should be empty)
    resp = await test_client.simulate_get("/v1/configuration-groups")
    assert resp.status == falcon.HTTP_200
    assert isinstance(json.loads(resp.text), list)

    # Create a new group
    group_body = {"name": "Group A", "description": "Test group"}
    resp = await test_client.simulate_post("/v1/configuration-groups", json=group_body)
    assert resp.status == falcon.HTTP_201
    group = json.loads(resp.text)
    assert group["name"] == "Group A"
    group_id = group["id"]

    # Retrieve the created group
    resp = await test_client.simulate_get(f"/v1/configuration-groups/{group_id}")
    assert resp.status == falcon.HTTP_200
    fetched = json.loads(resp.text)
    assert fetched["id"] == group_id

    # Update the group
    update_body = {"name": "Group A Updated"}
    resp = await test_client.simulate_put(f"/v1/configuration-groups/{group_id}", json=update_body)
    assert resp.status == falcon.HTTP_200
    updated = json.loads(resp.text)
    assert updated["name"] == "Group A Updated"

    # Delete the group
    resp = await test_client.simulate_delete(f"/v1/configuration-groups/{group_id}")
    assert resp.status == falcon.HTTP_204

    # ----- Configurations -----
    # List configurations (empty)
    resp = await test_client.simulate_get("/v1/configurations")
    assert resp.status == falcon.HTTP_200
    assert isinstance(json.loads(resp.text), list)

    # Create a configuration
    config_body = {
        "group_id": group_id,
        "key": "test_key",
        "value": "test_value",
        "description": "test desc",
    }
    resp = await test_client.simulate_post("/v1/configurations", json=config_body)
    assert resp.status == falcon.HTTP_201
    config = json.loads(resp.text)
    assert config["key"] == "test_key"
    config_id = config["id"]

    # Retrieve the configuration
    resp = await test_client.simulate_get(f"/v1/configurations/{config_id}")
    assert resp.status == falcon.HTTP_200
    got = json.loads(resp.text)
    assert got["id"] == config_id

    # Update the configuration
    update_cfg = {"value": "new_value"}
    resp = await test_client.simulate_put(f"/v1/configurations/{config_id}", json=update_cfg)
    assert resp.status == falcon.HTTP_200
    upd = json.loads(resp.text)
    assert upd["value"] == "new_value"

    # Delete the configuration
    resp = await test_client.simulate_delete(f"/v1/configurations/{config_id}")
    assert resp.status == falcon.HTTP_204

    # Create a configuration with camelCase keys (groupId, name)
    camel_body = {
        "groupId": group_id,
        "name": "camel_key",
        "value": "camel_val",
        "description": "camel desc",
    }
    resp = await test_client.simulate_post("/v1/configurations", json=camel_body)
    assert resp.status == falcon.HTTP_201
    camel_cfg = json.loads(resp.text)
    assert camel_cfg["groupId"] == group_id
    assert camel_cfg["group_id"] == group_id
    assert camel_cfg["name"] == "camel_key"
    assert camel_cfg["key"] == "camel_key"

    # Create a configuration with empty groupId (should map to None/null)
    empty_group_body = {
        "groupId": "",
        "name": "empty_group_key",
        "value": "val",
    }
    resp = await test_client.simulate_post("/v1/configurations", json=empty_group_body)
    assert resp.status == falcon.HTTP_201
    empty_cfg = json.loads(resp.text)
    assert empty_cfg["groupId"] is None
    assert empty_cfg["group_id"] is None

    # Create a configuration with tasks payload
    tasks_body = {
        "groupId": group_id,
        "name": "config_with_tasks",
        "tasks": [
            {"id": "t1", "name": "Stopwatch Challenge", "type": "Stopwatch"},
            {"id": "t2", "name": "Knot Tying", "type": "Timed Challenge"}
        ]
    }
    resp = await test_client.simulate_post("/v1/configurations", json=tasks_body)
    assert resp.status == falcon.HTTP_201
    cfg_with_tasks = json.loads(resp.text)
    assert "tasks" in cfg_with_tasks
    assert len(cfg_with_tasks["tasks"]) == 2
    assert cfg_with_tasks["tasks"][0]["name"] == "Stopwatch Challenge"
