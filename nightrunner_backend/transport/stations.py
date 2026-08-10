import falcon
import uuid6
from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.stations import StationsStore
from nightrunner_backend.models.station import Station


class StationsResource:
    """Handles /v1/stations"""

    async def on_get(self, req: falcon.Request, resp: falcon.Response):
        store = StationsStore(get_driver())
        stations = await store.list()
        resp.media = [s.to_api_dict() for s in stations]

    async def on_post(self, req: falcon.Request, resp: falcon.Response):
        store = StationsStore(get_driver())
        data = await req.get_media()
        station = Station(
            id=str(uuid6.uuid7()),
            name=data.get("name", ""),
            description=data.get("description"),
            active_configuration_id=data.get("activeConfigurationId"),
            members=data.get("members", []),
        )
        await store.create(station)
        resp.status = falcon.HTTP_201
        resp.media = station.to_api_dict()


class StationResource:
    """Handles /v1/stations/{stationId}"""

    async def on_get(self, req: falcon.Request, resp: falcon.Response, stationId: str):
        store = StationsStore(get_driver())
        station = await store.get(stationId)
        if not station:
            raise falcon.HTTPNotFound()
        resp.media = station.to_api_dict()

    async def on_put(self, req: falcon.Request, resp: falcon.Response, stationId: str):
        store = StationsStore(get_driver())
        station = await store.get(stationId)
        if not station:
            raise falcon.HTTPNotFound()
        data = await req.get_media()
        station.name = data.get("name", station.name)
        station.description = data.get("description", station.description)
        station.active_configuration_id = data.get("activeConfigurationId", station.active_configuration_id)
        station.members = data.get("members", station.members)
        await store.update(station)
        resp.media = station.to_api_dict()

    async def on_delete(self, req: falcon.Request, resp: falcon.Response, stationId: str):
        store = StationsStore(get_driver())
        station = await store.get(stationId)
        if not station:
            raise falcon.HTTPNotFound()
        await store.delete(stationId)
        resp.status = falcon.HTTP_204
