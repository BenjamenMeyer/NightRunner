import BackendTransport from "./BackendTransport";

import UserService from "./UserService";
import EventService from "./EventService";
import PatrolService from "./PatrolService";
import StationService from "./StationService";
import ConfigurationService from "@/api/ConfigurationService.js";
import AuthService from "@/api/AuthService.js";

class ApiService {

    //
    // Domain Services
    //

    /**
     * Provides access to the currently authenticated user
     * and user-related operations.
     * @type {UserService}
     */
    userData;

    /**
     * Provides access to event-related operations.
     * @type {EventService}
     */
    eventData;

    /**
     * Provides access to patrol-related operations.
     * @type {PatrolService}
     */
    patrolData;

    /**
     * Provides access to station-related operations.
     * @type {StationService}
     */
    stationData;

    /**
     * Provides access to station-config related operations
     * @type {ConfigurationService}
     */
    configurationData;

    /**
     * Direct talk to Backend API
     * @type {BackendTransport}
     */
    backendTransport;

    /**
     * Access to Auth actions
     * @type {AuthService}
     */
    authService;

    constructor() {
        this.backendTransport = BackendTransport;
        this.authService = new AuthService();
        this.userData = new UserService();
        this.eventData = new EventService(this.backendTransport, this.userData);
        this.patrolData = new PatrolService(this.backendTransport, this.userData);
        this.stationData = new StationService(this.backendTransport, this.userData);
        this.configurationData = new ConfigurationService();
    }

    //
    // Authentication
    //

    /**
     * Authenticate a user.
     *
     * Saves the returned session locally.
     *
     * @param {string} username
     * @param {string} password
     *
     * @returns {Promise<Object>}
     * The authentication response returned by the backend.
     */
    async login(username, password) {

        const data =
            await BackendTransport.post(
                "/auth/login",
                {
                    username,
                    password
                }
            );

        BackendTransport.saveSession(data);

        return data;

    }

    /**
     * Register a new user.
     *
     * @param {Object} user
     *
     * @returns {Promise<Object>}
     * The newly created user returned by the backend.
     */
    async register(user) {

        return await BackendTransport.post(
            "/users",
            user
        );

    }

}

export default new ApiService();