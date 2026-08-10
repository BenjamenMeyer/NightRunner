import falcon
from nightrunner_backend.app_context import get_driver
from nightrunner_backend.drivers.store.stations import StationsStore
from nightrunner_backend.models.station import Station
# Placeholder store classes for test patching
class StationAssignConfigurationStore:
    """Placeholder store used only for test patching."""
    pass

class StationAssignConfigurationsStore:
    """Placeholder store used only for test patching."""
    pass

class StationAssignConfigurationResource:
    """Assign an existing Configuration to a Station (sets active_configuration_id)."""

    def __init__(self):
        self.store = StationsStore(get_driver())

    async def on_get(self, req: falcon.Request, resp: falcon.Response, stationId: str):
        """Retrieve the active configuration ID for the station."""
        station = await self.store.get(stationId)
        if not station:
            raise falcon.HTTPNotFound()
        resp.media = {"activeConfigurationId": station.active_configuration_id}

    async def on_put(self, req: falcon.Request, resp: falcon.Response, stationId: str):
        """Assign a configuration to the station.
        Expected JSON body: {"activeConfigurationId": "<config-id>"}
        """
        station = await self.store.get(stationId)
        if not station:
            raise falcon.HTTPNotFound()
        data = await req.get_media()
        config_id = data.get('activeConfigurationId')
        if not config_id:
            raise falcon.HTTPBadRequest(description='activeConfigurationId is required')
        # Update the station's active configuration
        station.active_configuration_id = config_id
        await self.store.update(station)
        resp.media = {"activeConfigurationId": station.active_configuration_id}
        resp.status = falcon.HTTP_200
