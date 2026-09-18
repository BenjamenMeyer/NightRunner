/**
 * Transport for the public, token-authenticated pages.
 *
 * Deliberately NOT BackendTransport. That client attaches an Authorization
 * header and, on any 401, calls window.location.replace("/login?expired=true")
 * — which would throw a spectator or a volunteer holding a perfectly valid link
 * onto a login screen they have no account for.
 *
 * This sends no credentials, never redirects, and hands errors back to the page
 * to render.
 */

const API_BASE =
    import.meta.env.VITE_API_BACKEND_URL ||
    "http://localhost:8000/v1";

/** Thrown when the link itself is no longer good, so pages can tell the two apart. */
export class InvalidLinkError extends Error {
    constructor() {
        super("This link is not valid. Ask the event organiser for a current one.");
        this.name = "InvalidLinkError";
    }
}


async function publicRequest(method, path, body = null) {

    let response;

    try {

        response = await fetch(
            `${API_BASE}${path}`,
            {
                method,
                headers: { "Content-Type": "application/json" },
                body: body !== null ? JSON.stringify(body) : undefined
            }
        );

    } catch {
        // Night events have poor signal; say so plainly rather than showing a
        // stack trace to a volunteer standing in a field.
        throw new Error("Could not reach the server. Check your signal and try again.");
    }

    if (response.status === 404) {
        throw new InvalidLinkError();
    }

    if (!response.ok) {

        let description = `Request failed (${response.status}).`;

        try {
            const payload = await response.json();
            if (payload?.description) {
                description = payload.description;
            }
        } catch {
            // Keep the status-code message.
        }

        throw new Error(description);

    }

    return response.json();

}


//
// Progress board
//

export function getPublicProgress(token) {
    return publicRequest("GET", `/public/progress/${encodeURIComponent(token)}`);
}


//
// Volunteer check-in
//

export function getPublicCheckIn(token) {
    return publicRequest("GET", `/public/checkin/${encodeURIComponent(token)}`);
}

export function publicCheckIn(token, stationId, patrolId, timestamp = null) {
    return publicRequest(
        "POST",
        `/public/checkin/${encodeURIComponent(token)}/check-in`,
        { stationId, patrolId, ...(timestamp ? { timestamp } : {}) }
    );
}

export function publicCheckOut(token, stationId, patrolId, timestamp = null) {
    return publicRequest(
        "POST",
        `/public/checkin/${encodeURIComponent(token)}/check-out`,
        { stationId, patrolId, ...(timestamp ? { timestamp } : {}) }
    );
}
