import BackendTransport from "./BackendTransport";

const USER_KEY = "night-runner-user";

/**
 * @typedef {Object} User
 *
 * @property {string} id
 * @property {string} externalId
 * @property {string} username
 * @property {string} email
 * @property {string} displayName
 * @property {string} role
 * @property {string|null} event
 */

export default class UserService {

    //
    // Current authenticated application user
    //

    /**
     * Gets the Night Runner user associated with
     * the currently authenticated OIDC user.
     *
     * The backend determines the user from the
     * authenticated access token.
     *
     * This is the source of truth for the
     * Night Runner application user.
     *
     * @returns {Promise<User|null>}
     */
    async get() {

        try {

            const user =
                await BackendTransport.get(
                    "/me"
                );

            if (!user) {

                this.clear();

                return null;

            }

            this.set(user);

            return user;

        }
        catch (error) {

            this.clear();

            throw error;

        }

    }


    /**
     * Refreshes the current Night Runner user
     * from the backend.
     *
     * This is equivalent to get(), but makes the
     * intent clearer when a component wants to
     * explicitly refresh the cached user.
     *
     * @returns {Promise<User|null>}
     */
    async refresh() {

        return await this.get();

    }


    //
    // Local cache
    //

    /**
     * Gets the cached Night Runner user.
     *
     * This is only a cache.
     * It is NOT the source of truth.
     *
     * This does not make a backend request.
     *
     * @returns {User|null}
     */
    getCached() {

        const value =
            localStorage.getItem(
                USER_KEY
            );

        if (!value) {

            return null;

        }

        try {

            return JSON.parse(value);

        }
        catch {

            this.clear();

            return null;

        }

    }


    /**
     * Determines whether a cached Night Runner
     * user exists.
     *
     * This does NOT determine whether the user
     * is currently authenticated.
     *
     * @returns {boolean}
     */
    hasCachedUser() {

        return this.getCached() !== null;

    }


    /**
     * Stores the Night Runner application user
     * locally.
     *
     * This is only a cache.
     *
     * @param {User} user
     */
    set(user) {

        if (!user) {

            this.clear();

            return;

        }

        localStorage.setItem(
            USER_KEY,
            JSON.stringify(user)
        );

    }


    /**
     * Removes the cached Night Runner user.
     *
     * This does NOT log the user out of OIDC.
     */
    clear() {

        localStorage.removeItem(
            USER_KEY
        );

    }


    //
    // Current User Properties
    //

    /**
     * Gets the Night Runner user's ID.
     *
     * @returns {string|null}
     */
    getId() {

        return this.getCached()?.id ?? null;

    }


    /**
     * Gets the external OIDC identity ID
     * associated with the Night Runner user.
     *
     * @returns {string|null}
     */
    getExternalId() {

        return this.getCached()?.externalId ?? null;

    }


    /**
     * Gets the Night Runner username.
     *
     * @returns {string|null}
     */
    getUsername() {

        return this.getCached()?.username ?? null;

    }


    /**
     * Gets the Night Runner user's email.
     *
     * @returns {string|null}
     */
    getEmail() {

        return this.getCached()?.email ?? null;

    }


    /**
     * Gets the Night Runner user's display name.
     *
     * @returns {string|null}
     */
    getDisplayName() {

        return this.getCached()?.displayName ?? null;

    }


    /**
     * Gets the current user's role.
     *
     * Uses the cached Night Runner user.
     *
     * @returns {string|null}
     */
    getRole() {

        return this.getCached()?.role ?? null;

    }


    /**
     * Gets the UUID of the current user's event.
     *
     * @returns {string|null}
     */
    getEventId() {

        return this.getCached()?.event ?? null;

    }


    //
    // Permissions
    //

    /**
     * Determines whether the current user
     * is a system administrator.
     *
     * @returns {boolean}
     */
    isSystemAdmin() {

        return this.getRole() === "admin";

    }


    /**
     * Determines whether the current user
     * is an event administrator.
     *
     * @returns {boolean}
     */
    isEventAdmin() {

        return this.getRole() === "event-admin";

    }


    /**
     * Determines whether the current user
     * has any administrator role.
     *
     * @returns {boolean}
     */
    isAdmin() {

        return (
            this.isSystemAdmin() ||
            this.isEventAdmin()
        );

    }


    /**
     * Determines whether the current user
     * is a normal user.
     *
     * @returns {boolean}
     */
    isUser() {

        return this.getRole() === "user";

    }


    /**
     * Determines whether the current user
     * has an event assigned.
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
     * Gets all Night Runner users.
     *
     * @returns {Promise<User[]>}
     */
    async getUsers() {

        return await BackendTransport.get(
            "/users"
        );

    }


    /**
     * Gets a Night Runner user by ID.
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
     * Creates a Night Runner user.
     *
     * @param {Object} user
     * @returns {Promise<User>}
     */
    async createUser(user) {

        return await BackendTransport.post(
            "/users",
            user
        );

    }


    /**
     * Updates a Night Runner user.
     *
     * @param {string} userId
     * @param {Object} user
     * @returns {Promise<User>}
     */
    async updateUser(
        userId,
        user
    ) {

        return await BackendTransport.put(
            `/users/${userId}`,
            user
        );

    }


    /**
     * Deletes a Night Runner user.
     *
     * @param {string} userId
     * @returns {Promise<void>}
     */
    async deleteUser(userId) {

        return await BackendTransport.delete(
            `/users/${userId}`
        );

    }


    //
    // User Access Management
    //

    /**
     * Changes a user's role.
     *
     * @param {string} userId
     * @param {string} role
     * @returns {Promise<User>}
     */
    async setRole(
        userId,
        role
    ) {

        return await this.updateUser(
            userId,
            {
                role
            }
        );

    }


    /**
     * Assigns a user to an event.
     *
     * @param {string} userId
     * @param {string|null} eventId
     * @returns {Promise<User>}
     */
    async setEvent(
        userId,
        eventId
    ) {

        return await this.updateUser(
            userId,
            {
                event: eventId
            }
        );

    }


    /**
     * Updates both a user's role and event.
     *
     * @param {string} userId
     * @param {string} role
     * @param {string|null} eventId
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