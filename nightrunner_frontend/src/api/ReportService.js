import BackendTransport from "./BackendTransport.js";

export default class ReportService {

    async getEventReport(eventId) {

        if (!eventId) {
            throw new Error(
                "An event ID is required."
            );
        }

        return await BackendTransport.get(
            `/reports/events/${eventId}`
        );

    }

    async getStationReport(
        stationId,
        eventId
    ) {

        if (!stationId) {
            throw new Error(
                "A station ID is required."
            );
        }

        if (!eventId) {
            throw new Error(
                "An event ID is required."
            );
        }

        return await BackendTransport.get(
            `/reports/stations/${stationId}?eventId=${encodeURIComponent(eventId)}`
        );

    }

}