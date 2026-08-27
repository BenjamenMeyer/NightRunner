/**
 * Provides access to the application's OIDC authentication
 * state and operations.
 *
 * This class intentionally contains no React hooks.
 *
 * React authentication state is supplied through
 * AuthServiceProvider.
 */
class AuthService {

    constructor() {

        this.auth = null;

    }


    //
    // Initialization
    //

    /**
     * Connects the service to the react-oidc-context
     * authentication object.
     *
     * This is called by AuthServiceProvider.
     *
     * @param {Object} auth
     * Authentication context returned by useAuth().
     */
    initialize(auth) {

        this.auth = auth;

    }


    /**
     * Determines whether AuthService has been connected
     * to the OIDC authentication context.
     *
     * @returns {boolean}
     */
    isInitialized() {

        return this.auth !== null;

    }


    //
    // Authentication State
    //

    /**
     * Determines whether the current user is authenticated.
     *
     * @returns {boolean}
     */
    isAuthenticated() {

        return this.auth?.isAuthenticated ?? false;

    }


    /**
     * Determines whether authentication is currently loading.
     *
     * @returns {boolean}
     */
    isLoading() {

        return this.auth?.isLoading ?? true;

    }


    /**
     * Gets the current authentication error.
     *
     * @returns {Error|null}
     */
    getError() {

        return this.auth?.error ?? null;

    }


    //
    // OIDC User
    //

    /**
     * Gets the current OIDC user session.
     *
     * @returns {Object|null}
     */
    getUser() {

        return this.auth?.user ?? null;

    }


    /**
     * Gets the current OIDC user profile.
     *
     * @returns {Object|null}
     */
    getProfile() {

        return this.auth?.user?.profile ?? null;

    }


    //
    // Access Token
    //

    /**
     * Gets the current OIDC access token.
     *
     * This token is sent to the Night Runner backend
     * using the Authorization Bearer header.
     *
     * @returns {string|null}
     */
    getToken() {

        return this.auth?.user?.access_token ?? null;

    }


    //
    // Login
    //

    /**
     * Begins the OIDC login flow.
     *
     * The username and password are entered at the
     * identity provider, not inside Night Runner.
     *
     * @returns {Promise<void>}
     */
    async login() {

        if (!this.auth) {

            throw new Error(
                "Authentication service has not been initialized."
            );

        }

        await this.auth.signinRedirect();

    }


    //
    // Logout
    //

    /**
     * Removes the current OIDC session.
     *
     * @returns {Promise<void>}
     */
    async logout() {

        if (!this.auth) {

            throw new Error(
                "Authentication service has not been initialized."
            );

        }

        await this.auth.signoutRedirect({
            post_logout_redirect_uri:
                `${window.location.origin}/login?loggedOut=true`
        });

    }

}


export default new AuthService();