import falcon
import uuid6
from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.configuration import ConfigurationStore
from nightrunner_backend.models.configuration import Configuration


class ConfigurationsResource:
    """Handles /v1/configurations"""

    async def on_get(self, req: falcon.Request, resp: falcon.Response):
        store = ConfigurationStore(get_driver())
        configs = await store.list_configurations()
        resp.media = [c.to_api_dict() if hasattr(c, "to_api_dict") else c for c in configs]

    async def on_post(self, req: falcon.Request, resp: falcon.Response):
        store = ConfigurationStore(get_driver())
        data = await req.get_media()
        if not isinstance(data, dict):
            raise falcon.HTTPBadRequest(description="Request body must be a JSON object.")
        key = data.get("key") or ""
        value = data.get("value") or ""
        description = data.get("description")
        config = Configuration(
            id=str(uuid6.uuid7()),
            group_id=str(data.get("group_id", "")),
            key=str(key),
            value=str(value),
            description=str(description) if description is not None and not isinstance(description, str) else description,
        )
        await store.create_configuration(config)
        resp.status = falcon.HTTP_201
        resp.media = config.to_api_dict()


class ConfigurationResource:
    """Handles /v1/configurations/{configId}"""

    async def on_get(self, req: falcon.Request, resp: falcon.Response, configId: str):
        store = ConfigurationStore(get_driver())
        config = await store.get_configuration(configId)
        if not config:
            raise falcon.HTTPNotFound()
        resp.media = config.to_api_dict() if hasattr(config, "to_api_dict") else config

    async def on_put(self, req: falcon.Request, resp: falcon.Response, configId: str):
        store = ConfigurationStore(get_driver())
        raw = await store.get_configuration(configId)
        if not raw:
            raise falcon.HTTPNotFound()
        config = Configuration(**raw) if isinstance(raw, dict) else raw
        data = await req.get_media()
        config.group_id = data.get("group_id", config.group_id)
        config.key = data.get("key", config.key)
        config.value = data.get("value", config.value)
        config.description = data.get("description", config.description)
        await store.update_configuration(config)
        resp.media = config.to_api_dict()

    async def on_delete(self, req: falcon.Request, resp: falcon.Response, configId: str):
        store = ConfigurationStore(get_driver())
        await store.delete_configuration(configId)
        resp.status = falcon.HTTP_204
