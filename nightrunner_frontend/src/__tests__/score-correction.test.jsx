import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

import { buildCorrectionValues, normaliseTimestamp, taskValueFromRow } from "../pages/scoring/prefill";

// Rendered through react-dom rather than @testing-library/react, because
// @testing-library/dom is not currently installable alongside the pinned
// Storybook version (same approach as stopwatch-manual-times.test.jsx).

const mockPost = vi.fn();
const mockGet = vi.fn();
const mockStationReport = vi.fn();

vi.mock("@/api/helpers/event/EventContext.jsx", () => ({
    useEventContext: () => ({
        event: { id: "evt-1", name: "Night Ops" },
        eventId: "evt-1",
        loading: false,
        error: null
    })
}));

vi.mock("@/api/ApiService.js", () => ({
    default: {
        backendTransport: {
            get: (...args) => mockGet(...args),
            post: (...args) => mockPost(...args)
        },
        patrolData: { getPatrols: vi.fn(async () => [{ id: "p1", number: 1, name: "Eagles" }]) },
        stationData: { getStations: vi.fn(async () => [STATION]) },
        reportData: { getStationReport: (...args) => mockStationReport(...args) },
        userData: { getCached: () => null }
    }
}));

vi.mock("@/api/UserService.js", () => ({
    default: class { getCached() { return null; } }
}));

const TASKS = {
    base: { id: "t-base", name: "Base", type: "Pass / Fail" },
    time: { id: "t-time", name: "Time", type: "Stopwatch" },
    knots: { id: "t-knots", name: "Knots", type: "Score Challenge" },
    split: { id: "t-split", name: "Per member", type: "Score Challenge", divideByPatrolSize: true },
    answer: { id: "t-answer", name: "Answer", type: "Text Answer" },
    route: { id: "t-route", name: "Route", type: "Multiple Choice", options: [{ label: "Short", value: 10 }, { label: "Long", value: 5 }] },
    dq: { id: "t-dq", name: "DQ", type: "Automatic Station Disqualification" }
};

const STATION = { id: "st-1", name: "Ropes", tasks: [TASKS.base, TASKS.time, TASKS.knots] };

// Rows as GET /v1/scores?eventId&stationId&patrolId returns them (Score.to_dict).
const ROWS = [
    { taskId: "t-base", scoreValue: 1, submittedText: null, participantCount: 1, startedAt: "2026-09-25 22:10:00", completedAt: "2026-09-25 22:24:30", entryMode: "manual" },
    { taskId: "t-time", scoreValue: 247, submittedText: null, participantCount: 1, startedAt: "2026-09-25 22:10:00", completedAt: "2026-09-25 22:24:30", entryMode: "manual" },
    { taskId: "t-knots", scoreValue: 4, submittedText: null, participantCount: 1, startedAt: "2026-09-25 22:10:00", completedAt: "2026-09-25 22:24:30", entryMode: "manual" }
];

describe("normaliseTimestamp", () => {
    it("reads a zone-less database time as UTC", () => {
        expect(normaliseTimestamp("2026-09-25 22:10:00")).toBe("2026-09-25T22:10:00.000Z");
    });

    it("keeps a time that already carries a zone", () => {
        expect(normaliseTimestamp("2026-09-25T22:10:00+00:00")).toBe("2026-09-25T22:10:00.000Z");
    });

    it("returns null for nothing or garbage", () => {
        expect(normaliseTimestamp(null)).toBeNull();
        expect(normaliseTimestamp("not a time")).toBeNull();
    });
});

describe("taskValueFromRow rebuilds the value each field expects", () => {
    const anchor = "2026-09-25T22:10:00.000Z";

    it("Pass / Fail becomes a checkbox state", () => {
        expect(taskValueFromRow(TASKS.base, { scoreValue: 1 }, anchor)).toBe(true);
        expect(taskValueFromRow(TASKS.base, { scoreValue: 0 }, anchor)).toBe(false);
    });

    it("a stopwatch becomes a finished run of the saved length", () => {
        const value = taskValueFromRow(TASKS.time, { scoreValue: 247 }, anchor);
        expect(value.running).toBe(false);
        expect(value.prefilled).toBe(true);
        // The backend derives the score from endTime - startTime, so this is
        // what re-submitting would store.
        expect((new Date(value.endTime) - new Date(value.startTime)) / 1000).toBe(247);
        expect(value.startTime).toBe(anchor);
    });

    it("numbers come back as numbers", () => {
        expect(taskValueFromRow(TASKS.knots, { scoreValue: 4 }, anchor)).toBe(4);
    });

    it("divide-by-patrol-size numbers keep the participant count", () => {
        expect(taskValueFromRow(TASKS.split, { scoreValue: 12, participantCount: 5 }, anchor))
            .toEqual({ rawValue: 12, participantCount: 5 });
    });

    it("text answers come back as the typed text", () => {
        expect(taskValueFromRow(TASKS.answer, { scoreValue: 1, submittedText: "Orion" }, anchor)).toBe("Orion");
    });

    it("multiple choice comes back as the option's value", () => {
        expect(taskValueFromRow(TASKS.route, { scoreValue: 5 }, anchor)).toBe(5);
    });

    it("disqualification keeps the reason", () => {
        expect(taskValueFromRow(TASKS.dq, { scoreValue: 0, submittedText: "Left trail" }, anchor))
            .toEqual({ disqualified: true, reason: "Left trail" });
        expect(taskValueFromRow(TASKS.dq, { scoreValue: 1 }, anchor))
            .toEqual({ disqualified: false, reason: "" });
    });
});

describe("buildCorrectionValues", () => {
    it("carries the original times, entry mode and comment", () => {
        const values = buildCorrectionValues(STATION.tasks, ROWS, "Good teamwork");
        expect(values.startedAt).toBe("2026-09-25T22:10:00.000Z");
        expect(values.completedAt).toBe("2026-09-25T22:24:30.000Z");
        expect(values.entryMode).toBe("manual");
        expect(values.comments).toBe("Good teamwork");
        expect(Object.keys(values.scores).sort()).toEqual(["t-base", "t-knots", "t-time"]);
    });

    it("drops the form's own placeholder comment", () => {
        expect(buildCorrectionValues(STATION.tasks, ROWS, "None.").comments).toBe("");
    });

    it("leaves a task with no saved row out, so the form still asks for it", () => {
        const values = buildCorrectionValues(STATION.tasks, ROWS.slice(0, 2), "");
        expect(values.scores["t-knots"]).toBeUndefined();
    });
});

// ---------------------------------------------------------------- rendering

let container;
let root;

beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockPost.mockReset();
    mockGet.mockReset();
    mockStationReport.mockReset();
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

describe("ScoreForm opened as a correction", () => {
    it("shows the saved values, the saved time on the stopwatch, and the banner", async () => {
        const { default: ScoreForm } = await import("../pages/scoring/ScoreForm");
        const values = buildCorrectionValues(STATION.tasks, ROWS, "Good teamwork");

        act(() => {
            root.render(
                <ScoreForm
                    patrol={{ id: "p1", name: "Eagles" }}
                    station={STATION}
                    eventId="evt-1"
                    initialValues={values}
                    onCancel={() => {}}
                />
            );
        });

        expect(container.querySelector(".correction-banner")).not.toBeNull();
        expect(container.querySelector('input[type="checkbox"]').checked).toBe(true);
        expect(container.querySelector('input[type="number"][placeholder^="Score"]').value).toBe("4");
        expect(container.querySelector(".timer-display").textContent).toContain("00:04:07");
        expect(container.querySelector(".timer-prefill-note")).not.toBeNull();
        expect(container.querySelector("textarea[placeholder='Additional notes...']").value).toBe("Good teamwork");
        expect(container.textContent).toContain("Eagles");
    });

    it("opens blank with no banner for a new score", async () => {
        const { default: ScoreForm } = await import("../pages/scoring/ScoreForm");

        act(() => {
            root.render(<ScoreForm patrol={{ id: "p1", name: "Eagles" }} station={STATION} eventId="evt-1" />);
        });

        expect(container.querySelector(".correction-banner")).toBeNull();
        expect(container.querySelector('input[type="checkbox"]').checked).toBe(false);
        expect(container.querySelector(".timer-prefill-note")).toBeNull();
    });
});

describe("Review table edit action", () => {
    it("shows the row action on scored rows only", async () => {
        const { default: StationReviewTable } = await import("../pages/scoring/review/StationReviewTable");
        const patrols = [{ id: "p1", number: 1, name: "Eagles" }, { id: "p2", number: 2, name: "Owls" }];
        const report = { patrols: [{ patrolId: "p1", breakdown: [{ taskId: "t-base", rawScore: 1 }] }] };

        act(() => {
            root.render(
                <StationReviewTable
                    station={STATION}
                    patrols={patrols}
                    report={report}
                    renderRowAction={(row) => <a className="edit-probe" href={`#${row.patrol.id}`}>Edit</a>}
                />
            );
        });

        const probes = [...container.querySelectorAll(".edit-probe")].map((a) => a.getAttribute("href"));
        expect(probes).toEqual(["#p1"]);
    });
});

describe("Scoring page, patrol already scored", () => {
    it("opens the pre-filled form without deactivating the saved entries", async () => {
        mockGet.mockResolvedValue({ isAlreadyScored: true, lastScoredAt: ROWS[0].completedAt, scores: ROWS });
        mockStationReport.mockResolvedValue({ patrols: [{ patrolId: "p1", comments: "Good teamwork", breakdown: [] }] });

        const { default: Scoring } = await import("../pages/scoring/Scoring");

        act(() => {
            root.render(
                <MemoryRouter initialEntries={["/scoring?station=st-1&patrol=p1"]}>
                    <Scoring />
                </MemoryRouter>
            );
        });
        await flush();
        await flush();

        const editButton = [...container.querySelectorAll("button")]
            .find((b) => b.textContent.includes("Edit Saved Entries"));
        expect(editButton).toBeTruthy();

        await act(async () => {
            editButton.click();
        });
        await flush();

        // The old flow POSTed {action: "deactivate"} here, before the new form
        // was even filled in. Nothing may be written until the form is submitted.
        expect(mockPost).not.toHaveBeenCalled();
        expect(container.querySelector(".correction-banner")).not.toBeNull();
        expect(container.querySelector("textarea[placeholder='Additional notes...']").value).toBe("Good teamwork");
    });
});
