import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

import ScoreField from "../pages/scoring/ScoreField";

// These render through react-dom rather than @testing-library/react, because
// @testing-library/dom is not currently installable alongside the pinned
// Storybook version.

const STOPWATCH_TASK = {
    id: "task-recon",
    name: "Recon window",
    type: "Stopwatch",
    scoreValue: { type: "Stopwatch" }
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

function renderField(onChange) {
    act(() => {
        root.render(<ScoreField task={STOPWATCH_TASK} value={undefined} onChange={onChange} />);
    });
}

function setTime(input, value) {
    const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
    ).set;

    act(() => {
        setter.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
    });
}

function timeInputs() {
    const inputs = container.querySelectorAll('input[type="time"]');
    return { started: inputs[0], finished: inputs[1] };
}

function elapsedSeconds(payload) {
    return (new Date(payload.endTime) - new Date(payload.startTime)) / 1000;
}

describe("Stopwatch hand-entered start and finish times", () => {

    it("renders an editable Started and Finished time input", () => {
        renderField(() => {});

        const { started, finished } = timeInputs();

        expect(started).toBeTruthy();
        expect(finished).toBeTruthy();
        expect(started.disabled).toBe(false);
        expect(finished.disabled).toBe(false);
    });

    it("derives the duration from two times typed in the same day", () => {
        let latest = null;
        renderField(payload => { latest = payload; });

        const { started, finished } = timeInputs();
        setTime(started, "03:10:00");
        setTime(finished, "03:25:30");

        expect(elapsedSeconds(latest)).toBe(930);
    });

    it("treats a finish before the start as running past midnight", () => {
        let latest = null;
        renderField(payload => { latest = payload; });

        const { started, finished } = timeInputs();
        setTime(started, "23:50:00");
        setTime(finished, "00:10:00");

        // 20 minutes across midnight, not a negative duration.
        expect(elapsedSeconds(latest)).toBe(1200);
    });

    it("counts identical start and finish times as zero, not a full day", () => {
        let latest = null;
        renderField(payload => { latest = payload; });

        const { started, finished } = timeInputs();
        setTime(started, "02:00:00");
        setTime(finished, "02:00:00");

        expect(elapsedSeconds(latest)).toBe(0);
    });

    it("does not submit a partially typed time", () => {
        let calls = 0;
        renderField(() => { calls += 1; });

        const { started } = timeInputs();
        setTime(started, "03:10:00");

        // Start alone is not a scoreable window; nothing should be emitted yet.
        expect(calls).toBe(0);
    });

    it("re-derives the duration when the start time is corrected", () => {
        let latest = null;
        renderField(payload => { latest = payload; });

        const { started, finished } = timeInputs();
        setTime(started, "03:10:00");
        setTime(finished, "03:25:00");
        expect(elapsedSeconds(latest)).toBe(900);

        setTime(started, "03:05:00");
        expect(elapsedSeconds(latest)).toBe(1200);
    });

    it("marks the submission as not running so the form will accept it", () => {
        let latest = null;
        renderField(payload => { latest = payload; });

        const { started, finished } = timeInputs();
        setTime(started, "03:10:00");
        setTime(finished, "03:25:00");

        expect(latest.running).toBe(false);
    });

});
