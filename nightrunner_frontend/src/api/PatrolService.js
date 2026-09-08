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
        eventId,
        patrolId
    ) {

        if (!eventId) {

            throw new Error(
                "An event ID is required."
            );

        }

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
        eventId
    ) {

        if (!eventId) {

            throw new Error(
                "An event ID is required."
            );

        }

        return await this.transport.get(
            `/patrols?event=${encodeURIComponent(eventId)}`
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
     * @param {string} eventId
     *     ID of the event the patrol belongs to.
     *
     * @param {string} patrolId
     *     UUID of the patrol to update.
     *
     * @param {Object} patrol
     *     Updated patrol data.
     *
     * @param {string} [patrol.name]
     *     Updated patrol name.
     *
     * @param {Object[]} [patrol.members]
     *     Updated patrol members.
     *
     * @returns {Promise<Object>}
     *     Updated patrol object.
     */
    async updatePatrol(
        eventId,
        patrolId,
        patrol
    ) {

        if (!eventId) {

            throw new Error(
                "An event ID is required."
            );

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
                eventId
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