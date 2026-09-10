/**
 * Provides patrol-related API operations.
 *
 * Patrols are event-scoped. The event ID must be supplied
 * explicitly by the caller. Event selection is managed by
 * EventContext and is not handled by this service.
 */
export default class PatrolService {

    constructor(transport) {

        this.transport = transport;

    }

    /**
     * Gets a patrol by UUID.
     *
     * @param {string} eventId
     *     ID of the event the patrol belongs to.
     *
     * @param {string} patrolId
     *     UUID of the patrol.
     *
     * @returns {Promise<Object>}
     *     Patrol object.
     */
    async getPatrol(
        arg1,
        arg2
    ) {

        const patrolId = arg2 ?? arg1;

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
     * @param {string} eventId
     *     ID of the event whose patrols should be returned.
     *
     * @returns {Promise<Object[]>}
     *     Array of patrol objects.
     */
    async getPatrols(
        eventId = null
    ) {

        const resolvedEventId =
            eventId ??
            (this.userService ? (this.userService.eventId || null) : null);

        const query = resolvedEventId ? `?event=${encodeURIComponent(resolvedEventId)}` : "";

        return await this.transport.get(
            `/patrols${query}`
        );

    }

    /**
     * Creates a patrol for an event.
     *
     * @param {string} eventId
     *     ID of the event the patrol belongs to.
     *
     * @param {Object} patrol
     *     Patrol data.
     *
     * @param {string} patrol.name
     *     Name of the patrol.
     *
     * @param {Object[]} [patrol.members=[]]
     *     Members belonging to the patrol.
     *
     * @returns {Promise<Object>}
     *     Created patrol object.
     */
    async createPatrol(
        eventId,
        patrol
    ) {

        if (!eventId) {

            throw new Error(
                "An event ID is required."
            );

        }

        if (!patrol) {

            throw new Error(
                "Patrol data is required."
            );

        }

        return await this.transport.post(
            "/patrols",
            {
                ...patrol,
                eventId
            }
        );

    }

    /**
     * Updates a patrol.
     *
     * @param {string} arg1
     *     ID of the event OR UUID of the patrol.
     *
     * @param {string|Object} arg2
     *     UUID of the patrol OR patrol data.
     *
     * @param {Object} [arg3]
     *     Updated patrol data.
     *
     * @returns {Promise<Object>}
     *     Updated patrol object.
     */
    async updatePatrol(
        arg1,
        arg2,
        arg3
    ) {

        let eventId = null;
        let patrolId = null;
        let patrol = null;

        if (arg3 !== undefined) {
            eventId = arg1;
            patrolId = arg2;
            patrol = arg3;
        } else {
            patrolId = arg1;
            patrol = arg2;
        }

        if (!patrolId) {

            throw new Error(
                "A patrol ID is required."
            );

        }

        if (!patrol) {

            throw new Error(
                "Patrol data is required."
            );

        }

        return await this.transport.put(
            `/patrols/${patrolId}`,
            {
                ...patrol,
                ...(eventId ? { eventId } : {})
            }
        );

    }

    /**
     * Deletes a patrol.
     *
     * @param {string} eventId
     *     ID of the event the patrol belongs to.
     *
     * @param {string} patrolId
     *     UUID of the patrol to delete.
     *
     * @returns {Promise<null>}
     *     Null on successful deletion.
     */
    async deletePatrol(
        patrolId
    ) {

        if (!patrolId) {

            throw new Error(
                "A patrol ID is required."
            );

        }

        return await this.transport.delete(
            `/patrols/${patrolId}`
        );

    }

}