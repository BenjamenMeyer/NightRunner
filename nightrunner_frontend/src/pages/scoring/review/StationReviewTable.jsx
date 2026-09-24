import { useEffect, useMemo, useRef, useState } from "react";

import {
    buildReviewRows,
    comparePatrols,
    entrySortValue,
    formatEntry,
    sortRows,
    taskId,
    taskName
} from "./reviewFormat.js";

function formatSubmitted(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Read-only grid of what was entered at one station: one row per patrol, one
 * column per task, the value exactly as it was typed. Sortable by any column.
 *
 * Presentational only — the page loads the data — so it renders the same in
 * tests and Storybook as it does live.
 */
export default function StationReviewTable({
    station,
    patrols,
    report,
    highlightPatrolId = null
}) {
    const tasks = station?.tasks || [];
    const [sort, setSort] = useState({ key: "number", direction: "asc" });
    const highlightRef = useRef(null);

    const rows = useMemo(
        () => buildReviewRows(patrols, report),
        [patrols, report]
    );

    const sortedRows = useMemo(() => {
        const tieBreak = (a, b) => comparePatrols(a.patrol, b.patrol);

        if (sort.key === "number") {
            const ordered = [...rows].sort(tieBreak);
            return sort.direction === "desc" ? ordered.reverse() : ordered;
        }
        if (sort.key === "name") {
            return sortRows(rows, (r) => (r.patrol.name || "").toLowerCase(), sort.direction, tieBreak);
        }
        if (sort.key === "submitted") {
            return sortRows(rows, (r) => r.submittedAt, sort.direction, tieBreak);
        }

        const task = tasks.find((t) => String(taskId(t)) === sort.key);
        if (!task) return rows;
        return sortRows(
            rows,
            (r) => entrySortValue(task, r.entries[taskId(task)]),
            sort.direction,
            tieBreak
        );
    }, [rows, sort, tasks]);

    useEffect(() => {
        if (highlightRef.current?.scrollIntoView) {
            highlightRef.current.scrollIntoView({ block: "center" });
        }
    }, [highlightPatrolId, report]);

    function toggleSort(key) {
        setSort((prev) =>
            prev.key === key
                ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
                : { key, direction: "asc" }
        );
    }

    function header(key, label, className = "") {
        const active = sort.key === key;
        const arrow = active ? (sort.direction === "asc" ? "▲" : "▼") : "";
        return (
            <th
                key={key}
                className={className}
                aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
            >
                <button
                    type="button"
                    className={`review-sort-button${active ? " is-active" : ""}`}
                    onClick={() => toggleSort(key)}
                >
                    {label}
                    <span className="review-sort-arrow" aria-hidden="true">{arrow}</span>
                </button>
            </th>
        );
    }

    const scoredCount = rows.filter((r) => r.status === "scored").length;

    return (
        <div className="review-table-card">
            <div className="review-summary" data-testid="review-summary">
                <strong>{scoredCount} of {rows.length}</strong> patrols have entries
                {rows.length - scoredCount > 0 && (
                    <> · <span className="review-summary-missing">{rows.length - scoredCount} no entry yet</span></>
                )}
            </div>

            {tasks.length === 0 ? (
                <div className="empty-panel">
                    <p>This station has no tasks configured.</p>
                </div>
            ) : (
                <div className="review-table-scroll">
                    <table className="review-table">
                        <thead>
                            <tr>
                                {header("number", "#", "col-number")}
                                {header("name", "Patrol", "col-patrol")}
                                {tasks.map((t) => header(String(taskId(t)), taskName(t), "col-task"))}
                                {header("submitted", "Submitted", "col-submitted")}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedRows.map((row) => {
                                const isHighlighted =
                                    highlightPatrolId !== null &&
                                    String(row.patrol.id) === String(highlightPatrolId);
                                const classes = [
                                    row.status === "none" ? "row-no-entry" : "",
                                    isHighlighted ? "row-highlight" : ""
                                ].filter(Boolean).join(" ");

                                return (
                                    <tr
                                        key={row.patrol.id}
                                        className={classes || undefined}
                                        ref={isHighlighted ? highlightRef : undefined}
                                        data-patrol-id={row.patrol.id}
                                    >
                                        <td className="col-number">{row.patrol.number ?? ""}</td>
                                        <th scope="row" className="col-patrol">
                                            {row.patrol.name || "Patrol"}
                                        </th>

                                        {row.status === "none" ? (
                                            <td className="cell-no-entry" colSpan={tasks.length}>
                                                No entry yet
                                            </td>
                                        ) : (
                                            tasks.map((t) => {
                                                const shown = formatEntry(t, row.entries[taskId(t)]);
                                                return (
                                                    <td key={taskId(t)} className={`col-task cell-${shown.kind}`}>
                                                        <span className="cell-value">{shown.text}</span>
                                                        {shown.detail && (
                                                            <span className="cell-detail">{shown.detail}</span>
                                                        )}
                                                    </td>
                                                );
                                            })
                                        )}

                                        <td className="col-submitted">
                                            {formatSubmitted(row.submittedAt) ?? "—"}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
