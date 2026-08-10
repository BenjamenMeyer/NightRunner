import falcon
import uuid6
from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.events import EventsStore
from nightrunner_backend.models.event import Event


class EventsResource:
    """Handles /v1/events"""

    async def on_get(self, req: falcon.Request, resp: falcon.Response):
        store = EventsStore(get_driver())
        events = await store.list()
        resp.media = [e.to_api_dict() for e in events]

    async def on_post(self, req: falcon.Request, resp: falcon.Response):
        store = EventsStore(get_driver())
        data = await req.get_media()
        event = Event(
            id=str(uuid6.uuid7()),
            name=data["name"],
            date=data.get("date"),
            description=data.get("description"),
            rounding_precision=data.get("roundingPrecision", 1000),
            organizers=data.get("organizers", []),
            stations=data.get("stations", []),
            patrols=data.get("patrols", []),
        )
        await store.create(event)
        resp.status = falcon.HTTP_201
        resp.media = event.to_api_dict()


class EventResource:
    """Handles /v1/events/{event_id}"""

    async def on_get(self, req: falcon.Request, resp: falcon.Response, event_id: str):
        store = EventsStore(get_driver())
        event = await store.get(event_id)
        if not event:
            raise falcon.HTTPNotFound()
        resp.media = event.to_api_dict()

    async def on_put(self, req: falcon.Request, resp: falcon.Response, event_id: str):
        store = EventsStore(get_driver())
        event = await store.get(event_id)
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
        await store.update(event)
        resp.media = event.to_api_dict()

    async def on_delete(self, req: falcon.Request, resp: falcon.Response, event_id: str):
        store = EventsStore(get_driver())
        event = await store.get(event_id)
        if not event:
            raise falcon.HTTPNotFound()
        await store.delete(event_id)
        resp.status = falcon.HTTP_204
