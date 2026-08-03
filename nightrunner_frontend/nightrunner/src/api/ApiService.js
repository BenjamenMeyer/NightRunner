const API_BASE = "http://localhost:8000/api/v1";

const TOKEN_KEY = "night-runner-token";
const USER_KEY = "night-runner-user";

class ApiService {

    //
    // Session
    //

    saveSession(data) {

        if (data.token) {

            localStorage.setItem(
                TOKEN_KEY,
                data.token
            );

        }

        if (data.user) {

            localStorage.setItem(
                USER_KEY,
                JSON.stringify(data.user)
            );

        }

    }

    logout() {

        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);

    }

    getToken() {

        return localStorage.getItem(TOKEN_KEY);

    }

    getUser() {

        const user = localStorage.getItem(USER_KEY);

        return user
            ? JSON.parse(user)
            : null;

    }

    isAuthenticated() {

        return this.getToken() !== null;

    }

    //
    // Headers
    //

    authHeaders() {

        const headers = {
            "Content-Type": "application/json"
        };

        const token = this.getToken();

        if (token) {

            headers.Authorization = `Bearer ${token}`;

        }

        return headers;

    }

    //
    // Generic Request
    //

    async request(method, url, body = null) {

        const response = await fetch(
            `${API_BASE}${url}`,
            {
                method,
                headers: this.authHeaders(),
                body: body
                    ? JSON.stringify(body)
                    : undefined
            }
        );

        if (response.status === 401) {

            this.logout();

        }

        if (response.status === 204) {

            return null;

        }

        const data = await response.json();

        if (!response.ok) {

            throw new Error(
                data?.error?.message ??
                response.statusText
            );

        }

        return data;

    }

    //
    // HTTP Methods
    //

    get(url) {

        return this.request(
            "GET",
            url
        );

    }

    post(url, body) {

        return this.request(
            "POST",
            url,
            body
        );

    }

    put(url, body) {

        return this.request(
            "PUT",
            url,
            body
        );

    }

    delete(url) {

        return this.request(
            "DELETE",
            url
        );

    }

    //
    // Authentication
    //

    async login(username, password) {

        const data = await this.post(
            "/auth/login",
            {
                username,
                password
            }
        );

        this.saveSession(data);

        return data;

    }

    async register(user) {

        return await this.post(
            "/users",
            user
        );

    }

}

export default new ApiService();