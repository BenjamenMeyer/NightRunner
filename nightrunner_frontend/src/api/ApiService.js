import BackendTransport from "./BackendTransport.js";

import AuthService from "./AuthService.js";
import UserService from "./UserService.js";
import EventService from "./EventService.js";
import PatrolService from "./PatrolService.js";
import StationService from "./StationService.js";
import ConfigurationService from "@/api/ConfigurationService.js";


class ApiService {

    //
    // Services
    //

    /**
     * Authentication operations.
     *
     * @type {AuthService}
     */
    auth;

    /**
     * User operations.
     *
     * @type {UserService}
     */
    userData;

    /**
     * Event operations.
     *
     * @type {EventService}
     */
    eventData;

    /**
     * Patrol operations.
     *
     * @type {PatrolService}
     */
    patrolData;

    /**
     * Station operations.
     *
     * @type {StationService}
     */
    stationData;

    /**
     * Configuration operations.
     *
     * @type {ConfigurationService}
     */
    configurationData;

    /**
     * Direct backend transport.
     *
     * @type {BackendTransport}
     */
    backendTransport;


    constructor() {

        this.backendTransport =
            BackendTransport;

        this.auth =
            AuthService;

        this.userData =
            new UserService();

        this.eventData =
            new EventService(
                this.backendTransport,
                this.userData
            );

        this.patrolData =
            new PatrolService(
                this.backendTransport,
                this.userData
            );

        this.stationData =
            new StationService(
                this.backendTransport,
                this.userData
            );

        this.configurationData =
            new ConfigurationService();

    }


    //
    // Authentication
    //

    /**
     * Begins the OIDC login flow.
     *
     * @returns {Promise<void>}
     */
    async login() {

        return this.auth.login();

    }


    /**
     * Logs the current user out.
     *
     * @returns {Promise<void>}
     */
    async logout() {

        return this.auth.logout();

    }


    /**
     * Determines whether the current user is authenticated.
     *
     * @returns {boolean}
     */
    isAuthenticated() {

        return this.auth.isAuthenticated();

    }

}


export default new ApiService();