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
        
        raw_group_id = data.get("group_id") or data.get("groupId")
        group_id = str(raw_group_id) if raw_group_id else None

        key = data.get("key") or data.get("name") or ""
        value = data.get("value") or ""
        description = data.get("description")

        config = Configuration(
            id=str(uuid6.uuid7()),
            group_id=group_id,
            key=str(key),
            value=str(value),
            description=str(description) if description is not None and not isinstance(description, str) else description,
        )
        try:
            await store.create_configuration(config)
        except Exception as e:
            if "foreign key" in str(e).lower() or "fk" in str(e).lower():
                raise falcon.HTTPBadRequest(
                    title="Invalid Group ID",
                    description=f"Group ID '{group_id}' does not exist in configuration_groups."
                )
            raise

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
        
        if "group_id" in data or "groupId" in data:
            raw_group_id = data.get("group_id") if "group_id" in data else data.get("groupId")
            config.group_id = str(raw_group_id) if raw_group_id else None

        config.key = data.get("key", data.get("name", config.key))
        config.value = data.get("value", config.value)
        config.description = data.get("description", config.description)

        try:
            await store.update_configuration(config)
        except Exception as e:
            if "foreign key" in str(e).lower() or "fk" in str(e).lower():
                raise falcon.HTTPBadRequest(
                    title="Invalid Group ID",
                    description=f"Group ID '{config.group_id}' does not exist in configuration_groups."
                )
            raise

        resp.media = config.to_api_dict()

    async def on_delete(self, req: falcon.Request, resp: falcon.Response, configId: str):
        store = ConfigurationStore(get_driver())
        await store.delete_configuration(configId)
        resp.status = falcon.HTTP_204
