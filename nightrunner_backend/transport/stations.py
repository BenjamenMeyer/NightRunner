import falcon
import uuid6
from typing import Any, Dict
from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.stations import StationsStore
from nightrunner_backend.models.station import Station

class StationsResource:
    """Handles /stations"""
    def __init__(self):
        self.store = StationsStore(get_driver())

    async def on_get(self, req: falcon.Request, resp: falcon.Response):
        stations = await self.store.list()
        resp.media = [self._to_dict(s) for s in stations]

    async def on_post(self, req: falcon.Request, resp: falcon.Response):
        data = await req.get_media()
        station_id = str(uuid6.uuid7())
        station = Station(
            id=station_id,
            name=data.get('name', ''),
            description=data.get('description'),
            active_configuration_id=data.get('activeConfigurationId'),
            members=data.get('members', [])
        )
        await self.store.create(station)
        resp.status = falcon.HTTP_201
        resp.media = self._to_dict(station)

    def _to_dict(self, station: Station) -> Dict[str, Any]:
        return {
            'id': station.id,
            'name': station.name,
            'description': station.description,
            'activeConfigurationId': station.active_configuration_id,
            'members': station.members,
        }

class StationResource:
    """Handles /stations/{stationId}"""
    def __init__(self):
        self.store = StationsStore(get_driver())

    async def on_get(self, req: falcon.Request, resp: falcon.Response, stationId: str):
        station = await self.store.get(stationId)
        if not station:
            raise falcon.HTTPNotFound()
        resp.media = self._to_dict(station)

    async def on_put(self, req: falcon.Request, resp: falcon.Response, stationId: str):
        station = await self.store.get(stationId)
        if not station:
            raise falcon.HTTPNotFound()
        data = await req.get_media()
        station.name = data.get('name', station.name)
        station.description = data.get('description', station.description)
        station.active_configuration_id = data.get('activeConfigurationId', station.active_configuration_id)
        station.members = data.get('members', station.members)
        await self.store.update(station)
        resp.media = self._to_dict(station)

    async def on_delete(self, req: falcon.Request, resp: falcon.Response, stationId: str):
        station = await self.store.get(stationId)
        if not station:
            raise falcon.HTTPNotFound()
        await self.store.delete(stationId)
        resp.status = falcon.HTTP_204

    def _to_dict(self, station: Station) -> Dict[str, Any]:
        return {
            'id': station.id,
            'name': station.name,
            'description': station.description,
            'activeConfigurationId': station.active_configuration_id,
            'members': station.members,
        }
