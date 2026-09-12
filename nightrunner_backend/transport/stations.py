import falcon
import uuid6
from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.stations import StationsStore
from nightrunner_backend.models.station import Station


class StationsResource:
    """Handles /v1/stations"""

    async def on_get(self, req: falcon.Request, resp: falcon.Response):
        store = StationsStore(get_driver())
        event_id = req.params.get("event") or req.params.get("eventId")
        if not event_id:
            raise falcon.HTTPBadRequest(description="An 'event' or 'eventId' query parameter is required.")
        stations = await store.list(event_id=event_id)
        resp.media = [s.to_api_dict() for s in stations]

    async def on_post(self, req: falcon.Request, resp: falcon.Response):
        store = StationsStore(get_driver())
        data = await req.get_media()
        if not isinstance(data, dict):
            raise falcon.HTTPBadRequest(description="Request body must be a JSON object.")
        event_id = data.get("eventId")
        if not event_id:
            raise falcon.HTTPBadRequest(description="'eventId' is required when creating a station.")
        name = data.get("name") or ""
        description = data.get("description")
        active_config_id = data.get("activeConfigurationId")
        stationWeight = data.get("stationWeight", 1.0)
        station = Station(
            id=str(uuid6.uuid7()),
            event_id=str(event_id) if event_id is not None and not isinstance(event_id, str) else event_id,
            name=str(name),
            description=str(description) if description is not None and not isinstance(description, str) else description,
            active_configuration_id=str(active_config_id) if active_config_id is not None and not isinstance(active_config_id, str) else active_config_id,
            station_weight=float(stationWeight) if stationWeight is not None else 1.0,
            members=data.get("members", []),
            tasks=data.get("tasks", []),
        )
        try:
            await store.create(station)
        except Exception as e:
            if "foreign key" in str(e).lower() or "fk" in str(e).lower():
                raise falcon.HTTPBadRequest(
                    title="Invalid Event ID",
                    description=f"Event ID '{event_id}' does not exist."
                )
            raise
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
        if "description" in data:
            desc_val = data.get("description")
            station.description = str(desc_val) if desc_val is not None else None
        if "activeConfigurationId" in data:
            cfg_val = data.get("activeConfigurationId")
            station.active_configuration_id = str(cfg_val) if cfg_val is not None else None
        if "members" in data:
            station.members = data.get("members", station.members)
        if "stationWeight" in data:
            weight_val = data.get("stationWeight")
            station.station_weight = float(weight_val) if weight_val is not None else 1.0
        if "tasks" in data:
            station.tasks = data.get("tasks", [])
        if "eventId" in data:
            evt_val = data.get("eventId")
            station.event_id = str(evt_val) if evt_val is not None else station.event_id
        await store.update(station)
        resp.media = station.to_api_dict()

    async def on_delete(self, req: falcon.Request, resp: falcon.Response, stationId: str):
        store = StationsStore(get_driver())
        station = await store.get(stationId)
        if not station:
            raise falcon.HTTPNotFound()
        await store.delete(stationId)
        resp.status = falcon.HTTP_204
