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


    /**
     * Lists the public links for an event.
     *
     * Metadata only — the backend never returns the token itself, so a link
     * that has been lost has to be revoked and reissued.
     *
     * @param {string} eventId
     * @param {string|null} scope "progress", "checkin", or null for both.
     * @returns {Promise<Object>} { eventId, tokens: [] }
     */
    async getAccessTokens(eventId, scope = null) {

        if (!eventId) {
            throw new Error("An event ID is required.");
        }

        const query =
            scope
                ? `?scope=${encodeURIComponent(scope)}`
                : "";

        return await this.transport.get(
            `/events/${eventId}/access-tokens${query}`
        );

    }


    /**
     * Mints a new public link.
     *
     * The response carries the plaintext token exactly once. It cannot be
     * retrieved again afterwards.
     *
     * @param {string} eventId
     * @param {Object} options { scope, label, expiresAt, stationId }
     * @returns {Promise<Object>} Token metadata plus the one-time `token`.
     */
    async createAccessToken(eventId, options) {

        if (!eventId) {
            throw new Error("An event ID is required.");
        }

        return await this.transport.post(
            `/events/${eventId}/access-tokens`,
            options
        );

    }


    /**
     * Revokes a public link. The record is kept so the audit trail survives.
     *
     * @param {string} eventId
     * @param {string} tokenId
     * @returns {Promise<Object>}
     */
    async revokeAccessToken(eventId, tokenId) {

        if (!eventId || !tokenId) {
            throw new Error("An event ID and token ID are required.");
        }

        return await this.transport.delete(
            `/events/${eventId}/access-tokens/${tokenId}`
        );

    }
}