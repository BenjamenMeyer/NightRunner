/**
 * Provides patrol-related API operations.
 *
 * Patrols are event-scoped. When no event ID is supplied,
 * the current user's assigned event is used.
 */
export default class PatrolService {

    constructor(transport, userService) {

        this.transport = transport;
        this.userService = userService;

    }

    /**
     * Gets a patrol by UUID.
     *
     * @param {string} patrolId
     * @returns {Promise<Object>} Patrol object.
     */
    async getPatrol(patrolId) {

        if (!patrolId) {

            throw new Error(
                "A patrol ID is required."
            );

        }

        return await this.transport.get(
            `/patrols/${patrolId}`
        );

    }

    /**
     * Gets all patrols for an event.
     *
     * If eventId is omitted, the current user's event
     * is used.
     *
     * @param {string|null} eventId
     * @returns {Promise<Object[]>} Array of patrol objects.
     */
    async getPatrols(eventId = null) {

        const resolvedEventId =
            eventId ??
            this.userService.getEventId();

        if (!resolvedEventId) {

            throw new Error(
                "No event is currently selected."
            );

        }

        return await this.transport.get(
            `/patrols?event=${resolvedEventId}`
        );

    }

    /**
     * Creates a patrol for an event.
     *
     * If eventId is omitted, the current user's event
     * is used.
     *
     * @param {Object} patrol
     * @param {string|null} eventId
     * @returns {Promise<Object>} Created patrol object.
     */
    async createPatrol(patrol, eventId = null) {

        const resolvedEventId =
            eventId ??
            this.userService.getEventId();

        if (!resolvedEventId) {

            throw new Error(
                "No event is currently selected."
            );

        }

        return await this.transport.post(
            "/patrols",
            {
                ...patrol,
                event: resolvedEventId
            }
        );

    }

    /**
     * Updates a patrol.
     *
     * @param {string} patrolId
     * @param {Object} patrol
     * @returns {Promise<Object>} Updated patrol object.
     */
    async updatePatrol(patrolId, patrol) {

        return await this.transport.put(
            `/patrols/${patrolId}`,
            patrol
        );

    }

    /**
     * Deletes a patrol.
     *
     * @param {string} patrolId
     * @returns {Promise<null>} Null on success.
     */
    async deletePatrol(patrolId) {

        return await this.transport.delete(
            `/patrols/${patrolId}`
        );

    }

}