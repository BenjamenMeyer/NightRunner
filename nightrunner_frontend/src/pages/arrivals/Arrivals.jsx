import { useCallback, useEffect, useState } from "react";

import ApiService from "@/api/ApiService.js";
import { useEventContext } from "@/api/helpers/event/EventContext.jsx";

import "./Arrivals.css";

/**
 * Gate check-in: recording who has physically arrived at the event.
 *
 * Distinct from CheckInOut, which records a patrol reaching a station.
 *
 * The flow is troop-first, because troops usually arrive together. Partial
 * arrival is the normal state, so people already checked in stay visible
 * rather than disappearing from the list, and there is no "finish" step.
 */
export default function Arrivals() {

    const { eventId, loading: eventLoading } = useEventContext();

    const [summary, setSummary] = useState(null);
    const [troopId, setTroopId] = useState("");
    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [error, setError] = useState(null);
    const [pending, setPending] = useState({});

    // When set, arrivals are recorded at this time instead of now. Used to
    // enter a paper sheet after a network outage without stamping everybody
    // with the moment they were typed in.
    const [backdate, setBackdate] = useState("");

    const load = useCallback(async () => {

        if (!eventId) {
            return;
        }

        try {
            setSummary(await ApiService.rosterData.getArrivals(eventId));
            setError(null);
        } catch {
            setError("Could not load arrivals.");
        }

    }, [eventId]);

    useEffect(() => {
        load();
    }, [load]);

    // Keep the list current while it is open, so two staff working the same
    // troop see each other's check-ins rather than contradicting each other.
    useEffect(() => {

        if (!eventId) {
            return undefined;
        }

        const timer = setInterval(load, 20000);
        return () => clearInterval(timer);

    }, [eventId, load]);

    useEffect(() => {

        const trimmed = query.trim();

        if (trimmed.length < 2) {
            setSearchResults([]);
            return undefined;
        }

        let cancelled = false;
        const timer = setTimeout(() => {
            ApiService.rosterData
                .searchAttendees(eventId, trimmed)
                .then(results => {
                    if (!cancelled) {
                        setSearchResults(results);
                    }
                })
                .catch(() => {
                    if (!cancelled) {
                        setSearchResults([]);
                    }
                });
        }, 250);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };

    }, [eventId, query]);

    /**
     * The time an arrival should be recorded at.
     *
     * Null means now, which is the normal case and needs no input at all.
     */
    function arrivalTime() {

        if (!backdate) {
            return null;
        }

        const parsed = new Date(backdate);
        return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();

    }

    async function checkIn(attendee) {

        setPending(current => ({ ...current, [attendee.id]: true }));

        try {
            await ApiService.rosterData.recordArrival(eventId, attendee.id, arrivalTime());
            await load();
            if (query.trim().length >= 2) {
                setSearchResults(await ApiService.rosterData.searchAttendees(eventId, query.trim()));
            }
        } catch {
            setError(`Could not check in ${attendee.fullName}.`);
        } finally {
            setPending(current => ({ ...current, [attendee.id]: false }));
        }
    }

    async function undo(attendee) {

        setPending(current => ({ ...current, [attendee.id]: true }));

        try {
            await ApiService.rosterData.clearArrival(eventId, attendee.id);
            await load();
            if (query.trim().length >= 2) {
                setSearchResults(await ApiService.rosterData.searchAttendees(eventId, query.trim()));
            }
        } catch {
            setError(`Could not undo ${attendee.fullName}.`);
        } finally {
            setPending(current => ({ ...current, [attendee.id]: false }));
        }
    }

    async function checkInTroop(troop) {

        const outstanding = troop.attendees.filter(a => !a.arrival);

        if (outstanding.length === 0) {
            return;
        }

        const confirmed = window.confirm(
            `Check in all ${outstanding.length} remaining people from ${troop.troopNumber}?`
        );

        if (!confirmed) {
            return;
        }

        try {
            for (const attendee of outstanding) {
                await ApiService.rosterData.recordArrival(eventId, attendee.id, arrivalTime());
            }
            await load();
        } catch {
            setError("Could not check in the whole troop.");
        }
    }

    /**
     * Link to a printable roster. Opened in a new tab so the gate screen is
     * not navigated away from mid-check-in.
     */
    function printUrl(mode, onlyTroopId = null) {

        const params = new URLSearchParams({ eventId, mode });

        if (onlyTroopId) {
            params.set("troopId", onlyTroopId);
        }

        return `/arrivals/print?${params.toString()}`;

    }


    function formatTime(iso) {
        if (!iso) {
            return "";
        }
        const parsed = new Date(iso);
        return Number.isNaN(parsed.getTime())
            ? ""
            : parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    // Modal states for manual entry
    const [showAddTroopModal, setShowAddTroopModal] = useState(false);
    const [newTroopNumber, setNewTroopNumber] = useState("");
    const [newTroopName, setNewTroopName] = useState("");
    const [addingTroop, setAddingTroop] = useState(false);

    const [showAddAttendeesModal, setShowAddAttendeesModal] = useState(false);
    const [targetTroopNumber, setTargetTroopNumber] = useState("");
    const [autoCheckInNew, setAutoCheckInNew] = useState(true);
    const [addingAttendees, setAddingAttendees] = useState(false);
    const [batchRows, setBatchRows] = useState([
        { id: 1, firstName: "", lastName: "", category: "Youth" },
        { id: 2, firstName: "", lastName: "", category: "Youth" },
        { id: 3, firstName: "", lastName: "", category: "Youth" }
    ]);

    async function handleAddTroop(e) {
        e.preventDefault();
        const trimmedNum = newTroopNumber.trim();
        if (!trimmedNum) {
            setError("Troop number is required (e.g. GA-0594).");
            return;
        }

        try {
            setAddingTroop(true);
            setError(null);
            const createdTroop = await ApiService.rosterData.addTroop(trimmedNum, newTroopName.trim());
            await load();
            setShowAddTroopModal(false);
            setNewTroopNumber("");
            setNewTroopName("");
            // Auto-select the newly created troop
            const createdNum = createdTroop?.number || trimmedNum;
            const match = summary?.troops.find(t => t.troopNumber === createdNum);
            if (match) {
                setTroopId(match.troopId);
            }
        } catch (err) {
            console.error("Failed to add troop:", err);
            setError(err?.message || "Failed to add troop.");
        } finally {
            setAddingTroop(false);
        }
    }

    function openAddAttendeesModalForTroop(troopNum = "") {
        setTargetTroopNumber(troopNum || (selectedTroop ? selectedTroop.troopNumber : ""));
        setBatchRows([
            { id: 1, firstName: "", lastName: "", category: "Youth" },
            { id: 2, firstName: "", lastName: "", category: "Youth" },
            { id: 3, firstName: "", lastName: "", category: "Youth" }
        ]);
        setShowAddAttendeesModal(true);
    }

    function updateBatchRow(idx, field, value) {
        setBatchRows(prev => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], [field]: value };
            return updated;
        });
    }

    function addBatchRow() {
        if (batchRows.length >= 10) return;
        setBatchRows(prev => [
            ...prev,
            { id: Date.now() + Math.random(), firstName: "", lastName: "", category: "Youth" }
        ]);
    }

    function removeBatchRow(idx) {
        if (batchRows.length <= 1) return;
        setBatchRows(prev => prev.filter((_, i) => i !== idx));
    }

    async function handleAddAttendees(e) {
        e.preventDefault();
        const validRows = batchRows.filter(r => r.firstName.trim() && r.lastName.trim());
        if (validRows.length === 0) {
            setError("Please fill in at least one attendee's First and Last name.");
            return;
        }

        const troopNum = targetTroopNumber.trim() || (selectedTroop ? selectedTroop.troopNumber : "");
        if (!troopNum) {
            setError("A troop number is required for attendees.");
            return;
        }

        try {
            setAddingAttendees(true);
            setError(null);

            const createdAttendees = [];
            for (const r of validRows) {
                const attendeePayload = {
                    troopNumber: troopNum,
                    firstName: r.firstName.trim(),
                    lastName: r.lastName.trim(),
                    category: r.category || "Youth"
                };
                const created = await ApiService.rosterData.addAttendee(eventId, attendeePayload);
                createdAttendees.push(created);

                if (autoCheckInNew && created?.id) {
                    await ApiService.rosterData.recordArrival(eventId, created.id, arrivalTime());
                }
            }

            await load();
            setShowAddAttendeesModal(false);
        } catch (err) {
            console.error("Failed to add attendees:", err);
            setError(err?.message || "Failed to add attendees.");
        } finally {
            setAddingAttendees(false);
        }
    }

    if (eventLoading) {
        return <p className="arrivals__status">Loading event…</p>;
    }

    if (!eventId) {
        return <p className="arrivals__status">Select an event to check people in.</p>;
    }

    const selectedTroop = summary?.troops.find(t => t.troopId === troopId) ?? null;

    return (

        <div className="arrivals">

            <header className="arrivals__header">

                <h1>Gate check-in</h1>

                {summary && (
                    <p className="arrivals__totals">
                        <strong>{summary.arrived}</strong> of {summary.expected} arrived
                        <span className="arrivals__missing">
                            {summary.missing} still to come
                        </span>
                    </p>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                    <div className="arrivals__print-links">
                        {/*
                          * The blank checklist is the outage fallback and is meant
                          * to be printed before the event, so it is offered first.
                          */}
                        <a
                            href={printUrl("blank")}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Print blank checklists
                        </a>
                        <a
                            href={printUrl("status")}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Print current status
                        </a>
                        {troopId && (
                            <a
                                href={printUrl("blank", troopId)}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Print this troop only
                            </a>
                        )}
                    </div>

                    <div className="arrivals__action-buttons">
                        <button
                            type="button"
                            className="arrivals__add-btn"
                            onClick={() => setShowAddTroopModal(true)}
                        >
                            ➕ Add Troop
                        </button>
                        <button
                            type="button"
                            className="arrivals__add-btn"
                            onClick={() => openAddAttendeesModalForTroop()}
                        >
                            ➕ Add Attendees
                        </button>
                    </div>
                </div>

            </header>

            {error && (
                <div className="arrivals__error" role="alert">
                    {error}
                    <button type="button" onClick={() => setError(null)}>Dismiss</button>
                </div>
            )}

            {backdate && (
                <div className="arrivals__backdate-warning" role="status">
                    Recording arrivals at <strong>{new Date(backdate).toLocaleString()}</strong>,
                    not the current time.
                    <button type="button" onClick={() => setBackdate("")}>
                        Use current time
                    </button>
                </div>
            )}

            <div className="arrivals__controls">

                <label className="arrivals__control">
                    <span>Troop</span>
                    <select value={troopId} onChange={e => setTroopId(e.target.value)}>
                        <option value="">Select a troop…</option>
                        {summary?.troops.map(troop => (
                            <option key={troop.troopId} value={troop.troopId}>
                                {troop.troopNumber} — {troop.arrived}/{troop.expected}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="arrivals__control">
                    <span>Find anyone by name</span>
                    <input
                        type="search"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="For people who do not know their troop"
                    />
                </label>

                <label className="arrivals__control">
                    <span>Arrival time</span>
                    <input
                        type="datetime-local"
                        value={backdate}
                        onChange={e => setBackdate(e.target.value)}
                    />
                </label>

            </div>

            {searchResults.length > 0 && (
                <section className="arrivals__section">
                    <h2>Search results</h2>
                    <ul className="arrivals__list">
                        {searchResults.map(attendee => (
                            <AttendeeRow
                                key={attendee.id}
                                attendee={attendee}
                                showTroop
                                busy={pending[attendee.id]}
                                onCheckIn={checkIn}
                                onUndo={undo}
                                formatTime={formatTime}
                            />
                        ))}
                    </ul>
                </section>
            )}

            {selectedTroop && (
                <section className="arrivals__section">

                    <div className="arrivals__troop-header">
                        <h2>
                            {selectedTroop.troopNumber}
                            <span className="arrivals__troop-count">
                                {selectedTroop.arrived} of {selectedTroop.expected} arrived
                            </span>
                        </h2>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <button
                                type="button"
                                className="arrivals__add-btn"
                                onClick={() => openAddAttendeesModalForTroop(selectedTroop.troopNumber)}
                            >
                                ➕ Add People to {selectedTroop.troopNumber}
                            </button>
                            <button
                                type="button"
                                className="arrivals__all"
                                disabled={selectedTroop.missing === 0}
                                onClick={() => checkInTroop(selectedTroop)}
                            >
                                {selectedTroop.missing === 0
                                    ? "All arrived"
                                    : `Check in remaining ${selectedTroop.missing}`}
                            </button>
                        </div>
                    </div>

                    <ul className="arrivals__list">
                        {selectedTroop.attendees.map(attendee => (
                            <AttendeeRow
                                key={attendee.id}
                                attendee={attendee}
                                busy={pending[attendee.id]}
                                onCheckIn={checkIn}
                                onUndo={undo}
                                formatTime={formatTime}
                            />
                        ))}
                    </ul>

                </section>
            )}

            {!selectedTroop && searchResults.length === 0 && (
                <section className="arrivals__section">
                    <h2>All troops</h2>
                    <ul className="arrivals__troops">
                        {summary?.troops.map(troop => (
                            <li key={troop.troopId}>
                                <button type="button" onClick={() => setTroopId(troop.troopId)}>
                                    <span className="arrivals__troop-number">
                                        {troop.troopNumber}
                                    </span>
                                    <span className="arrivals__troop-progress">
                                        {troop.arrived}/{troop.expected}
                                    </span>
                                    {troop.missing > 0 && (
                                        <span className="arrivals__troop-missing">
                                            {troop.missing} missing
                                        </span>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Modal: Add Troop */}
            {showAddTroopModal && (
                <div className="arrivals__modal-overlay" onClick={() => setShowAddTroopModal(false)}>
                    <div className="arrivals__modal" onClick={e => e.stopPropagation()}>
                        <h2>Add New Troop</h2>
                        <p className="arrivals__modal-subtitle">
                            Create a troop code for manual attendee registration without roster import.
                        </p>
                        <form onSubmit={handleAddTroop} className="arrivals__modal-form">
                            <div className="arrivals__field">
                                <label>Troop Number * (e.g. GA-0594)</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="GA-0594"
                                    value={newTroopNumber}
                                    onChange={e => setNewTroopNumber(e.target.value)}
                                />
                            </div>
                            <div className="arrivals__field">
                                <label>Troop Name (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Troop 594 Savannah"
                                    value={newTroopName}
                                    onChange={e => setNewTroopName(e.target.value)}
                                />
                            </div>
                            <div className="arrivals__modal-actions">
                                <button
                                    type="button"
                                    className="arrivals__btn-secondary"
                                    onClick={() => setShowAddTroopModal(false)}
                                    disabled={addingTroop}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="arrivals__btn-primary"
                                    disabled={addingTroop}
                                >
                                    {addingTroop ? "Adding..." : "Add Troop"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add Attendees (Group up to 10) */}
            {showAddAttendeesModal && (
                <div className="arrivals__modal-overlay" onClick={() => setShowAddAttendeesModal(false)}>
                    <div className="arrivals__modal" onClick={e => e.stopPropagation()}>
                        <h2>Add Attendees / Roster Members</h2>
                        <p className="arrivals__modal-subtitle">
                            Add individual or group attendees (up to 10 at once) directly to a troop.
                        </p>
                        <form onSubmit={handleAddAttendees} className="arrivals__modal-form">
                            <div className="arrivals__field">
                                <label>Troop *</label>
                                <select
                                    required
                                    value={targetTroopNumber}
                                    onChange={e => setTargetTroopNumber(e.target.value)}
                                >
                                    <option value="">Select a troop…</option>
                                    {summary?.troops.map(t => (
                                        <option key={t.troopId || t.troopNumber} value={t.troopNumber}>
                                            {t.troopNumber}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <div className="arrivals__batch-header">
                                    <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>
                                        Attendees List ({batchRows.length}/10)
                                    </span>
                                    {batchRows.length < 10 && (
                                        <button
                                            type="button"
                                            className="arrivals__btn-secondary"
                                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
                                            onClick={addBatchRow}
                                        >
                                            ➕ Add Row
                                        </button>
                                    )}
                                </div>

                                {batchRows.map((row, idx) => (
                                    <div key={row.id} className="arrivals__batch-row">
                                        <span className="arrivals__batch-num">#{idx + 1}</span>
                                        <input
                                            type="text"
                                            placeholder="First Name"
                                            value={row.firstName}
                                            onChange={e => updateBatchRow(idx, "firstName", e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Last Name"
                                            value={row.lastName}
                                            onChange={e => updateBatchRow(idx, "lastName", e.target.value)}
                                        />
                                        <select
                                            value={row.category}
                                            onChange={e => updateBatchRow(idx, "category", e.target.value)}
                                        >
                                            <option value="Youth">Youth</option>
                                            <option value="Adult">Adult</option>
                                            <option value="Non-participant Youth">Non-participant Youth</option>
                                        </select>
                                        {batchRows.length > 1 ? (
                                            <button
                                                type="button"
                                                className="arrivals__remove-row-btn"
                                                onClick={() => removeBatchRow(idx)}
                                                title="Remove row"
                                            >
                                                ✕
                                            </button>
                                        ) : <span />}
                                    </div>
                                ))}
                            </div>

                            <label className="arrivals__checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={autoCheckInNew}
                                    onChange={e => setAutoCheckInNew(e.target.checked)}
                                />
                                Check in newly added attendees immediately at gate
                            </label>

                            <div className="arrivals__modal-actions">
                                <button
                                    type="button"
                                    className="arrivals__btn-secondary"
                                    onClick={() => setShowAddAttendeesModal(false)}
                                    disabled={addingAttendees}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="arrivals__btn-primary"
                                    disabled={addingAttendees}
                                >
                                    {addingAttendees ? "Adding..." : `Save ${batchRows.filter(r => r.firstName.trim() && r.lastName.trim()).length || ""} Attendee(s)`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>

    );

}


function AttendeeRow({ attendee, showTroop, busy, onCheckIn, onUndo, formatTime }) {

    const arrived = Boolean(attendee.arrival);

    return (

        <li className={arrived ? "arrivals__row arrivals__row--arrived" : "arrivals__row"}>

            <div className="arrivals__who">
                <span className="arrivals__name">{attendee.fullName}</span>
                <span className="arrivals__meta">
                    {showTroop && attendee.troopNumber
                        ? `${attendee.troopNumber} · `
                        : ""}
                    {attendee.category}
                    {arrived && ` · arrived ${formatTime(attendee.arrival.arrivedAt)}`}
                </span>
            </div>

            {arrived ? (
                <button
                    type="button"
                    className="arrivals__undo"
                    disabled={busy}
                    onClick={() => onUndo(attendee)}
                >
                    Undo
                </button>
            ) : (
                <button
                    type="button"
                    className="arrivals__checkin"
                    disabled={busy}
                    onClick={() => onCheckIn(attendee)}
                >
                    Check in
                </button>
            )}

        </li>

    );

}
