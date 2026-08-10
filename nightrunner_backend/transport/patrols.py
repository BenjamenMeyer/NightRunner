import falcon
import uuid6
from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.patrols import PatrolsStore
from nightrunner_backend.models.patrol import Patrol, PatrolMember


class PatrolsResource:
    """Handles /v1/patrols"""

    async def on_get(self, req: falcon.Request, resp: falcon.Response):
        store = PatrolsStore(get_driver())
        patrols = await store.list()
        resp.media = [p.to_api_dict() for p in patrols]

    async def on_post(self, req: falcon.Request, resp: falcon.Response):
        store = PatrolsStore(get_driver())
        data = await req.get_media()
        members = [
            PatrolMember(
                id=str(uuid6.uuid7()),
                name=m["name"],
                rank=m.get("rank"),
                troop=m.get("troop"),
            )
            for m in data.get("members", [])
        ]
        patrol = Patrol(
            id=str(uuid6.uuid7()),
            name=data.get("name", "Trail Life"),
            members=members,
        )
        await store.create(patrol)
        resp.status = falcon.HTTP_201
        resp.media = patrol.to_api_dict()


class PatrolResource:
    """Handles /v1/patrols/{patrol_id}"""

    async def on_get(self, req: falcon.Request, resp: falcon.Response, patrol_id: str):
        store = PatrolsStore(get_driver())
        patrol = await store.get(patrol_id)
        if not patrol:
            raise falcon.HTTPNotFound()
        resp.media = patrol.to_api_dict()

    async def on_put(self, req: falcon.Request, resp: falcon.Response, patrol_id: str):
        store = PatrolsStore(get_driver())
        patrol = await store.get(patrol_id)
        if not patrol:
            raise falcon.HTTPNotFound()
        data = await req.get_media()
        patrol.name = data.get("name", patrol.name)
        if "members" in data:
            patrol.members = [
                PatrolMember(
                    id=m.get("id") or str(uuid6.uuid7()),
                    name=m["name"],
                    rank=m.get("rank"),
                    troop=m.get("troop"),
                )
                for m in data["members"]
            ]
        await store.update(patrol)
        resp.media = patrol.to_api_dict()

    async def on_delete(self, req: falcon.Request, resp: falcon.Response, patrol_id: str):
        store = PatrolsStore(get_driver())
        patrol = await store.get(patrol_id)
        if not patrol:
            raise falcon.HTTPNotFound()
        await store.delete(patrol_id)
        resp.status = falcon.HTTP_204
