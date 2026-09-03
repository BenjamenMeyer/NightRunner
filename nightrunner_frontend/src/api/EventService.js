/**
 * Provides event-related API operations.
 *
 * This service is responsible for resolving the current event
 * from the authenticated user's event UUID when no event is
 * explicitly supplied.
 */
export default class EventService {

    constructor(transport, userService) {

        this.transport = transport;
        this.userService = userService;

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
     * Gets the event currently assigned to the
     * authenticated user.
     *
     * The user's event UUID is used automatically.
     *
     * @returns {Promise<Object>} Current event object.
     */
    async getCurrentEvent() {

        const user = this.userService.getUser();

        if (!user) {

            throw new Error(
                "Unable to determine the current user."
            );

        }

        if (!user.event) {

            throw new Error(
                "No event is currently selected."
            );

        }

        return await this.getEvent(user.event);

    }

    /**
     * Gets all events available to the current user.
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

}