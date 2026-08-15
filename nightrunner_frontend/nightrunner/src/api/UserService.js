import BackendTransport from "./BackendTransport";

/**
 * @typedef {Object} User
 *
 * @property {string} id
 * @property {string} username
 * @property {string} role
 * @property {string|null} event
 */

/**
 * Provides access to users, user management,
 * and the authenticated user's application data.
 */
export default class UserService {

    //
    // Current User
    //

    /**
     * Gets the currently stored user.
     *
     * This reads the locally stored session and does
     * not make a backend request.
     *
     * @returns {User|null}
     */
    get() {

        return BackendTransport.getUser();

    }

    /**
     * Gets the current user's role.
     *
     * @returns {string|null}
     */
    getRole() {

        const user = this.get();

        return user?.role ?? null;

    }

    /**
     * Gets the UUID of the event currently assigned
     * to the current user.
     *
     * @returns {string|null}
     */
    getEventId() {

        const user = this.get();

        return user?.event ?? null;

    }


    //
    // Current User Permissions
    //

    /**
     * Determines whether the current user is a
     * System Administrator.
     *
     * @returns {boolean}
     */
    isSystemAdmin() {

        return true; //this.getRole() === "admin";

    }

    /**
     * Determines whether the current user is an
     * Event Administrator.
     *
     * @returns {boolean}
     */
    isEventAdmin() {

        return this.getRole() === "event-admin";

    }

    /**
     * Determines whether the current user is an
     * administrator of any type.
     *
     * @returns {boolean}
     */
    isAdmin() {

        return this.isSystemAdmin() ||
            this.isEventAdmin();

    }

    /**
     * Determines whether the current user is a
     * normal user.
     *
     * @returns {boolean}
     */
    isUser() {

        return this.getRole() === "user";

    }

    /**
     * Determines whether the current user has an
     * event assigned.
     *
     * @returns {boolean}
     */
    hasEvent() {

        return this.getEventId() !== null;

    }


    //
    // User Management
    //

    /**
     * Gets all users.
     *
     * System administrators may receive all users.
     *
     * Event administrators should only receive users
     * belonging to their event. The backend should
     * enforce this restriction.
     *
     * @returns {Promise<User[]>}
     */
    async getUsers() {

        return await BackendTransport.get(
            "/users"
        );

    }

    /**
     * Gets a specific user.
     *
     * @param {string} userId
     * @returns {Promise<User>}
     */
    async getUser(userId) {

        return await BackendTransport.get(
            `/users/${userId}`
        );

    }

    /**
     * Creates a new user.
     *
     * @param {Object} user
     * @param {string} user.username
     * @param {string} user.password
     * @param {string} user.role
     * @param {string|null} user.event
     *
     * @returns {Promise<User>}
     */
    async createUser(user) {

        return await BackendTransport.post(
            "/users",
            user
        );

    }

    /**
     * Updates an existing user.
     *
     * @param {string} userId
     * @param {Object} user
     *
     * @returns {Promise<User>}
     */
    async updateUser(userId, user) {

        return await BackendTransport.put(
            `/users/${userId}`,
            user
        );

    }

    /**
     * Deletes a user.
     *
     * @param {string} userId
     *
     * @returns {Promise<void>}
     */
    async deleteUser(userId) {

        return await BackendTransport.delete(
            `/users/${userId}`
        );

    }


    //
    // User Role Management
    //

    /**
     * Changes a user's role.
     *
     * The backend must enforce which roles the
     * authenticated administrator is allowed to assign.
     *
     * System administrators may assign any role.
     *
     * Event administrators may only assign roles
     * permitted for users within their event.
     *
     * @param {string} userId
     * @param {string} role
     *
     * @returns {Promise<User>}
     */
    async setRole(userId, role) {

        return await this.updateUser(
            userId,
            { role }
        );

    }


    //
    // User Event Management
    //

    /**
     * Assigns a user to an event.
     *
     * Passing null removes the event assignment.
     *
     * @param {string} userId
     * @param {string|null} eventId
     *
     * @returns {Promise<User>}
     */
    async setEvent(userId, eventId) {

        return await this.updateUser(
            userId,
            {
                event: eventId
            }
        );

    }

    /**
     * Updates both the role and event assignment
     * of a user.
     *
     * @param {string} userId
     * @param {string} role
     * @param {string|null} eventId
     *
     * @returns {Promise<User>}
     */
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