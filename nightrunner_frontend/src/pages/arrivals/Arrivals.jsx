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
