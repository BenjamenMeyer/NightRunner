/**
 * Provides event-related API operations.
 *
 * Event selection is managed by EventContext. This service
 * only performs API operations against event resources.
 */
export default class EventService {

    constructor(transport) {

        this.transport = transport;

    }

    /**
     * Gets an event by UUID.
     *
     * @param {string} eventId
     * @returns {Promise<Object>} Event object.
     */
    async getEvent(eventId) {

        if (!eventId) {

            throw new Error(
                "An event ID is required."
            );

        }

        return await this.transport.get(
            `/events/${eventId}`
        );

    }

    /**
     * Gets all events available to the current user.
     *
     * The backend is responsible for determining which
     * events the authenticated user may access.
     *
     * @returns {Promise<Object[]>} Array of event objects.
     */
    async getEvents() {

        return await this.transport.get(
            "/events"
        );

    }

    /**
     * Updates an event.
     *
     * @param {string} eventId
     * @param {Object} event
     * @returns {Promise<Object>} Updated event object.
     */
    async updateEvent(eventId, event) {

        if (!eventId) {

            throw new Error(
                "An event ID is required."
            );

        }

        return await this.transport.put(
            `/events/${eventId}`,
            event
        );

    }

    /**
     * Creates a new event.
     *
     * @param {Object} event
     * @returns {Promise<Object>} Created event object.
     */
    async createEvent(event) {

        return await this.transport.post(
            "/events",
            event
        );
    }


    /**
     * Deletes an event.
     *
     * @param {string} eventId
     * @returns {Promise<void>}
     */
    async deleteEvent(eventId) {
        if (!eventId) {
            throw new Error( "An event ID is required." );
        }
        return await this.transport.delete( `/events/${eventId}` );
    }
}