import { useState } from "react";

import ApiService from "@/api/ApiService.js";
import { useEventContext } from "@/api/helpers/event/EventContext.jsx";
import {
    mapSheetColumns,
    parseCsvToObjects,
    toRosterRows
} from "@/api/helpers/csv/csv.js";

import "./RosterImport.css";

/**
 * Imports the registration sheet into the event's attendee roster.
 *
 * The CSV is read in the browser and previewed before anything is written.
 * Rows the system cannot decide on its own are shown for a person to resolve,
 * because the two ways of getting it wrong lose somebody in opposite
 * directions: merging two children removes one from the gate list, and
 * splitting one child creates a phantom who never arrives.
 */

const BUCKET_LABELS = {
    exact: "Already on the roster",
    new: "New people",
    possible_rename: "Possible renames",
    collision: "Same name, same troop",
    invalid: "Could not be read"
};

const BUCKET_ORDER = ["collision", "possible_rename", "new", "exact", "invalid"];

export default function RosterImport() {

    const { eventId, loading: eventLoading } = useEventContext();

    const [fileName, setFileName] = useState(null);
    const [plan, setPlan] = useState(null);
    const [decisions, setDecisions] = useState({});
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    function reset() {
        setPlan(null);
        setDecisions({});
        setResult(null);
        setError(null);
    }

    async function handleFile(event) {

        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        reset();
        setFileName(file.name);
        setBusy(true);

        try {

            const text = await file.text();
            const { headers, rows } = parseCsvToObjects(text);

            if (rows.length === 0) {
                throw new Error("That file has no rows in it.");
            }

            const { mapping, missing } = mapSheetColumns(headers);

            if (missing.length > 0) {
                throw new Error(
                    `This sheet is missing required columns: ${missing.join(", ")}. ` +
                    "Nothing has been imported."
                );
            }

            const rosterRows = toRosterRows(rows, mapping);
            const preview = await ApiService.rosterData.previewImport(eventId, rosterRows);

            setPlan(preview);

            // Everything the system is confident about is approved by default.
            // The two ambiguous buckets start unapproved, so nothing that needs
            // a human decision slips through by pressing Apply quickly.
            const initial = {};
            preview.rows.forEach((row, index) => {
                initial[index] = row.bucket === "exact" || row.bucket === "new";
            });
            setDecisions(initial);

        } catch (err) {
            setError(err?.message ?? "Could not read that file.");
        } finally {
            setBusy(false);
            // Allow re-selecting the same file after a failure.
            event.target.value = "";
        }
    }

    function toggle(index) {
        setDecisions(current => ({ ...current, [index]: !current[index] }));
    }

    function setRename(index, renameAttendeeId) {
        setDecisions(current => ({
            ...current,
            [`rename-${index}`]: renameAttendeeId,
            [index]: true
        }));
    }

    async function apply() {

        if (!plan) {
            return;
        }

        setBusy(true);
        setError(null);

        try {

            const rows = plan.rows
                .map((row, index) => ({ row, index }))
                .filter(({ row, index }) => decisions[index] && row.bucket !== "invalid")
                .map(({ row, index }) => ({
                    troopName: row.troopNumber,
                    firstName: row.firstName,
                    lastName: row.lastName,
                    category: row.category,
                    phone: row.phone,
                    emergencyContact1: row.emergencyContact1,
                    emergencyContact2: row.emergencyContact2,
                    primaryEmail: row.primaryEmail,
                    secondaryEmail: row.secondaryEmail,
                    keyOrdinal: row.suggestedKeyOrdinal ?? 1,
                    renameAttendeeId:
                        row.bucket === "possible_rename"
                            ? decisions[`rename-${index}`] ?? null
                            : null
                }));

            if (rows.length === 0) {
                throw new Error("Nothing is selected to import.");
            }

            const outcome = await ApiService.rosterData.applyImport(eventId, rows);
            setResult(outcome);
            setPlan(null);

        } catch (err) {
            setError(err?.message ?? "Could not apply the import.");
        } finally {
            setBusy(false);
        }
    }

    const approvedCount = plan
        ? plan.rows.filter((row, index) => decisions[index] && row.bucket !== "invalid").length
        : 0;

    const grouped = plan
        ? BUCKET_ORDER
            .map(bucket => ({
                bucket,
                rows: plan.rows
                    .map((row, index) => ({ row, index }))
                    .filter(({ row }) => row.bucket === bucket)
            }))
            .filter(group => group.rows.length > 0)
        : [];

    if (eventLoading) {
        return <p className="roster-import__status">Loading event…</p>;
    }

    if (!eventId) {
        return (
            <p className="roster-import__status">
                Select an event before importing a roster.
            </p>
        );
    }

    return (

        <div className="roster-import">

            <header className="roster-import__header">
                <h1>Import registration sheet</h1>
                <p>
                    Export the <strong>Master Responses</strong> tab as CSV and
                    choose it below. Nothing is saved until you review what it
                    found and press Apply.
                </p>
            </header>

            <label className="roster-import__file">
                <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFile}
                    disabled={busy}
                />
            </label>

            {fileName && !error && (
                <p className="roster-import__filename">Read {fileName}</p>
            )}

            {busy && <p className="roster-import__status">Working…</p>}

            {error && (
                <div className="roster-import__error" role="alert">
                    {error}
                </div>
            )}

            {result && (
                <div className="roster-import__done" role="status">
                    <strong>Import applied.</strong>{" "}
                    {result.created} added, {result.updated} updated.
                    {result.skipped?.length > 0 && (
                        <> {result.skipped.length} skipped.</>
                    )}
                </div>
            )}

            {plan && (
                <>
                    <section className="roster-import__summary">
                        <h2>What the sheet contains</h2>
                        <ul className="roster-import__counts">
                            {BUCKET_ORDER.map(bucket => (
                                <li key={bucket}>
                                    <span className="roster-import__count">
                                        {plan.counts[bucket] ?? 0}
                                    </span>
                                    {BUCKET_LABELS[bucket]}
                                </li>
                            ))}
                            <li>
                                <span className="roster-import__count">
                                    {plan.missingFromSheet.length}
                                </span>
                                On the roster but not in this sheet
                            </li>
                        </ul>
                    </section>

                    <section className="roster-import__summary">
                        <h2>Per troop</h2>
                        <p className="roster-import__hint">
                            Sheet rows against people matched. A mismatch can
                            mean two people with the same name were read as one.
                        </p>
                        <table className="roster-import__troops">
                            <thead>
                                <tr>
                                    <th>Troop</th>
                                    <th>Sheet rows</th>
                                    <th>On roster</th>
                                </tr>
                            </thead>
                            <tbody>
                                {plan.troopHeadcounts.map(troop => (
                                    <tr key={troop.troopNumber || "unknown"}>
                                        <td>{troop.troopNumber || "—"}</td>
                                        <td>{troop.sheetRows}</td>
                                        <td>{troop.rosterPeople}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    {grouped.map(group => (
                        <section key={group.bucket} className="roster-import__group">

                            <h2>
                                {BUCKET_LABELS[group.bucket]}
                                <span className="roster-import__group-count">
                                    {group.rows.length}
                                </span>
                            </h2>

                            {group.bucket === "collision" && (
                                <p className="roster-import__hint">
                                    Two rows in one troop with the same name.
                                    Keep both if they are different children —
                                    keeping one removes a child from the gate
                                    list.
                                </p>
                            )}

                            {group.bucket === "possible_rename" && (
                                <p className="roster-import__hint">
                                    A close match to somebody already on the
                                    roster. Choose whether this is the same
                                    person renamed, or a different person.
                                </p>
                            )}

                            {group.bucket === "invalid" && (
                                <p className="roster-import__hint">
                                    These rows cannot be imported. Fix them in
                                    the sheet and import again.
                                </p>
                            )}

                            <ul className="roster-import__rows">
                                {group.rows.map(({ row, index }) => (
                                    <li key={index} className="roster-import__row">

                                        {row.bucket !== "invalid" && (
                                            <input
                                                type="checkbox"
                                                checked={Boolean(decisions[index])}
                                                onChange={() => toggle(index)}
                                                aria-label={`Include ${row.firstName} ${row.lastName}`}
                                            />
                                        )}

                                        <div className="roster-import__row-body">
                                            <span className="roster-import__who">
                                                {row.firstName} {row.lastName}
                                            </span>
                                            <span className="roster-import__meta">
                                                {row.troopNumber || row.troopNameRaw}
                                                {row.category ? ` · ${row.category}` : ""}
                                                {row.sourceCategory &&
                                                 row.sourceCategory !== row.category
                                                    ? ` (sheet said ${row.sourceCategory})`
                                                    : ""}
                                                {row.primaryEmail ? ` · Primary: ${row.primaryEmail}` : ""}
                                                {row.secondaryEmail ? ` · Secondary: ${row.secondaryEmail}` : ""}
                                            </span>

                                            {row.error && (
                                                <span className="roster-import__row-error">
                                                    {row.error}
                                                </span>
                                            )}

                                            {row.bucket === "possible_rename" && row.existing && (
                                                <div className="roster-import__choice">
                                                    <label>
                                                        <input
                                                            type="radio"
                                                            name={`rename-${index}`}
                                                            checked={
                                                                decisions[`rename-${index}`] ===
                                                                row.existing.id
                                                            }
                                                            onChange={() =>
                                                                setRename(index, row.existing.id)
                                                            }
                                                        />
                                                        Same person as{" "}
                                                        {row.existing.firstName}{" "}
                                                        {row.existing.lastName}
                                                    </label>
                                                    <label>
                                                        <input
                                                            type="radio"
                                                            name={`rename-${index}`}
                                                            checked={
                                                                !decisions[`rename-${index}`]
                                                            }
                                                            onChange={() =>
                                                                setRename(index, null)
                                                            }
                                                        />
                                                        A different person
                                                    </label>
                                                </div>
                                            )}

                                            {row.bucket === "collision" && (
                                                <span className="roster-import__meta">
                                                    Would be stored as person{" "}
                                                    {row.suggestedKeyOrdinal} of{" "}
                                                    {row.duplicateCount}
                                                </span>
                                            )}
                                        </div>

                                    </li>
                                ))}
                            </ul>

                        </section>
                    ))}

                    {plan.missingFromSheet.length > 0 && (
                        <section className="roster-import__group">
                            <h2>
                                On the roster but not in this sheet
                                <span className="roster-import__group-count">
                                    {plan.missingFromSheet.length}
                                </span>
                            </h2>
                            <p className="roster-import__hint">
                                Nothing is removed by this import. If these
                                people have dropped out, remove them from the
                                roster directly.
                            </p>
                            <ul className="roster-import__rows">
                                {plan.missingFromSheet.map(entry => (
                                    <li key={entry.existing.id} className="roster-import__row">
                                        <div className="roster-import__row-body">
                                            <span className="roster-import__who">
                                                {entry.existing.firstName}{" "}
                                                {entry.existing.lastName}
                                            </span>
                                            <span className="roster-import__meta">
                                                {entry.troopNumber} · {entry.existing.category}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <div className="roster-import__actions">
                        <button
                            type="button"
                            className="roster-import__apply"
                            disabled={busy || approvedCount === 0}
                            onClick={apply}
                        >
                            {approvedCount === 0
                                ? "Nothing selected"
                                : `Apply ${approvedCount} row${approvedCount === 1 ? "" : "s"}`}
                        </button>
                        <button type="button" onClick={reset} disabled={busy}>
                            Cancel
                        </button>
                    </div>
                </>
            )}

        </div>

    );

}
