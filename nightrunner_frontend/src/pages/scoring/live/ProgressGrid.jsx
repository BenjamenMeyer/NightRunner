import "./LiveStatus.css";

/**
 * The patrol x station progress grid.
 *
 * Shared by the signed-in Live Status board and the public spectator board so
 * the two cannot drift apart. It lives beside LiveStatus rather than in
 * components/ so it keeps using LiveStatus.css — one grid, one stylesheet.
 *
 * Identity columns are configurable because the two boards label rows
 * differently: internally a patrol name is enough, while a spectator needs
 * number, name and troop to find their own patrol.
 */

export const DEFAULT_IDENTITY_COLUMNS = [
    {
        key: "patrol",
        label: "Patrol",
        render: (patrol) => patrol.programName || patrol.name
    }
];

export const PUBLIC_IDENTITY_COLUMNS = [
    {
        key: "number",
        label: "#",
        render: (patrol) => (patrol.number ?? "")
    },
    {
        key: "name",
        label: "Patrol",
        render: (patrol) => patrol.programName || patrol.name
    },
    {
        key: "troop",
        label: "Troop",
        // Patrols are commonly mixed-troop, so this is a list rather than a
        // single code. An empty list renders as a dash, not a blank cell.
        render: (patrol) =>
            patrol.troops?.length
                ? patrol.troops.join(", ")
                : "—"
    }
];


/**
 * Collapse the visit rows into one entry per patrol/station.
 *
 * Sorted oldest first so a later visit overwrites an earlier one — a patrol
 * that was reset and re-checked-in should read as its current attempt.
 */
export function buildVisitMap(visits) {

    const visitMap = {};

    if (!visits) {
        return visitMap;
    }

    const sorted = [...visits].sort(
        (a, b) =>
            new Date(a.createdAt || a.created_at || a.checkedInAt || a.checked_in_at || 0) -
            new Date(b.createdAt || b.created_at || b.checkedInAt || b.checked_in_at || 0)
    );

    for (const v of sorted) {

        const pid = v.patrolId || v.patrol_id;
        const sid = v.stationId || v.station_id;

        if (pid && sid) {
            visitMap[`${pid}_${sid}`] = {
                checkedInAt: v.checkedInAt || v.checked_in_at || null,
                checkedOutAt: v.checkedOutAt || v.checked_out_at || null,
                tasksStartedAt: v.tasksStartedAt || v.tasks_started_at || null,
                tasksCompletedAt: v.tasksCompletedAt || v.tasks_completed_at || null,
                status: v.status || null
            };
        }

    }

    return visitMap;

}


/** Work out what one patrol/station cell should show. */
export function cellState(patrol, station, visit) {

    const isCompletedScoring = visit?.status === "completed";

    const isCheckedIn = Boolean(
        visit?.checkedInAt ||
        patrol.currentStationId === station.id ||
        (patrol.status === "checked-in" && patrol.stationId === station.id)
    );

    const isInProgress = Boolean(
        visit?.tasksStartedAt ||
        patrol.inProgressStationId === station.id ||
        (isCheckedIn && patrol.inProgress)
    );

    const isCheckedOut = Boolean(
        visit?.checkedOutAt ||
        patrol.completedStations?.includes(station.id) ||
        patrol.completed?.[station.id]
    );

    if (isCompletedScoring) {
        return { className: "completed", value: "★", title: "Scoring Completed / Locked Attempt" };
    }

    if (isCheckedOut) {
        return { className: "completed", value: "✓", title: "Checked Out / Attempt Finished" };
    }

    if (isInProgress) {
        return { className: "in-progress", value: "⚡", title: "In Progress" };
    }

    if (isCheckedIn) {
        return { className: "checked-in", value: "⏳", title: "Checked In" };
    }

    return { className: "not-arrived", value: "", title: "Not Arrived" };

}


export default function ProgressGrid({
    stations = [],
    patrols = [],
    visits = [],
    displayMode = "fit",
    identityColumns = DEFAULT_IDENTITY_COLUMNS,
    tableWrapperRef = null,
    verboseLegend = false
}) {

    const visitMap = buildVisitMap(visits);

    // Auto-scroll needs the rows duplicated so the loop has something to run
    // into; below that many patrols there is nothing to scroll.
    const patrolsToMap =
        patrols.length > 10 && displayMode === "auto"
            ? [...patrols, ...patrols]
            : patrols;

    return (
        <>
            <div ref={tableWrapperRef} className={`live-table-wrapper ${displayMode}`}>
                <table className={`live-table ${displayMode}`}>
                    <thead>
                        <tr>
                            {identityColumns.map((column) => (
                                <th
                                    key={column.key}
                                    className={`sticky-column identity-col identity-col--${column.key}`}
                                >
                                    {column.label}
                                </th>
                            ))}
                            {stations.map((station) => (
                                <th key={station.id}>{station.name}</th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {patrolsToMap.map((patrol, index) => (
                            <tr key={`${patrol.id}-${index}`}>
                                {identityColumns.map((column) => (
                                    <td
                                        key={column.key}
                                        className={`sticky-column patrol-name identity-col identity-col--${column.key}`}
                                    >
                                        {column.render(patrol)}
                                    </td>
                                ))}

                                {stations.map((station) => {

                                    const state = cellState(
                                        patrol,
                                        station,
                                        visitMap[`${patrol.id}_${station.id}`]
                                    );

                                    return (
                                        <td
                                            key={station.id}
                                            className={state.className}
                                            title={state.title}
                                        >
                                            {state.value}
                                        </td>
                                    );

                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="legend">
                <span className="legend-item">
                    <span className="legend-box not-arrived"></span>
                    {verboseLegend ? "Not arrived yet" : "Not Arrived"}
                </span>

                <span className="legend-item">
                    <span className="legend-box checked-in"></span>
                    {verboseLegend ? "At the station now (⏳)" : "Checked In (⏳)"}
                </span>

                <span className="legend-item">
                    <span className="legend-box in-progress"></span>
                    {verboseLegend ? "Taking part (⚡)" : "In Progress (⚡)"}
                </span>

                <span className="legend-item">
                    <span className="legend-box completed"></span>
                    {verboseLegend ? "Finished this station (✓)" : "Checked Out / Completed (✓)"}
                </span>
            </div>
        </>
    );

}
