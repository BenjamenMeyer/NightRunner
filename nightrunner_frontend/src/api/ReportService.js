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

    async patchScore(scoreId, payload) {

        if (!scoreId) {
            throw new Error(
                "A score ID is required."
            );
        }

        return await BackendTransport.patch(
            `/scores/${scoreId}`,
            payload
        );

    }

    getPatrolsPdfUrl(eventId) {

        if (!eventId) {
            return "";
        }

        const baseUrl = BackendTransport.defaults.baseURL || "";
        return `${baseUrl}/reports/events/${eventId}/patrols-pdf`;

    }

}