import falcon
import uuid6
from typing import Any, Dict
from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.events_store import EventsStore
from nightrunner_backend.models.event import Event

class EventsResource:
    """
    Handles /events
    """
    def __init__(self):
        self.store = EventsStore(get_driver())

    async def on_get(self, req: falcon.Request, resp: falcon.Response):
        events = await self.store.list()
        resp.media = [self._to_dict(e) for e in events]

    async def on_post(self, req: falcon.Request, resp: falcon.Response):
        data = await req.get_media()
        event_id = str(uuid6.uuid7())
        event = Event(
            id=event_id,
            name=data["name"],
            date=data.get("date"),
            description=data.get("description"),
            rounding_precision=data.get("roundingPrecision", 1000),
            organizers=data.get("organizers", []),
            stations=data.get("stations", []),
            patrols=data.get("patrols", [])
        )
        await self.store.create(event)
        resp.status = falcon.HTTP_201
        resp.media = self._to_dict(event)

    def _to_dict(self, event: Event) -> Dict[str, Any]:
        return {
            "id": event.id,
            "name": event.name,
            "date": event.date,
            "description": event.description,
            "roundingPrecision": event.rounding_precision,
            "organizers": event.organizers,
            "stations": event.stations,
            "patrols": event.patrols
        }

class EventResource:
    """
    Handles /events/{event_id}
    """
    def __init__(self):
        self.store = EventsStore(get_driver())

    async def on_get(self, req: falcon.Request, resp: falcon.Response, event_id: str):
        event = await self.store.get(event_id)
        if not event:
            raise falcon.HTTPNotFound()
        resp.media = self._to_dict(event)

    async def on_put(self, req: falcon.Request, resp: falcon.Response, event_id: str):
        event = await self.store.get(event_id)
        if not event:
            raise falcon.HTTPNotFound()
        
        data = await req.get_media()
        event.name = data.get("name", event.name)
        event.date = data.get("date", event.date)
        event.description = data.get("description", event.description)
        event.rounding_precision = data.get("roundingPrecision", event.rounding_precision)
        event.organizers = data.get("organizers", event.organizers)
        event.stations = data.get("stations", event.stations)
        event.patrols = data.get("patrols", event.patrols)
        
        await self.store.update(event)
        resp.media = self._to_dict(event)

    async def on_delete(self, req: falcon.Request, resp: falcon.Response, event_id: str):
        event = await self.store.get(event_id)
        if not event:
            raise falcon.HTTPNotFound()
        await self.store.delete(event_id)
        resp.status = falcon.HTTP_204

    def _to_dict(self, event: Event) -> Dict[str, Any]:
        return {
            "id": event.id,
            "name": event.name,
            "date": event.date,
            "description": event.description,
            "roundingPrecision": event.rounding_precision,
            "organizers": event.organizers,
            "stations": event.stations,
            "patrols": event.patrols
        }
