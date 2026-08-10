import falcon
import uuid6
from typing import Any, Dict
from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.configuration import ConfigurationStore
from nightrunner_backend.models.configuration import ConfigurationGroup, Configuration


class ConfigurationGroupsResource:
    """Handles /v1/configuration-groups"""

    async def on_get(self, req: falcon.Request, resp: falcon.Response):
        store = ConfigurationStore(get_driver())
        groups = await store.list_groups()
        resp.media = [self._to_dict(g) for g in groups]

    async def on_post(self, req: falcon.Request, resp: falcon.Response):
        store = ConfigurationStore(get_driver())
        data = await req.get_media()
        group = ConfigurationGroup(
            id=str(uuid6.uuid7()),
            name=data.get("name", ""),
            description=data.get("description")
        )
        await store.create_group(group)
        resp.status = falcon.HTTP_201
        resp.media = self._to_dict(group)

    def _to_dict(self, group) -> Dict[str, Any]:
        if isinstance(group, dict):
            return {"id": group["id"], "name": group["name"], "description": group.get("description")}
        return {"id": group.id, "name": group.name, "description": group.description}


class ConfigurationGroupResource:
    """Handles /v1/configuration-groups/{groupId}"""

    async def on_get(self, req: falcon.Request, resp: falcon.Response, groupId: str):
        store = ConfigurationStore(get_driver())
        group = await store.get_group(groupId)
        if not group:
            raise falcon.HTTPNotFound()
        resp.media = self._to_dict(group)

    async def on_put(self, req: falcon.Request, resp: falcon.Response, groupId: str):
        store = ConfigurationStore(get_driver())
        raw = await store.get_group(groupId)
        if not raw:
            raise falcon.HTTPNotFound()
        # Coerce dict (e.g. from dummy stores in tests) to model object
        group = ConfigurationGroup(**raw) if isinstance(raw, dict) else raw
        data = await req.get_media()
        group.name = data.get("name", group.name)
        group.description = data.get("description", group.description)
        await store.update_group(group)
        resp.media = self._to_dict(group)

    async def on_delete(self, req: falcon.Request, resp: falcon.Response, groupId: str):
        store = ConfigurationStore(get_driver())
        await store.delete_group(groupId)
        resp.status = falcon.HTTP_204

    def _to_dict(self, group) -> Dict[str, Any]:
        if isinstance(group, dict):
            return {"id": group["id"], "name": group["name"], "description": group.get("description")}
        return {"id": group.id, "name": group.name, "description": group.description}
