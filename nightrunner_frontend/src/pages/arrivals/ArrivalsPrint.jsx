import { useEffect, useState } from "react";

import ApiService from "@/api/ApiService.js";

import "./arrivals-print.css";

/**
 * Printable troop rosters for the gate.
 *
 * Two modes, for two genuinely different jobs:
 *
 *   blank  — every expected person with an empty tick box and a blank time.
 *            Printed BEFORE the event. This is the fallback if the network
 *            drops: it holds no state, so a sheet printed at 17:00 is still
 *            correct at 22:00.
 *
 *   status — who has arrived and when, and who is still missing. Printed
 *            during or after, for reconciliation and the record. Useless as
 *            an outage fallback because it is a snapshot of a moving target.
 *
 * One troop per page, so each sheet can be handed to a different person.
 */

const MODES = {
    blank: {
        title: "Arrival checklist",
        note: "Tick each person as they arrive and write the time."
    },
    status: {
        title: "Arrival status",
        note: "Recorded arrivals as of the time printed below."
    }
};

export default function ArrivalsPrint() {

    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("eventId");
    const troopId = params.get("troopId");
    const mode = params.get("mode") === "status" ? "status" : "blank";

    const [summary, setSummary] = useState(null);
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [printedAt] = useState(() => new Date());

    useEffect(() => {

        if (!eventId) {
            setError("No event was provided.");
            setLoading(false);
            return;
        }

        let cancelled = false;

        Promise.all([
            ApiService.rosterData.getArrivals(eventId),
            ApiService.eventData.getEvent(eventId)
        ])
            .then(([arrivals, eventData]) => {
                if (!cancelled) {
                    setSummary(arrivals);
                    setEvent(eventData);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError("Could not load the roster.");
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };

    }, [eventId]);

    function formatTime(iso) {
        if (!iso) {
            return "";
        }
        const parsed = new Date(iso);
        return Number.isNaN(parsed.getTime())
            ? ""
            : parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    if (loading) {
        return <p className="arrivals-print__status">Loading…</p>;
    }

    if (error) {
        return <p className="arrivals-print__status">{error}</p>;
    }

    const troops = (summary?.troops ?? []).filter(
        troop => !troopId || troop.troopId === troopId
    );

    if (troops.length === 0) {
        return <p className="arrivals-print__status">No troops on this roster.</p>;
    }

    const stamp = printedAt.toLocaleString();

    return (

        <div className={`arrivals-print arrivals-print--${mode}`}>

            <div className="arrivals-print__toolbar">
                <button type="button" onClick={() => window.print()}>
                    Print
                </button>
                <span>
                    {MODES[mode].title} · {troops.length} troop
                    {troops.length === 1 ? "" : "s"} · one per page
                </span>
            </div>

            {troops.map(troop => (

                <section className="arrivals-print__sheet" key={troop.troopId}>

                    <header className="arrivals-print__header">
                        <div>
                            <h1>{troop.troopNumber}</h1>
                            <p className="arrivals-print__event">
                                {event?.name ?? "Night Ops"}
                                {event?.date ? ` · ${event.date}` : ""}
                            </p>
                        </div>
                        <div className="arrivals-print__meta">
                            <strong>{MODES[mode].title}</strong>
                            <span>
                                {mode === "status"
                                    ? `${troop.arrived} of ${troop.expected} arrived`
                                    : `${troop.expected} expected`}
                            </span>
                            {/*
                              * Every sheet carries when it was printed, so
                              * nobody works from a stale page.
                              */}
                            <span>Printed {stamp}</span>
                        </div>
                    </header>

                    <p className="arrivals-print__note">{MODES[mode].note}</p>

                    <table className="arrivals-print__table">
                        <thead>
                            <tr>
                                <th className="arrivals-print__tick">
                                    {mode === "blank" ? "✓" : ""}
                                </th>
                                <th>Name</th>
                                <th>Category</th>
                                <th className="arrivals-print__time">
                                    {mode === "blank" ? "Time in" : "Arrived"}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {troop.attendees.map(attendee => {

                                const arrived = Boolean(attendee.arrival);

                                return (
                                    <tr
                                        key={attendee.id}
                                        className={
                                            mode === "status" && !arrived
                                                ? "arrivals-print__row--missing"
                                                : undefined
                                        }
                                    >
                                        <td className="arrivals-print__tick">
                                            {mode === "blank"
                                                ? <span className="arrivals-print__box" />
                                                : (arrived ? "✓" : "")}
                                        </td>
                                        <td>{attendee.fullName}</td>
                                        <td>{attendee.category}</td>
                                        <td className="arrivals-print__time">
                                            {mode === "blank"
                                                ? <span className="arrivals-print__rule" />
                                                : (arrived
                                                    ? formatTime(attendee.arrival.arrivedAt)
                                                    : "not arrived")}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {mode === "status" && troop.missing > 0 && (
                        <p className="arrivals-print__missing-note">
                            {troop.missing} still to arrive.
                        </p>
                    )}

                    {mode === "blank" && (
                        <p className="arrivals-print__footer-note">
                            Enter these into NightRunner once the network is
                            back, using the time written above — not the time
                            you type them in.
                        </p>
                    )}

                </section>

            ))}

        </div>

    );

}
