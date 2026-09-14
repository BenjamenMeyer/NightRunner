import { describe, it, expect } from "vitest";
import { buildPatrolQRPayload, parseAndValidatePatrolQR } from "../api/helpers/qr/qrUtils.js";

describe("qrUtils - Patrol QR Code payload & validation", () => {
    it("builds a valid JSON QR payload with patrol ID and event name", () => {
        const payloadStr = buildPatrolQRPayload("patrol-123", "Night Ops 2026");
        const parsed = JSON.parse(payloadStr);
        expect(parsed).toEqual({
            id: "patrol-123",
            event: "Night Ops 2026"
        });
    });

    it("uses default event name if active event is not provided", () => {
        const payloadStr = buildPatrolQRPayload("patrol-123", null);
        const parsed = JSON.parse(payloadStr);
        expect(parsed).toEqual({
            id: "patrol-123",
            event: "Event Patrol Badges"
        });
    });

    it("parses and validates a matching patrol QR payload", () => {
        const payloadStr = buildPatrolQRPayload("patrol-123", "Night Ops 2026");
        const result = parseAndValidatePatrolQR(payloadStr, "Night Ops 2026");
        expect(result.valid).toBe(true);
        expect(result.id).toBe("patrol-123");
        expect(result.event).toBe("Night Ops 2026");
    });

    it("rejects non-JSON or invalid schema QR codes", () => {
        expect(parseAndValidatePatrolQR("invalid-data", "Night Ops 2026")).toEqual({
            valid: false,
            error: "This is not a valid patrol QR code."
        });

        expect(parseAndValidatePatrolQR(JSON.stringify({ wrongKey: "123" }), "Night Ops 2026")).toEqual({
            valid: false,
            error: "This is not a valid patrol QR code."
        });
    });

    it("rejects QR codes from a different event to prevent data crossing", () => {
        const payloadStr = buildPatrolQRPayload("patrol-123", "Night Ops 2025");
        const result = parseAndValidatePatrolQR(payloadStr, "Night Ops 2026");
        expect(result.valid).toBe(false);
        expect(result.error).toContain('QR Code belongs to event "Night Ops 2025", but active event is "Night Ops 2026"');
    });
});
