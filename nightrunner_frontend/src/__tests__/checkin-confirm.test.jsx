import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import ConfirmDialog, { patrolLabel } from "../components/ConfirmDialog";

// Rendered through react-dom rather than @testing-library/react, because
// @testing-library/dom is not currently installable alongside the pinned
// Storybook version (same approach as stopwatch-manual-times.test.jsx).

const PATROL = { id: "p7", number: 7, name: "Eagles" };
const STATION = { id: "st-ropes", name: "Ropes" };

const mockCheckIn = vi.fn();
const mockCheckOut = vi.fn();
const mockGetVisits = vi.fn();
const mockPublicCheckIn = vi.fn();
const mockPublicCheckOut = vi.fn();
const mockGetPublicCheckIn = vi.fn();

vi.mock("@/api/helpers/event/EventContext.jsx", () => ({
    useEventContext: () => ({ event: { id: "evt-1", name: "Night Ops" }, eventId: "evt-1", loading: false, error: null })
}));

vi.mock("@/api/ApiService.js", () => ({
    default: {
        patrolData: { getPatrols: vi.fn(async () => [PATROL]) },
        stationData: { getStations: vi.fn(async () => [STATION]) },
        checkInData: {
            getVisits: (...a) => mockGetVisits(...a),
            checkIn: (...a) => mockCheckIn(...a),
            checkOut: (...a) => mockCheckOut(...a),
            resetVisit: vi.fn()
        }
    }
}));

// The real selector wraps a <select> and the QR scanner. A button per item is
// enough to drive the page.
vi.mock("@/api/helpers/qr/DataSelector.jsx", () => ({
    default: ({ label, items, onSelect }) => (
        <div>
            {items.map((item) => (
                <button key={item.id} type="button" data-select={label} onClick={() => onSelect(item)}>
                    {item.name}
                </button>
            ))}
        </div>
    )
}));

vi.mock("@/api/PublicLinkService.js", () => ({
    getPublicCheckIn: (...a) => mockGetPublicCheckIn(...a),
    publicCheckIn: (...a) => mockPublicCheckIn(...a),
    publicCheckOut: (...a) => mockPublicCheckOut(...a),
    InvalidLinkError: class InvalidLinkError extends Error {}
}));

vi.mock("@/branding/useEventTheme.js", () => ({ default: () => {} }));

let container;
let root;

beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    [mockCheckIn, mockCheckOut, mockGetVisits, mockPublicCheckIn, mockPublicCheckOut, mockGetPublicCheckIn]
        .forEach((m) => m.mockReset());
    mockCheckIn.mockResolvedValue({});
    mockCheckOut.mockResolvedValue({});
    mockPublicCheckIn.mockResolvedValue({});
    mockPublicCheckOut.mockResolvedValue({});
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
});

async function flush() {
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
    });
}

function buttonWithText(text) {
    return [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === text);
}

async function click(el) {
    await act(async () => {
        el.click();
    });
    await flush();
}

describe("patrolLabel", () => {
    it("leads with the number on the patrol's badge", () => {
        expect(patrolLabel(PATROL)).toBe("Patrol 7 — Eagles");
    });

    it("falls back to the name when there is no number", () => {
        expect(patrolLabel({ id: "x", name: "Owls" })).toBe("Owls");
        expect(patrolLabel({ id: "x", name: "Owls", number: null })).toBe("Owls");
    });

    it("keeps patrol number 0", () => {
        expect(patrolLabel({ id: "x", name: "Owls", number: 0 })).toBe("Patrol 0 — Owls");
    });
});

describe("ConfirmDialog", () => {
    function render(props) {
        act(() => {
            root.render(
                <ConfirmDialog title="Check In?" onConfirm={() => {}} onCancel={() => {}} {...props}>
                    <p>Body</p>
                </ConfirmDialog>
            );
        });
    }

    it("renders nothing while closed", () => {
        render({ open: false });
        expect(container.querySelector(".confirm-dialog")).toBeNull();
    });

    it("focuses Confirm on a routine confirmation and Cancel on a warning", () => {
        render({ open: true });
        expect(document.activeElement.textContent).toBe("Confirm");

        render({ open: true, variant: "warning" });
        expect(container.querySelector(".confirm-dialog--warning")).not.toBeNull();
        expect(document.activeElement.textContent).toBe("Cancel");
    });

    it("Escape cancels", () => {
        const onCancel = vi.fn();
        render({ open: true, onCancel });
        act(() => {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        });
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("disables both buttons while saving, so a double tap cannot fire twice", () => {
        render({ open: true, busy: true });
        const buttons = container.querySelectorAll(".confirm-dialog button");
        expect([...buttons].every((b) => b.disabled)).toBe(true);
        expect(container.textContent).toContain("Saving...");
    });
});

describe("Signed-in Check In / Check Out page", () => {
    async function renderPage(visits = []) {
        mockGetVisits.mockResolvedValue({ visits });
        const { default: CheckInOut } = await import("../pages/checkin/CheckInOut");
        act(() => {
            root.render(<CheckInOut />);
        });
        await flush();
        await click(container.querySelector('[data-select="Station"]'));
        await click(container.querySelector('[data-select="Patrol"]'));
    }

    it("asks before checking in, naming the patrol by number and the station", async () => {
        await renderPage();
        await click(buttonWithText("Check In"));

        expect(mockCheckIn).not.toHaveBeenCalled();
        const dialog = document.querySelector(".confirm-dialog");
        expect(dialog).not.toBeNull();
        expect(dialog.textContent).toContain("Checking Patrol 7 — Eagles IN at Ropes");

        await click(buttonWithText("Yes, check in"));
        expect(mockCheckIn).toHaveBeenCalledTimes(1);
        expect(mockCheckIn.mock.calls[0][0]).toMatchObject({ patrolId: "p7", stationId: "st-ropes" });
    });

    it("Cancel records nothing", async () => {
        await renderPage();
        await click(buttonWithText("Check In"));
        await click(buttonWithText("Cancel"));

        expect(mockCheckIn).not.toHaveBeenCalled();
        expect(document.querySelector(".confirm-dialog")).toBeNull();
    });

    it("asks before checking out", async () => {
        await renderPage([{ patrolId: "p7", stationId: "st-ropes", checkedInAt: "2026-09-25T22:10:00Z", status: "checked_in" }]);
        await click(buttonWithText("Check Out"));

        expect(document.querySelector(".confirm-dialog").textContent).toContain("OUT at Ropes");
        expect(mockCheckOut).not.toHaveBeenCalled();
        await click(buttonWithText("Yes, check out"));
        expect(mockCheckOut).toHaveBeenCalledTimes(1);
    });

    it("uses the warning version to check a patrol in again after it checked out", async () => {
        await renderPage([{
            patrolId: "p7", stationId: "st-ropes",
            checkedInAt: "2026-09-25T22:10:00Z", checkedOutAt: "2026-09-25T22:30:00Z", status: "checked_out"
        }]);
        await click(buttonWithText("Check In"));

        expect(document.querySelector(".confirm-dialog--warning")).not.toBeNull();
        expect(buttonWithText("Yes, check in again")).toBeTruthy();
    });
});

describe("Public check-in page", () => {
    async function renderPage(visits = []) {
        mockGetPublicCheckIn.mockResolvedValue({
            event: { name: "Night Ops" },
            stationId: "st-ropes",
            stations: [STATION],
            patrols: [PATROL],
            visits
        });
        const { default: PublicCheckIn } = await import("../pages/public/PublicCheckIn");
        act(() => {
            root.render(
                <MemoryRouter initialEntries={["/checkin/tok123"]}>
                    <Routes>
                        <Route path="/checkin/:token" element={<PublicCheckIn />} />
                    </Routes>
                </MemoryRouter>
            );
        });
        await flush();
    }

    it("check-in now asks first, like check-out", async () => {
        await renderPage();
        await click(buttonWithText("Check in"));

        expect(mockPublicCheckIn).not.toHaveBeenCalled();
        expect(document.querySelector(".confirm-dialog").textContent).toContain("Checking Patrol 7 — Eagles IN at Ropes");

        await click(buttonWithText("Yes, check in"));
        expect(mockPublicCheckIn).toHaveBeenCalledWith("tok123", "st-ropes", "p7");
    });

    it("check-out asks in the same dialog", async () => {
        await renderPage([{ patrolId: "p7", stationId: "st-ropes", checkedInAt: "2026-09-25T22:10:00Z" }]);
        await click(buttonWithText("Check out"));

        expect(document.querySelector(".confirm-dialog").textContent).toContain("OUT at Ropes");
        await click(buttonWithText("Cancel"));
        expect(mockPublicCheckOut).not.toHaveBeenCalled();
    });
});
