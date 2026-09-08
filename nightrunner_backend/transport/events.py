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
        if not isinstance(data, dict):
            raise falcon.HTTPBadRequest(description="Request body must be a JSON object.")
        name = data.get("name")
        if not name:
            raise falcon.HTTPBadRequest(description="'name' is required.")
        date = data.get("date")
        description = data.get("description")
        rounding_precision_val = data.get("roundingPrecision")
        if rounding_precision_val is not None:
            if isinstance(rounding_precision_val, (dict, list)):
                raise falcon.HTTPBadRequest(description="'roundingPrecision' must be an integer.")
            try:
                rounding_precision = int(rounding_precision_val)
                if not (-9223372036854775808 <= rounding_precision <= 9223372036854775807):
                    raise falcon.HTTPBadRequest(description="'roundingPrecision' is out of bounds.")
            except (ValueError, TypeError):
                raise falcon.HTTPBadRequest(description="'roundingPrecision' must be an integer.")

        else:
            rounding_precision = 1000

        orgs_data = data.get("organizers", [])
        stats_data = data.get("stations", [])
        pats_data = data.get("patrols", [])

        if not isinstance(orgs_data, list):
            raise falcon.HTTPBadRequest(description="'organizers' must be a list.")
        if not isinstance(stats_data, list):
            raise falcon.HTTPBadRequest(description="'stations' must be a list.")
        if not isinstance(pats_data, list):
            raise falcon.HTTPBadRequest(description="'patrols' must be a list.")

        # Filter out non-strings, convert to string, deduplicate keeping order
        orgs = list(dict.fromkeys(str(x) for x in orgs_data if x is not None and not isinstance(x, (dict, list))))
        stats = list(dict.fromkeys(str(x) for x in stats_data if x is not None and not isinstance(x, (dict, list))))
        pats = list(dict.fromkeys(str(x) for x in pats_data if x is not None and not isinstance(x, (dict, list))))

        theme_val = data.get("theme", "night-ops")
        theme = str(theme_val) if theme_val else "night-ops"

        event = Event(
            id=str(uuid6.uuid7()),
            name=str(name),
            date=str(date) if date is not None and not isinstance(date, str) else date,
            description=str(description) if description is not None and not isinstance(description, str) else description,
            rounding_precision=rounding_precision,
            theme=theme,
            organizers=orgs,
            stations=stats,
            patrols=pats,
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
        event.theme = data.get("theme", event.theme)
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
