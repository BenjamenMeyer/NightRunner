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
        if not isinstance(data, dict):
            raise falcon.HTTPBadRequest(description="Request body must be a JSON object.")
        name = data.get("name") or ""
        description = data.get("description")
        active_config_id = data.get("activeConfigurationId")
        event_id = data.get("eventId")
        station = Station(
            id=str(uuid6.uuid7()),
            event_id=str(event_id) if event_id is not None and not isinstance(event_id, str) else event_id,
            name=str(name),
            description=str(description) if description is not None and not isinstance(description, str) else description,
            active_configuration_id=str(active_config_id) if active_config_id is not None and not isinstance(active_config_id, str) else active_config_id,
            members=data.get("members", []),
            tasks=data.get("tasks", []),
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
        if "tasks" in data:
            station.tasks = data.get("tasks", [])
        if "eventId" in data:
            station.event_id = data.get("eventId")
        await store.update(station)
        resp.media = station.to_api_dict()

    async def on_delete(self, req: falcon.Request, resp: falcon.Response, stationId: str):
        store = StationsStore(get_driver())
        station = await store.get(stationId)
        if not station:
            raise falcon.HTTPNotFound()
        await store.delete(stationId)
        resp.status = falcon.HTTP_204
