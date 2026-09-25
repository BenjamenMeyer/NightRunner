import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

import ScoreField from "../pages/scoring/ScoreField";

// Rendered through react-dom rather than @testing-library/react, because
// @testing-library/dom is not currently installable alongside the pinned
// Storybook version (same approach as stopwatch-manual-times.test.jsx).

const mockPost = vi.fn();

vi.mock("@/api/ApiService.js", () => ({
    default: { backendTransport: { post: (...a) => mockPost(...a) } }
}));

vi.mock("@/api/UserService.js", () => ({
    default: class { getCached() { return null; } }
}));

const BASE = { id: "t-base", name: "Base score", type: "Pass / Fail" };
const KNOTS = { id: "t-knots", name: "Knots", type: "Score Challenge" };

let container;
let root;

beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockPost.mockReset();
    mockPost.mockResolvedValue({});
    vi.spyOn(window, "alert").mockImplementation(() => {});
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
});

function button(text) {
    return [...container.querySelectorAll("button")].find((b) => b.textContent.replace(/[✓✗]/g, "").trim() === text);
}

function pressed() {
    return [...container.querySelectorAll(".pass-fail-button")]
        .filter((b) => b.getAttribute("aria-pressed") === "true")
        .map((b) => b.textContent.replace(/[✓✗]/g, "").trim());
}

describe("Pass / Fail field", () => {
    function render(value, onChange = () => {}, task = BASE) {
        act(() => {
            root.render(<ScoreField task={task} value={value} onChange={onChange} />);
        });
    }

    it("starts with neither button selected, and says so", () => {
        render(undefined);
        expect(pressed()).toEqual([]);
        expect(container.querySelector(".pass-fail-unanswered").textContent).toBe("Not answered yet");
        // No checkbox left: "not answered" and "Fail" used to be the same state.
        expect(container.querySelector('input[type="checkbox"]')).toBeNull();
    });

    it("sends true for Pass and false for Fail", () => {
        const onChange = vi.fn();
        render(undefined, onChange);

        act(() => button("Pass").click());
        act(() => button("Fail").click());

        expect(onChange.mock.calls.map((c) => c[0])).toEqual([true, false]);
    });

    it("shows the chosen answer, and treats a stored 1 / 0 the same", () => {
        render(true);
        expect(pressed()).toEqual(["Pass"]);
        expect(container.querySelector(".pass-fail-unanswered")).toBeNull();

        render(false);
        expect(pressed()).toEqual(["Fail"]);

        render(1);
        expect(pressed()).toEqual(["Pass"]);

        render(0);
        expect(pressed()).toEqual(["Fail"]);
    });

    it.each(["Checkpoint", "Completed"])("%s tasks get the same two buttons", (type) => {
        render(undefined, () => {}, { id: "t-x", name: "Reached the flag", type });
        expect(button("Pass")).toBeTruthy();
        expect(button("Fail")).toBeTruthy();
        expect(container.querySelector('input[type="checkbox"]')).toBeNull();
    });
});

describe("ScoreForm review step", () => {
    const STATION = { id: "st-speed", name: "Speed", tasks: [BASE, KNOTS] };

    async function renderForm() {
        const { default: ScoreForm } = await import("../pages/scoring/ScoreForm");
        act(() => {
            root.render(<ScoreForm patrol={{ id: "p7", name: "Eagles" }} station={STATION} eventId="evt-1" />);
        });
    }

    function type(input, value) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        act(() => {
            setter.call(input, value);
            input.dispatchEvent(new Event("input", { bubbles: true }));
        });
    }

    // Everything the form's own checks require before it opens the review.
    function fillRequired() {
        const [started, completed] = container.querySelectorAll('input[placeholder="YYYY-MM-DDTHH:MM:SSZ"]');
        type(started, "2026-09-25T22:10:00Z");
        type(completed, "2026-09-25T22:30:00Z");
        type(container.querySelector('input[type="number"][placeholder^="Score"]'), "4");
    }

    function openReview() {
        act(() => button("Review & Submit Score").click());
    }

    it("lists a Pass / Fail left unanswered, and says it will count as Fail", async () => {
        await renderForm();
        fillRequired();
        openReview();

        const warning = container.querySelector(".review-unanswered");
        expect(warning).not.toBeNull();
        expect(warning.textContent).toContain("1 task has no answer");
        expect(warning.textContent).toContain("Base score");
        expect(warning.textContent).toContain("Fail (0 points)");
        expect(container.textContent).toContain("Not answered (counts as Fail)");
    });

    it("shows no warning once every task is answered", async () => {
        await renderForm();
        fillRequired();
        act(() => button("Pass").click());
        openReview();

        expect(container.querySelector(".review-unanswered")).toBeNull();
        expect(container.textContent).toContain("✓ Pass");
    });

    it("still submits an unanswered Pass / Fail as Fail, as before", async () => {
        await renderForm();
        fillRequired();
        openReview();

        await act(async () => {
            button("Confirm & Lock Submission").click();
        });

        expect(mockPost).toHaveBeenCalledTimes(1);
        const [, payload] = mockPost.mock.calls[0];
        expect(payload.scores.find((s) => s.taskId === "t-base").scoreValue).toBe(false);
    });
});
