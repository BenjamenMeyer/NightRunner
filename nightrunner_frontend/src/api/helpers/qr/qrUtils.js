/**
 * Utility functions for building and validating Patrol QR Code payloads across NightRunner.
 */

/**
 * Builds a standardized JSON string payload for patrol QR codes.
 *
 * @param {string} patrolId - The UUID or unique ID of the patrol.
 * @param {string} [eventName] - Optional name of the active event.
 * @returns {string} JSON string formatted payload.
 */
export function buildPatrolQRPayload(patrolId, eventName) {

    const safeId =
        typeof patrolId === "string"
            ? patrolId.trim()
            : "";

    const safeEventName =
        typeof eventName === "string" && eventName.trim()
            ? eventName.trim()
            : "Event Patrol Badges";

    return JSON.stringify({
        id: safeId,
        event: safeEventName
    });

}


/**
 * Parses and validates a decoded QR text string against expected patrol payload schema
 * and active event context to prevent data crossing.
 *
 * @param {string} decodedText - Raw decoded string from QR scanner.
 * @param {string} [activeEventName] - Optional active event name for cross-event validation.
 * @returns {{ valid: boolean, id?: string, event?: string, error?: string }} Result object.
 */
export function parseAndValidatePatrolQR(decodedText, activeEventName) {

    if (!decodedText || typeof decodedText !== "string") {
        return {
            valid: false,
            error: "This is not a valid patrol QR code."
        };
    }

    let payload;

    try {

        payload =
            JSON.parse(
                decodedText.trim()
            );

    } catch {

        return {
            valid: false,
            error: "This is not a valid patrol QR code."
        };

    }

    if (
        !payload ||
        typeof payload !== "object" ||
        typeof payload.id !== "string" ||
        !payload.id.trim()
    ) {

        return {
            valid: false,
            error: "This is not a valid patrol QR code."
        };

    }

    const patrolId =
        payload.id.trim();

    const payloadEvent =
        typeof payload.event === "string"
            ? payload.event.trim()
            : null;

    const currentEvent =
        typeof activeEventName === "string"
            ? activeEventName.trim()
            : null;

    if (
        payloadEvent &&
        currentEvent &&
        payloadEvent.toLowerCase() !== currentEvent.toLowerCase()
    ) {

        return {
            valid: false,
            error: `QR Code belongs to event "${payloadEvent}", but active event is "${currentEvent}".`
        };

    }

    return {
        valid: true,
        id: patrolId,
        event: payloadEvent
    };

}
