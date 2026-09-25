import BackendTransport from "./BackendTransport.js";

/**
 * Attendee roster operations: troops, event attendees, sheet import, and
 * gate arrivals.
 *
 * "Arrivals" here means a person reaching the gate. It is deliberately
 * distinct from CheckInService, which records a patrol reaching a station.
 */
export default class RosterService {

    constructor(transport = BackendTransport) {
        this.transport = transport;
    }

    //
    // Troops
    //

    /**
     * Lists troops. Troops are shared across events, so pass an eventId to
     * get only the troops with attendees in that event.
     *
     * @param {string} [eventId]
     */
    async listTroops(eventId = null) {
        const query = eventId ? `?eventId=${encodeURIComponent(eventId)}` : "";
        const result = await this.transport.get(`/troops${query}`);
        return result?.troops ?? [];
    }

    async addTroop(number, name = "") {
        return await this.transport.post("/troops", { number, name });
    }

    //
    // Attendees
    //

    /**
     * Lists attendees for an event.
     *
     * @param {string} eventId
     * @param {{troopId?: string, category?: string, q?: string}} [filters]
     * @returns {Promise<Array>}
     */
    async listAttendees(eventId, filters = {}) {

        if (!eventId) {
            throw new Error("An event ID is required.");
        }

        const params = new URLSearchParams();
        if (filters.troopId) params.set("troopId", filters.troopId);
        if (filters.category) params.set("category", filters.category);
        if (filters.q) params.set("q", filters.q);

        const query = params.toString();
        const result = await this.transport.get(
            `/events/${encodeURIComponent(eventId)}/attendees${query ? `?${query}` : ""}`
        );
        return result?.attendees ?? [];
    }

    /**
     * Youth eligible to join a patrol, for one troop.
     *
     * Filters on the exact category "Youth". "Non-participant Youth" contains
     * the word Youth but must never be offered for a patrol, so this must not
     * become a substring match.
     */
    async listPatrolEligibleYouth(eventId, troopId) {

        if (!troopId) {
            throw new Error("A troop ID is required.");
        }

        return await this.listAttendees(eventId, {
            troopId,
            category: "Youth"
        });
    }

    async searchAttendees(eventId, query) {
        return await this.listAttendees(eventId, { q: query });
    }

    async addAttendee(eventId, attendee) {
        if (!eventId) {
            throw new Error("An event ID is required.");
        }
        return await this.transport.post(
            `/events/${encodeURIComponent(eventId)}/attendees`,
            attendee
        );
    }

    async removeAttendee(eventId, attendeeId) {
        return await this.transport.delete(
            `/events/${encodeURIComponent(eventId)}/attendees/${encodeURIComponent(attendeeId)}`
        );
    }

    async updateAttendee(eventId, attendeeId, attendeeData) {
        if (!eventId || !attendeeId) {
            throw new Error("Event ID and Attendee ID are required.");
        }
        return await this.transport.put(
            `/events/${encodeURIComponent(eventId)}/attendees/${encodeURIComponent(attendeeId)}`,
            attendeeData
        );
    }

    async updateAttendeeStatus(eventId, attendeeId, status, statusNote = null) {
        return await this.transport.patch(
            `/events/${encodeURIComponent(eventId)}/attendees/${encodeURIComponent(attendeeId)}/status`,
            { status, statusNote }
        );
    }

    //
    // Sheet import
    //

    /**
     * Sorts parsed sheet rows into buckets. Writes nothing.
     *
     * @returns {Promise<Object>} plan with rows, missingFromSheet, counts and
     * troopHeadcounts.
     */
    async previewImport(eventId, rows) {
        return await this.transport.post(
            `/events/${encodeURIComponent(eventId)}/roster/preview`,
            { rows }
        );
    }

    /**
     * Applies operator-approved rows. Idempotent.
     */
    async applyImport(eventId, rows) {
        return await this.transport.post(
            `/events/${encodeURIComponent(eventId)}/roster/apply`,
            { rows }
        );
    }

    //
    // Arrivals
    //

    /**
     * Per-troop arrival summary plus the full attendee list for each troop.
     */
    async getArrivals(eventId) {
        if (!eventId) {
            throw new Error("An event ID is required.");
        }
        return await this.transport.get(
            `/events/${encodeURIComponent(eventId)}/arrivals`
        );
    }

    /**
     * Records an arrival.
     *
     * Omit arrivedAt for the normal case — the server stamps the current time.
     * Pass it only when back-filling from a paper sheet, so people are not all
     * stamped with the moment they were typed in.
     */
    async recordArrival(eventId, attendeeId, arrivedAt = null) {
        const body = { attendeeId };
        if (arrivedAt) {
            body.arrivedAt = arrivedAt;
        }
        return await this.transport.post(
            `/events/${encodeURIComponent(eventId)}/arrivals`,
            body
        );
    }

    /**
     * Undoes an arrival.
     */
    async clearArrival(eventId, attendeeId) {
        return await this.transport.delete(
            `/events/${encodeURIComponent(eventId)}/arrivals/${encodeURIComponent(attendeeId)}`
        );
    }
}
