import falcon
from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.patrols import PatrolsStore
from nightrunner_backend.drivers.store.events import EventsStore
from nightrunner_backend.reports_patrol_pdf import generate_patrol_qr_pdf


class EventPatrolsPdfReportResource:
    """GET /v1/reports/events/{eventId}/patrols-pdf
    Returns a portrait PDF file containing 1 page per patrol with QR code, patrol info, and roster table.
    """

    async def on_get(self, req: falcon.Request, resp: falcon.Response, eventId: str):
        driver = get_driver()
        patrols_store = PatrolsStore(driver)
        events_store = EventsStore(driver)

        event = await events_store.get(eventId)
        event_name = event.name if event else "Event Patrol Badges"

        patrols = await patrols_store.list(event_id=eventId)
        pdf_bytes = generate_patrol_qr_pdf(patrols, event_name=event_name)

        resp.content_type = "application/pdf"
        resp.append_header(
            "Content-Disposition",
            f'inline; filename="event-{eventId}-patrols.pdf"'
        )
        resp.data = pdf_bytes
        resp.status = falcon.HTTP_200
