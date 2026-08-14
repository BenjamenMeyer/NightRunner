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
 * Provides access to the authenticated user's
 * application data and role information.
 */
export default class UserService {

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
     * Gets the user's role.
     *
     * @returns {string|null}
     */
    getRole() {

        const user = this.get();

        return user?.role ?? null;

    }

    /**
     * Gets the UUID of the event currently assigned
     * to the user.
     *
     * @returns {string|null}
     */
    getEventId() {

        const user = this.get();

        return user?.event ?? null;

    }

    /**
     * Determines whether the current user is a
     * System Administrator.
     *
     * @returns {boolean}
     */
    isSystemAdmin() {

        return false;//this.getRole() === "admin";

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
     * Determines whether the current user is a
     * Admin of any type
     *
     * @returns {boolean}
     */
    isAdmin() {

        return this.isSystemAdmin() || this.isEventAdmin();
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

}