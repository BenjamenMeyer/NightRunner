import BackendTransport from "./BackendTransport";

const USER_KEY = "night-runner-user";

/**
 * @typedef {Object} User
 *
 * @property {string} id
 * @property {string} username
 * @property {string} role
 * @property {string|null} event
 */

export default class UserService {

    //
    // Local application user
    //

    get() {

        const value =
            localStorage.getItem(USER_KEY);

        return value
            ? JSON.parse(value)
            : null;

    }


    set(user) {

        localStorage.setItem(
            USER_KEY,
            JSON.stringify(user)
        );

    }


    clear() {

        localStorage.removeItem(
            USER_KEY
        );

    }


    //
    // Current User
    //

    /**
     * Gets the current user's role.
     *
     * @returns {string|null}
     */
    getRole() {

        return this.get()?.role ?? null;

    }


    /**
     * Gets the UUID of the current user's event.
     *
     * @returns {string|null}
     */
    getEventId() {

        return this.get()?.event ?? null;

    }


    //
    // Permissions
    //

    isSystemAdmin() {

        return this.getRole() === "admin";

    }


    isEventAdmin() {

        return this.getRole() === "event-admin";

    }


    isAdmin() {

        return (
            this.isSystemAdmin() ||
            this.isEventAdmin()
        );

    }


    isUser() {

        return this.getRole() === "user";

    }


    hasEvent() {

        return this.getEventId() !== null;

    }


    //
    // User Management
    //

    async getUsers() {

        return await BackendTransport.get(
            "/users"
        );

    }


    async getUser(userId) {

        return await BackendTransport.get(
            `/users/${userId}`
        );

    }


    async createUser(user) {

        return await BackendTransport.post(
            "/users",
            user
        );

    }


    async updateUser(userId, user) {

        return await BackendTransport.put(
            `/users/${userId}`,
            user
        );

    }


    async deleteUser(userId) {

        return await BackendTransport.delete(
            `/users/${userId}`
        );

    }


    async setRole(userId, role) {

        return await this.updateUser(
            userId,
            { role }
        );

    }


    async setEvent(userId, eventId) {

        return await this.updateUser(
            userId,
            {
                event: eventId
            }
        );

    }


    async updateUserAccess(
        userId,
        role,
        eventId
    ) {

        return await this.updateUser(
            userId,
            {
                role,
                event: eventId
            }
        );

    }

}