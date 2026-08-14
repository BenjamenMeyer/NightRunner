import { jwtDecode } from "jwt-decode";

const API_BASE = __API_BACKEND_URL__ || "http://localhost:8000/api/v1";

const TOKEN_KEY = "night-runner-token";
const USER_KEY = "night-runner-user";

class BackendTransport {

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

        localStorage.removeItem(
            TOKEN_KEY
        );

        localStorage.removeItem(
            USER_KEY
        );

    }

    getToken() {

        return localStorage.getItem(
            TOKEN_KEY
        );

    }

    getUser() {

        const user =
            JSON.parse(localStorage.getItem(USER_KEY));

        if (user !== null) {
            user.event = "019ffc2f-65b3-7fcc-bfd7-f3717a6068c4";

            return user;
        }
        return null;

        //return user
        //    ? JSON.parse(user)
        //    : null;

    }

    isAuthenticated() {

        const token = this.getToken();

        if (!token) {
            return false;
        }

        try {

            const decoded =
                jwtDecode(token);

            return (
                decoded.exp * 1000 >
                Date.now()
            );

        }
        catch {

            return false;

        }

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

            headers.Authorization =
                `Bearer ${token}`;

        }

        return headers;

    }

    //
    // Generic Request
    //

    async request(
        method,
        url,
        body = null
    ) {

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

        const data =
            await response.json();

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

}

export default new BackendTransport();