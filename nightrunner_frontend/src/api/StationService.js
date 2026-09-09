/**
 * Provides station-related API operations.
 *
 * Stations are event-scoped. When no event ID is supplied,
 * the current user's assigned event is used.
 */
export default class StationService {

    constructor(transport, userService) {

        this.transport = transport;
        this.userService = userService;
    }

    /**
     * Gets a station by UUID.
     *
     * @param {string} stationId
     * @returns {Promise<Object>} Station object.
     */
    async getStation(stationId) {

        if (!stationId) {

            throw new Error(
                "A station ID is required."
            );

        }

        return await this.transport.get(
            `/stations/${stationId}`
        );

    }

    /**
     * Gets all stations for an event.
     *
     * If eventId is omitted, the current user's event
     * is used.
     *
     * @param {string|null} eventId
     * @returns {Promise<Object[]>} Array of station objects.
     */
    async getStations(eventId = null) {

        const resolvedEventId =
            eventId ??
            (this.userService ? (this.userService.eventId || null) : null);

        const query = resolvedEventId ? `?event=${encodeURIComponent(resolvedEventId)}` : "";

        return await this.transport.get(
            `/stations${query}`
        );

    }

    /**
     * Creates a station for an event.
     *
     * If eventId is omitted, the current user's event
     * is used.
     *
     * @param {Object} station
     * @param {string|null} eventId
     * @returns {Promise<Object>} Created station object.
     */
    async createStation(station, eventId = null) {

        const resolvedEventId =
            eventId ??
            station.eventId ??
            (this.userService ? (this.userService.eventId || null) : null);

        return await this.transport.post(
            "/stations",
            {
                ...station,
                ...(resolvedEventId ? { eventId: resolvedEventId } : {})
            }
        );

    }

    /**
     * Updates a station.
     *
     * @param {string} stationId
     * @param {Object} station
     * @returns {Promise<Object>} Updated station object.
     */
    async updateStation(stationId, station) {

        return await this.transport.put(
            `/stations/${stationId}`,
            station
        );

    }

    /**
     * Deletes a station.
     *
     * @param {string} stationId
     * @returns {Promise<null>} Null on success.
     */
    async deleteStation(stationId) {

        return await this.transport.delete(
            `/stations/${stationId}`
        );

    }

}