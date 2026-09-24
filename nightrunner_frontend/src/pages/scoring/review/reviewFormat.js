/**
 * Pure helpers for the per-station review page.
 *
 * Kept free of React and ApiService so they can be unit tested directly, and
 * so the Finalizer can reuse the sort and rank helpers for its own tables.
 */

const PASS_FAIL_TYPES = new Set(["Pass / Fail", "Completed", "Checkpoint"]);
const TIMER_TYPES = new Set(["Stopwatch", "Timed Challenge"]);
const TEXT_TYPES = new Set(["Text Answer", "Secret Cipher / Decoding"]);
const CHOICE_TYPES = new Set(["Multiple Choice", "MultiChoice"]);
const DISQUALIFICATION_TYPE = "Automatic Station Disqualification";

export function taskId(task) {
    return task.id || task._id;
}

export function taskType(task) {
    return task.scoreValue?.type || task.type;
}

export function taskName(task) {
    return task.name || task.description || "Task";
}

/**
 * Seconds as a stopwatch reads: "4:07", or "2:41:58" once past an hour.
 * Rounded to the whole second, which is what scorers enter from the sheet.
 */
export function formatDuration(seconds) {
    const n = Number(seconds);
    if (!Number.isFinite(n)) {
        return "—";
    }

    const total = Math.max(0, Math.round(n));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const ss = String(s).padStart(2, "0");

    if (h > 0) {
        return `${h}:${String(m).padStart(2, "0")}:${ss}`;
    }
    return `${m}:${ss}`;
}

// 12.0 -> "12", 2.50 -> "2.5". Numbers come back from the database as floats.
function formatNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? String(n) : "—";
}

function choiceLabel(task, rawScore) {
    const options = task.scoreValue?.options || task.options || [];
    const match = options.find((option) => {
        const optionValue =
            typeof option === "object" && option !== null && "value" in option
                ? option.value
                : option;
        return Number(optionValue) === Number(rawScore);
    });

    if (match === undefined) {
        return null;
    }
    return typeof match === "object" && match !== null
        ? (match.label ?? match.name ?? null)
        : String(match);
}

/**
 * How one stored entry should read on screen.
 *
 * Returns { kind, text, detail }. `kind` drives styling (pass, fail, text,
 * missing...). `text` is the value as the scorer entered it. `detail` is an
 * optional muted second line. No weights and no arithmetic: this answers
 * "did I type that right", not "what did it score".
 */
export function formatEntry(task, entry) {
    if (!entry) {
        return { kind: "missing", text: "—", detail: null };
    }

    const type = taskType(task);
    const raw = entry.rawScore;
    const typed = entry.submittedText;

    if (PASS_FAIL_TYPES.has(type)) {
        return Number(raw) > 0
            ? { kind: "pass", text: "✓ Pass", detail: null }
            : { kind: "fail", text: "✗ Fail", detail: null };
    }

    if (type === DISQUALIFICATION_TYPE) {
        // The backend stores 1 for "not disqualified" and 0 for disqualified.
        return Number(raw) > 0
            ? { kind: "plain", text: "No", detail: null }
            : { kind: "fail", text: "Disqualified", detail: typed || null };
    }

    if (TIMER_TYPES.has(type)) {
        const divides = task.divideByPatrolSize ?? task.scoreValue?.divideByPatrolSize ?? false;
        return {
            kind: "plain",
            text: formatDuration(raw),
            detail: divides && entry.participantCount > 1
                ? `${entry.participantCount} members`
                : null
        };
    }

    if (TEXT_TYPES.has(type)) {
        return typed
            ? { kind: "text", text: typed, detail: null }
            : { kind: "text-empty", text: "(blank)", detail: null };
    }

    if (CHOICE_TYPES.has(type)) {
        const label = choiceLabel(task, raw);
        return label
            ? { kind: "plain", text: label, detail: `${formatNumber(raw)} pts` }
            : { kind: "plain", text: formatNumber(raw), detail: null };
    }

    const divides = task.divideByPatrolSize ?? task.scoreValue?.divideByPatrolSize ?? false;
    return {
        kind: "plain",
        text: formatNumber(raw),
        detail: divides && entry.participantCount > 1
            ? `${entry.participantCount} members`
            : null
    };
}

/**
 * The value a task column sorts on: the text for text answers, the stored
 * number for everything else. Null means "no entry", which always sorts last.
 */
export function entrySortValue(task, entry) {
    if (!entry) {
        return null;
    }
    if (TEXT_TYPES.has(taskType(task))) {
        return (entry.submittedText || "").toLowerCase();
    }
    const n = Number(entry.rawScore);
    return Number.isFinite(n) ? n : null;
}

// Patrols without a number go after numbered ones, then fall back to name.
export function comparePatrols(a, b) {
    const an = a.number ?? null;
    const bn = b.number ?? null;
    if (an !== null && bn !== null && Number(an) !== Number(bn)) {
        return Number(an) - Number(bn);
    }
    if (an === null && bn !== null) return 1;
    if (an !== null && bn === null) return -1;
    return (a.name || "").localeCompare(b.name || "");
}

/**
 * Sort rows by `getValue`, ascending or descending. Rows whose value is null
 * or undefined always go last, whichever way the column is sorted, so "no
 * entry yet" never floats to the top of a descending sort. Ties fall back to
 * `tieBreak` so the order is stable between clicks.
 */
export function sortRows(rows, getValue, direction = "asc", tieBreak = () => 0) {
    const sign = direction === "desc" ? -1 : 1;

    return [...rows].sort((a, b) => {
        const av = getValue(a);
        const bv = getValue(b);
        const aMissing = av === null || av === undefined;
        const bMissing = bv === null || bv === undefined;

        if (aMissing && bMissing) return tieBreak(a, b);
        if (aMissing) return 1;
        if (bMissing) return -1;

        let cmp;
        if (typeof av === "string" || typeof bv === "string") {
            cmp = String(av).localeCompare(String(bv));
        } else {
            cmp = av - bv;
        }
        return cmp !== 0 ? sign * cmp : tieBreak(a, b);
    });
}

/**
 * Standard competition ranking with a tie flag, matching `_assign_rankings`
 * in reports_scoring_pdf.py so the screen and the printed report agree:
 * two patrols tied for first are both "1*" and the next is "3". Scores are
 * compared at 4 decimal places, as the PDF does.
 *
 * Returns a Map of key -> { rank, tied }. Rank comes from the score alone, so
 * it stays correct whatever column the table is currently sorted by.
 */
export function assignRanks(items, getKey, getScore) {
    const round = (v) => Math.round(Number(v || 0) * 10000) / 10000;
    const sorted = [...items].sort((a, b) => round(getScore(b)) - round(getScore(a)));

    const counts = new Map();
    sorted.forEach((item) => {
        const v = round(getScore(item));
        counts.set(v, (counts.get(v) || 0) + 1);
    });

    const ranks = new Map();
    let current = 1;
    sorted.forEach((item, idx) => {
        const v = round(getScore(item));
        if (idx > 0 && v !== round(getScore(sorted[idx - 1]))) {
            current = idx + 1;
        }
        ranks.set(getKey(item), { rank: current, tied: counts.get(v) > 1 });
    });
    return ranks;
}

export function formatRank(rankInfo) {
    if (!rankInfo) return "";
    return `${rankInfo.rank}${rankInfo.tied ? "*" : ""}`;
}

/**
 * One row per patrol for a station, joining the patrol list with the station
 * report. A patrol with no active entries gets status "none" rather than
 * being dropped, because a patrol with no rows and a patrol scored zero look
 * identical everywhere else in the app.
 */
export function buildReviewRows(patrols, report) {
    const byPatrol = new Map();
    (report?.patrols || []).forEach((p) => {
        byPatrol.set(String(p.patrolId), p);
    });

    return (patrols || []).map((patrol) => {
        const reported = byPatrol.get(String(patrol.id));
        const entries = {};
        let submittedAt = null;

        (reported?.breakdown || []).forEach((b) => {
            entries[b.taskId] = b;
            if (b.submittedAt && (!submittedAt || b.submittedAt > submittedAt)) {
                submittedAt = b.submittedAt;
            }
        });

        const hasEntries = Object.keys(entries).length > 0;
        return {
            patrol,
            entries,
            submittedAt,
            comments: reported?.comments && reported.comments !== "None." ? reported.comments : null,
            status: hasEntries ? "scored" : "none"
        };
    });
}
