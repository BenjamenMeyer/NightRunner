import falcon
import uuid6
from typing import Any, Dict
from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.configuration import ConfigurationStore
from nightrunner_backend.models.configuration import Configuration


class ConfigurationsResource:
    """Handles /v1/configurations"""

    async def on_get(self, req: falcon.Request, resp: falcon.Response):
        store = ConfigurationStore(get_driver())
        configs = await store.list_configurations()
        resp.media = [self._to_dict(c) for c in configs]

    async def on_post(self, req: falcon.Request, resp: falcon.Response):
        store = ConfigurationStore(get_driver())
        data = await req.get_media()
        config = Configuration(
            id=str(uuid6.uuid7()),
            group_id=data.get("group_id", ""),
            key=data.get("key", ""),
            value=data.get("value", ""),
            description=data.get("description")
        )
        await store.create_configuration(config)
        resp.status = falcon.HTTP_201
        resp.media = self._to_dict(config)

    def _to_dict(self, config) -> Dict[str, Any]:
        if isinstance(config, dict):
            return {
                "id": config["id"],
                "group_id": config.get("group_id"),
                "key": config.get("key"),
                "value": config.get("value"),
                "description": config.get("description"),
            }
        return {
            "id": config.id,
            "group_id": config.group_id,
            "key": config.key,
            "value": config.value,
            "description": config.description,
        }


class ConfigurationResource:
    """Handles /v1/configurations/{configId}"""

    async def on_get(self, req: falcon.Request, resp: falcon.Response, configId: str):
        store = ConfigurationStore(get_driver())
        config = await store.get_configuration(configId)
        if not config:
            raise falcon.HTTPNotFound()
        resp.media = self._to_dict(config)

    async def on_put(self, req: falcon.Request, resp: falcon.Response, configId: str):
        store = ConfigurationStore(get_driver())
        raw = await store.get_configuration(configId)
        if not raw:
            raise falcon.HTTPNotFound()
        # Coerce dict (e.g. from dummy stores in tests) to model object
        config = Configuration(**raw) if isinstance(raw, dict) else raw
        data = await req.get_media()
        config.group_id = data.get("group_id", config.group_id)
        config.key = data.get("key", config.key)
        config.value = data.get("value", config.value)
        config.description = data.get("description", config.description)
        await store.update_configuration(config)
        resp.media = self._to_dict(config)

    async def on_delete(self, req: falcon.Request, resp: falcon.Response, configId: str):
        store = ConfigurationStore(get_driver())
        await store.delete_configuration(configId)
        resp.status = falcon.HTTP_204

    def _to_dict(self, config) -> Dict[str, Any]:
        if isinstance(config, dict):
            return {
                "id": config["id"],
                "group_id": config.get("group_id"),
                "key": config.get("key"),
                "value": config.get("value"),
                "description": config.get("description"),
            }
        return {
            "id": config.id,
            "group_id": config.group_id,
            "key": config.key,
            "value": config.value,
            "description": config.description,
        }
