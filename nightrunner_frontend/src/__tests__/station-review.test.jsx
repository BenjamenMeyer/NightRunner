import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

import StationReviewTable from "../pages/scoring/review/StationReviewTable";
import {
    assignRanks,
    buildReviewRows,
    formatDuration,
    formatEntry,
    formatRank,
    sortRows
} from "../pages/scoring/review/reviewFormat";

// Rendered through react-dom rather than @testing-library/react, because
// @testing-library/dom is not currently installable alongside the pinned
// Storybook version (same approach as stopwatch-manual-times.test.jsx).

const TASKS = {
    base: { id: "t-base", name: "Base", type: "Pass / Fail" },
    time: { id: "t-time", name: "Time", type: "Stopwatch" },
    knots: { id: "t-knots", name: "Knots", type: "Score Challenge" },
    answer: { id: "t-answer", name: "Answer", type: "Text Answer" },
    choice: {
        id: "t-choice",
        name: "Route",
        type: "Multiple Choice",
        options: [
            { label: "Short route", value: 10 },
            { label: "Long route", value: 5 }
        ]
    },
    dq: { id: "t-dq", name: "Disqualified?", type: "Automatic Station Disqualification" }
};

describe("formatDuration", () => {
    it("shows minutes and seconds under an hour", () => {
        expect(formatDuration(247)).toBe("4:07");
        expect(formatDuration(0)).toBe("0:00");
    });

    it("adds hours for event-length times", () => {
        expect(formatDuration(2 * 3600 + 41 * 60 + 58)).toBe("2:41:58");
    });

    it("rounds to the whole second", () => {
        expect(formatDuration(59.6)).toBe("1:00");
    });

    it("returns a dash for a non-number", () => {
        expect(formatDuration(undefined)).toBe("—");
    });
});

describe("formatEntry shows the value as entered", () => {
    it("Pass / Fail reads as tick or cross, not 1 or 0", () => {
        expect(formatEntry(TASKS.base, { rawScore: 1 })).toMatchObject({ kind: "pass", text: "✓ Pass" });
        expect(formatEntry(TASKS.base, { rawScore: 0 })).toMatchObject({ kind: "fail", text: "✗ Fail" });
    });

    it("stopwatch seconds read as a clock", () => {
        expect(formatEntry(TASKS.time, { rawScore: 1015 }).text).toBe("16:55");
    });

    it("numbers read as typed, without trailing .0", () => {
        expect(formatEntry(TASKS.knots, { rawScore: 12.0 }).text).toBe("12");
        expect(formatEntry(TASKS.knots, { rawScore: 2.5 }).text).toBe("2.5");
    });

    it("text answers show the text, and a blank one says so", () => {
        expect(formatEntry(TASKS.answer, { rawScore: 1, submittedText: "Orion" }).text).toBe("Orion");
        expect(formatEntry(TASKS.answer, { rawScore: 0, submittedText: "" }).kind).toBe("text-empty");
    });

    it("multiple choice shows the option label with its points", () => {
        expect(formatEntry(TASKS.choice, { rawScore: 5 })).toMatchObject({ text: "Long route", detail: "5 pts" });
    });

    it("disqualification: stored 0 means disqualified, with the reason", () => {
        expect(formatEntry(TASKS.dq, { rawScore: 1 }).text).toBe("No");
        expect(formatEntry(TASKS.dq, { rawScore: 0, submittedText: "Left the trail" }))
            .toMatchObject({ kind: "fail", text: "Disqualified", detail: "Left the trail" });
    });

    it("no entry for a task is a dash", () => {
        expect(formatEntry(TASKS.knots, undefined).kind).toBe("missing");
    });
});

describe("sortRows", () => {
    const rows = [{ v: 3 }, { v: null }, { v: 1 }, { v: 2 }];

    it("keeps missing values last whichever way it sorts", () => {
        expect(sortRows(rows, (r) => r.v, "asc").map((r) => r.v)).toEqual([1, 2, 3, null]);
        expect(sortRows(rows, (r) => r.v, "desc").map((r) => r.v)).toEqual([3, 2, 1, null]);
    });

    it("does not mutate its input", () => {
        const copy = [...rows];
        sortRows(rows, (r) => r.v, "asc");
        expect(rows).toEqual(copy);
    });
});

describe("assignRanks matches the PDF tie rule", () => {
    it("ties share a rank and are flagged; the next rank skips", () => {
        const items = [
            { id: "a", s: 9 },
            { id: "b", s: 10 },
            { id: "c", s: 10 },
            { id: "d", s: 7 }
        ];
        const ranks = assignRanks(items, (i) => i.id, (i) => i.s);
        expect(formatRank(ranks.get("b"))).toBe("1*");
        expect(formatRank(ranks.get("c"))).toBe("1*");
        expect(formatRank(ranks.get("a"))).toBe("3");
        expect(formatRank(ranks.get("d"))).toBe("4");
    });

    it("treats scores equal to 4 decimal places as tied", () => {
        const ranks = assignRanks(
            [{ id: "a", s: 5.00001 }, { id: "b", s: 5.00002 }],
            (i) => i.id,
            (i) => i.s
        );
        expect(ranks.get("a")).toEqual({ rank: 1, tied: true });
        expect(ranks.get("b")).toEqual({ rank: 1, tied: true });
    });
});

describe("buildReviewRows", () => {
    it("keeps patrols with no entries and marks them, rather than dropping them", () => {
        const patrols = [{ id: "p1", number: 1 }, { id: "p2", number: 2 }];
        const report = {
            patrols: [{
                patrolId: "p1",
                breakdown: [
                    { taskId: "t-base", rawScore: 1, submittedAt: "2026-09-25T22:10:00" },
                    { taskId: "t-knots", rawScore: 4, submittedAt: "2026-09-25T22:14:00" }
                ]
            }]
        };
        const rows = buildReviewRows(patrols, report);
        expect(rows.map((r) => r.status)).toEqual(["scored", "none"]);
        expect(rows[0].submittedAt).toBe("2026-09-25T22:14:00");
    });
});

// ---------------------------------------------------------------- rendering

const STATION = { id: "st-1", name: "Ropes", tasks: [TASKS.base, TASKS.time, TASKS.knots] };

// Deliberately out of number order: the API returns patrols by creation order.
const PATROLS = [
    { id: "p3", number: 3, name: "Hawks" },
    { id: "p1", number: 1, name: "Eagles" },
    { id: "p2", number: 2, name: "Owls" }
];

const REPORT = {
    patrols: [
        {
            patrolId: "p1",
            breakdown: [
                { taskId: "t-base", rawScore: 1, submittedAt: "2026-09-25T22:10:00" },
                { taskId: "t-time", rawScore: 300 },
                { taskId: "t-knots", rawScore: 4 }
            ]
        },
        {
            patrolId: "p3",
            breakdown: [
                { taskId: "t-base", rawScore: 0, submittedAt: "2026-09-25T23:02:00" },
                { taskId: "t-time", rawScore: 245 },
                { taskId: "t-knots", rawScore: 7 }
            ]
        }
    ]
};

let container;
let root;

beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
});

function render(props = {}) {
    act(() => {
        root.render(
            <StationReviewTable station={STATION} patrols={PATROLS} report={REPORT} {...props} />
        );
    });
}

function rowOrder() {
    return [...container.querySelectorAll("tbody tr")].map((tr) => tr.dataset.patrolId);
}

function clickHeader(label) {
    const button = [...container.querySelectorAll("thead button")]
        .find((b) => b.textContent.replace(/[▲▼]/g, "").trim() === label);
    act(() => button.click());
}

describe("StationReviewTable", () => {
    it("orders patrols by number, not by the order the API sent them", () => {
        render();
        expect(rowOrder()).toEqual(["p1", "p2", "p3"]);
    });

    it("shows values as entered", () => {
        render();
        const eagles = container.querySelector('tr[data-patrol-id="p1"]');
        const text = eagles.textContent;
        expect(text).toContain("✓ Pass");
        expect(text).toContain("5:00");
        expect(text).toContain("4");
    });

    it("gives a patrol with no entries its own row state", () => {
        render();
        const owls = container.querySelector('tr[data-patrol-id="p2"]');
        expect(owls.className).toContain("row-no-entry");
        expect(owls.textContent).toContain("No entry yet");
        expect(container.querySelector('[data-testid="review-summary"]').textContent)
            .toContain("2 of 3");
    });

    it("sorts by a task column, and keeps no-entry patrols last both ways", () => {
        render();
        clickHeader("Time");
        expect(rowOrder()).toEqual(["p3", "p1", "p2"]);
        clickHeader("Time");
        expect(rowOrder()).toEqual(["p1", "p3", "p2"]);
    });

    it("highlights the patrol passed in from the scoring page", () => {
        render({ highlightPatrolId: "p3" });
        expect(container.querySelector('tr[data-patrol-id="p3"]').className).toContain("row-highlight");
    });

    it("displays comment badge when a patrol has judge comments and toggles expandable panel", () => {
        const stationWithAnswers = {
            id: "st-1",
            name: "Ropes",
            tasks: [TASKS.base, TASKS.answer]
        };
        const reportWithComments = {
            patrols: [
                {
                    patrolId: "p1",
                    breakdown: [
                        { taskId: "t-base", rawScore: 1 },
                        { taskId: "t-answer", rawScore: 1, submittedText: "Great effort on knot tying!" }
                    ]
                }
            ]
        };

        act(() => {
            root.render(
                <StationReviewTable station={stationWithAnswers} patrols={PATROLS} report={reportWithComments} />
            );
        });

        const commentBtn = container.querySelector(".comment-badge-button");
        expect(commentBtn).not.toBeNull();
        expect(commentBtn.textContent).toContain("💬 1");

        expect(container.querySelector(".row-comments-detail")).toBeNull();

        act(() => commentBtn.click());

        const detailRow = container.querySelector(".row-comments-detail");
        expect(detailRow).not.toBeNull();
        expect(detailRow.textContent).toContain("Answer: Great effort on knot tying!");
    });
});
