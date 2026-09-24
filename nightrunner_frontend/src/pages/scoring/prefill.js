/**
 * Turn a patrol's saved score rows back into the values ScoreForm holds, so a
 * correction opens with what was entered instead of a blank form.
 *
 * Each task type has its own value shape in ScoreField; this is the inverse of
 * what ScoreForm submits and transport/scores.py stores. Rows keep only a
 * number plus optional text and participant count, so a few things cannot be
 * rebuilt exactly — see the stopwatch note below.
 */

const PASS_FAIL_TYPES = new Set(["Pass / Fail", "Completed", "Checkpoint"]);
const TIMER_TYPES = new Set(["Stopwatch", "Timed Challenge"]);
const TEXT_TYPES = new Set(["Text Answer", "Secret Cipher / Decoding"]);
const NUMERIC_DIVISIBLE_TYPES = new Set(["RangeRated", "Score Challenge", "Custom"]);

/**
 * Timestamps come back from the database without a zone ("2026-09-25
 * 22:10:00"). ScoreForm submits UTC ISO strings, so read them back as UTC and
 * return the same "…Z" shape the form's "Set Now" button produces.
 */
export function normaliseTimestamp(value) {
    if (!value) return null;
    const text = String(value);
    const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(text);
    const d = new Date(hasZone ? text : `${text.replace(" ", "T")}Z`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function rowTaskId(row) {
    return row.taskId ?? row.task_id;
}

function rowValue(row) {
    return row.scoreValue ?? row.rawScore ?? row.score_value;
}

/**
 * Value for one task, in the shape its ScoreField expects.
 * `anchor` is an ISO time used to place a stopwatch run (see below).
 */
export function taskValueFromRow(task, row, anchor) {
    const type = task.scoreValue?.type || task.type;
    const raw = Number(rowValue(row));
    const text = row.submittedText ?? null;
    const count = Number(row.participantCount) || 1;
    const divides = task.divideByPatrolSize ?? task.scoreValue?.divideByPatrolSize ?? false;

    if (PASS_FAIL_TYPES.has(type)) {
        return raw > 0;
    }

    if (type === "Automatic Station Disqualification") {
        // Stored as 1 = not disqualified, 0 = disqualified, reason as text.
        return raw > 0
            ? { disqualified: false, reason: "" }
            : { disqualified: true, reason: text || "" };
    }

    if (TEXT_TYPES.has(type)) {
        return text ?? "";
    }

    if (TIMER_TYPES.has(type)) {
        // Only the elapsed seconds are stored, not the stopwatch's own start
        // and finish. Rebuild a run of the right length starting at `anchor`
        // (the station start, else now). The duration is exact; the two clock
        // times are placeholders, which the field says on screen.
        const seconds = Number.isFinite(raw) ? Math.max(0, raw) : 0;
        const startMs = anchor ? new Date(anchor).getTime() : Date.now();
        const value = {
            startTime: new Date(startMs).toISOString(),
            endTime: new Date(startMs + seconds * 1000).toISOString(),
            running: false,
            prefilled: true
        };
        if (divides) {
            value.participantCount = count;
        }
        return value;
    }

    if (divides && NUMERIC_DIVISIBLE_TYPES.has(type)) {
        return { rawValue: raw, participantCount: count };
    }

    // Numbers, multiple choice (the option's value) and delta time.
    return Number.isFinite(raw) ? raw : undefined;
}

/**
 * Everything ScoreForm needs to open a correction.
 *
 * `rows` are the patrol's active score rows at the station (from
 * GET /v1/scores?eventId&stationId&patrolId). `comments` is the judge comment
 * saved on the visit. Tasks with no saved row are left out, so they open
 * blank and the form's usual "please complete" check still applies.
 */
export function buildCorrectionValues(tasks, rows, comments = "") {
    const byTask = new Map();
    (rows || []).forEach((row) => byTask.set(String(rowTaskId(row)), row));

    const first = (rows || [])[0] || {};
    const startedAt = normaliseTimestamp(first.startedAt);
    const completedAt = normaliseTimestamp(first.completedAt);

    const scores = {};
    (tasks || []).forEach((task, idx) => {
        const id = task.id || task._id || `task-${idx}`;
        const row = byTask.get(String(id));
        if (!row) return;
        const value = taskValueFromRow(task, row, startedAt || completedAt);
        if (value !== undefined) {
            scores[id] = value;
        }
    });

    return {
        scores,
        comments: comments && comments !== "None." ? comments : "",
        startedAt,
        completedAt,
        entryMode: first.entryMode === "manual" ? "manual" : "live"
    };
}
