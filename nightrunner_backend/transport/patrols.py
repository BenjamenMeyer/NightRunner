import falcon
import uuid6
from typing import Any, Dict
from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.patrols_store import PatrolsStore
from nightrunner_backend.models.patrol import Patrol, PatrolMember

class PatrolsResource:
    """
    Handles /patrols
    """
    def __init__(self):
        self.store = PatrolsStore(get_driver())

    async def on_get(self, req: falcon.Request, resp: falcon.Response):
        patrols = await self.store.list()
        resp.media = [self._to_dict(p) for p in patrols]

    async def on_post(self, req: falcon.Request, resp: falcon.Response):
        data = await req.get_media()
        patrol_id = str(uuid6.uuid7())
        members_data = data.get("members", [])
        members = [
            PatrolMember(
                id=str(uuid6.uuid7()),
                name=m["name"],
                rank=m.get("rank"),
                troop=m.get("troop")
            ) for m in members_data
        ]
        patrol = Patrol(
            id=patrol_id,
            program_name=data["programName"],
            members=members
        )
        await self.store.create(patrol)
        resp.status = falcon.HTTP_201
        resp.media = self._to_dict(patrol)

    def _to_dict(self, patrol: Patrol) -> Dict[str, Any]:
        return {
            "id": patrol.id,
            "programName": patrol.program_name,
            "members": [
                {
                    "id": m.id,
                    "name": m.name,
                    "rank": m.rank,
                    "troop": m.troop
                } for m in patrol.members
            ]
        }

class PatrolResource:
    """
    Handles /patrols/{patrol_id}
    """
    def __init__(self):
        self.store = PatrolsStore(get_driver())

    async def on_get(self, req: falcon.Request, resp: falcon.Response, patrol_id: str):
        patrol = await self.store.get(patrol_id)
        if not patrol:
            raise falcon.HTTPNotFound()
        resp.media = self._to_dict(patrol)

    async def on_put(self, req: falcon.Request, resp: falcon.Response, patrol_id: str):
        patrol = await self.store.get(patrol_id)
        if not patrol:
            raise falcon.HTTPNotFound()
        
        data = await req.get_media()
        patrol.program_name = data.get("programName", patrol.program_name)
        
        if "members" in data:
            members_data = data["members"]
            patrol.members = [
                PatrolMember(
                    id=m.get("id") or str(uuid6.uuid7()),
                    name=m["name"],
                    rank=m.get("rank"),
                    troop=m.get("troop")
                ) for m in members_data
            ]
        
        await self.store.update(patrol)
        resp.media = self._to_dict(patrol)

    async def on_delete(self, req: falcon.Request, resp: falcon.Response, patrol_id: str):
        patrol = await self.store.get(patrol_id)
        if not patrol:
            raise falcon.HTTPNotFound()
        await self.store.delete(patrol_id)
        resp.status = falcon.HTTP_204

    def _to_dict(self, patrol: Patrol) -> Dict[str, Any]:
        return {
            "id": patrol.id,
            "programName": patrol.program_name,
            "members": [
                {
                    "id": m.id,
                    "name": m.name,
                    "rank": m.rank,
                    "troop": m.troop
                } for m in patrol.members
            ]
        }
