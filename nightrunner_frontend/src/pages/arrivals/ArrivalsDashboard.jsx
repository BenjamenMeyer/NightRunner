import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ApiService from "@/api/ApiService.js";
import { useEventContext } from "@/api/helpers/event/EventContext.jsx";

import "./ArrivalsDashboard.css";

const REFRESH_MS = 30000;

/**
 * Read-only overview of who has arrived, for organisers.
 *
 * Deliberately separate from the gate screen: gate staff are checking people
 * in, organisers are watching the event fill up. Different jobs, and mixing
 * them invites a mis-tap on a screen nobody is standing at.
 *
 * Refreshes on a timer so it can be left open at the command post.
 */
export default function ArrivalsDashboard() {

    const { eventId, loading: eventLoading } = useEventContext();

    const [summary, setSummary] = useState(null);
    const [expanded, setExpanded] = useState({});
    const [updatedAt, setUpdatedAt] = useState(null);
    const [error, setError] = useState(null);
    const [selectedDetailAttendee, setSelectedDetailAttendee] = useState(null);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [reportNotice, setReportNotice] = useState(null);

    const load = useCallback(async () => {

        if (!eventId) {
            return;
        }

        try {
            setSummary(await ApiService.rosterData.getArrivals(eventId));
            setUpdatedAt(new Date());
            setError(null);
        } catch {
            setError("Could not refresh. Showing the last figures loaded.");
        }

    }, [eventId]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {

        if (!eventId) {
            return undefined;
        }

        const timer = setInterval(load, REFRESH_MS);
        return () => clearInterval(timer);

    }, [eventId, load]);

    function toggle(troopId) {
        setExpanded(current => ({ ...current, [troopId]: !current[troopId] }));
    }

    async function handleGenerateAttendanceReport() {
        if (!eventId) return;
        setGeneratingReport(true);
        setReportNotice(null);
        try {
            await ApiService.reportData.generateReportJob(eventId, "attendance-pdf");
            setReportNotice("Attendance Report generation queued! View it in Event Reports.");
        } catch {
            setReportNotice("Failed to queue Attendance Report.");
        } finally {
            setGeneratingReport(false);
        }
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
        return <p className="dashboard__status">Loading event…</p>;
    }

    if (!eventId) {
        return <p className="dashboard__status">Select an event to see arrivals.</p>;
    }

    if (!summary) {
        return <p className="dashboard__status">Loading arrivals…</p>;
    }

    // Troops with the most people outstanding first: those are the ones
    // somebody needs to chase. Fully arrived troops sink to the bottom.
    const troops = [...summary.troops].sort((a, b) => {
        if (b.missing !== a.missing) {
            return b.missing - a.missing;
        }
        return (a.troopNumber || "").localeCompare(b.troopNumber || "");
    });

    const percent = summary.expected > 0
        ? Math.round((summary.arrived / summary.expected) * 100)
        : 0;

    return (

        <div className="dashboard">

            <header className="dashboard__header">
                <div>
                    <h1>Arrivals</h1>
                    <p className="dashboard__updated">
                        {updatedAt
                            ? `Updated ${updatedAt.toLocaleTimeString()}`
                            : "Loading…"}
                        {" · refreshes automatically"}
                    </p>
                </div>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <button
                        type="button"
                        onClick={handleGenerateAttendanceReport}
                        disabled={generatingReport}
                        style={{
                            padding: "0.5rem 1rem",
                            background: "var(--button-bg)",
                            color: "var(--button-text)",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "600",
                            cursor: "pointer",
                            fontSize: "0.9rem"
                        }}
                    >
                        {generatingReport ? "Queueing Report..." : "📄 Generate Attendance Report (PDF)"}
                    </button>
                    <Link className="dashboard__gate-link" to="/arrivals">
                        Go to gate check-in
                    </Link>
                </div>
            </header>

            {reportNotice && (
                <div style={{ padding: "0.75rem 1rem", background: "var(--card-bg)", border: "1px solid var(--button-bg)", color: "var(--text-primary)", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.9rem" }}>
                    {reportNotice} <Link to="/admin/reports" style={{ color: "var(--button-bg)", fontWeight: "600" }}>Go to Event Reports →</Link>
                </div>
            )}

            {error && (
                <div className="dashboard__error" role="alert">{error}</div>
            )}

            <section className="dashboard__totals">

                <div className="dashboard__stat">
                    <span className="dashboard__stat-value">{summary.arrived ?? summary.here}</span>
                    <span className="dashboard__stat-label">Here</span>
                </div>

                <div className="dashboard__stat dashboard__stat--missing">
                    <span className="dashboard__stat-value">{summary.coming}</span>
                    <span className="dashboard__stat-label">Coming</span>
                </div>

                <div className="dashboard__stat">
                    <span className="dashboard__stat-value">{summary.notComing ?? 0}</span>
                    <span className="dashboard__stat-label">Not Coming</span>
                </div>

                <div className="dashboard__stat">
                    <span className="dashboard__stat-value">{summary.expected}</span>
                    <span className="dashboard__stat-label">Expected</span>
                </div>

                <div className="dashboard__overall">
                    <div
                        className="dashboard__bar"
                        role="progressbar"
                        aria-valuenow={percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Proportion arrived"
                    >
                        <span style={{ width: `${percent}%` }} />
                    </div>
                    <span className="dashboard__percent">{percent}%</span>
                </div>

            </section>

            <section>

                <h2 className="dashboard__section-title">
                    By troop
                    <span className="dashboard__hint">
                        Most outstanding first
                    </span>
                </h2>

                <ul className="dashboard__troops">

                    {troops.map(troop => {

                        const isOpen = Boolean(expanded[troop.troopId]);
                        const troopPercent = troop.expected > 0
                            ? Math.round((troop.arrived / troop.expected) * 100)
                            : 0;
                        const complete = troop.missing === 0;

                        return (

                            <li
                                key={troop.troopId}
                                className={
                                    complete
                                        ? "dashboard__troop dashboard__troop--complete"
                                        : "dashboard__troop"
                                }
                            >

                                <button
                                    type="button"
                                    className="dashboard__troop-row"
                                    aria-expanded={isOpen}
                                    onClick={() => toggle(troop.troopId)}
                                >

                                    <span className="dashboard__chevron" aria-hidden="true">
                                        {isOpen ? "▾" : "▸"}
                                    </span>

                                    <span className="dashboard__troop-number">
                                        {troop.troopNumber || "—"}
                                    </span>

                                    <span className="dashboard__troop-bar">
                                        <span
                                            className="dashboard__bar"
                                            role="progressbar"
                                            aria-valuenow={troopPercent}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-label={`${troop.troopNumber} arrivals`}
                                        >
                                            <span style={{ width: `${troopPercent}%` }} />
                                        </span>
                                    </span>

                                    <span className="dashboard__troop-counts">
                                        {troop.arrived}/{troop.expected}
                                    </span>

                                    <span className="dashboard__troop-missing">
                                        {complete ? "all in" : `${troop.missing} coming`}
                                    </span>

                                </button>

                                {isOpen && (
                                    <ul className="dashboard__people">
                                        {troop.attendees.map(attendee => (
                                            <li
                                                key={attendee.id}
                                                className={
                                                    attendee.arrival
                                                        ? "dashboard__person dashboard__person--arrived"
                                                        : attendee.status === "not_coming"
                                                        ? "dashboard__person dashboard__person--not-coming"
                                                        : "dashboard__person"
                                                }
                                                onClick={() => setSelectedDetailAttendee({ ...attendee, troopNumber: attendee.troopNumber || troop.troopNumber })}
                                                style={{ cursor: "pointer" }}
                                            >
                                                <span className="dashboard__tick" aria-hidden="true">
                                                    {attendee.arrival ? "✓" : attendee.status === "not_coming" ? "✕" : "·"}
                                                </span>
                                                <span className="dashboard__person-name">
                                                    {attendee.fullName}
                                                </span>
                                                <span className="dashboard__person-category">
                                                    {attendee.category}
                                                </span>
                                                <span className="dashboard__person-time">
                                                    {attendee.arrival
                                                        ? formatTime(attendee.arrival.arrivedAt)
                                                        : attendee.status === "not_coming"
                                                        ? "not coming"
                                                        : "not arrived"}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                            </li>

                        );

                    })}

                </ul>

            </section>

            {/* Modal: Attendee Details */}
            {selectedDetailAttendee && (
                <div className="arrivals__modal-overlay" onClick={() => setSelectedDetailAttendee(null)}>
                    <div className="arrivals__modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "36rem" }}>
                        <h2>Attendee Details</h2>
                        <div className="arrivals__detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", margin: "1rem 0" }}>
                            <div>
                                <label className="arrivals__batch-sublabel" style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Full Name</label>
                                <p style={{ margin: "0.2rem 0", fontWeight: "600", fontSize: "1.05rem", color: "var(--text-primary)" }}>{selectedDetailAttendee.fullName}</p>
                            </div>
                            <div>
                                <label className="arrivals__batch-sublabel" style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Category / Role</label>
                                <p style={{ margin: "0.2rem 0", fontWeight: "600", color: "var(--text-primary)" }}>{selectedDetailAttendee.category}</p>
                            </div>
                            <div>
                                <label className="arrivals__batch-sublabel" style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Troop Number</label>
                                <p style={{ margin: "0.2rem 0", color: "var(--text-primary)" }}>{selectedDetailAttendee.troopNumber || "—"}</p>
                            </div>
                            <div>
                                <label className="arrivals__batch-sublabel" style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Member ID</label>
                                <p style={{ margin: "0.2rem 0", color: "var(--text-primary)" }}>{selectedDetailAttendee.memberId || "—"}</p>
                            </div>
                            <div>
                                <label className="arrivals__batch-sublabel" style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Phone Number</label>
                                <p style={{ margin: "0.2rem 0", color: "var(--text-primary)" }}>{selectedDetailAttendee.phone || "—"}</p>
                            </div>
                            <div>
                                <label className="arrivals__batch-sublabel" style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Arrival Status</label>
                                <p style={{ margin: "0.2rem 0", color: "var(--text-primary)" }}>
                                    {selectedDetailAttendee.arrival
                                        ? `Checked in (${formatTime(selectedDetailAttendee.arrival.arrivedAt)})`
                                        : selectedDetailAttendee.status === "not_coming"
                                        ? "Not Coming"
                                        : "Not Arrived"}
                                </p>
                            </div>
                            <div>
                                <label className="arrivals__batch-sublabel" style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Primary Email (Parent / Main)</label>
                                <p style={{ margin: "0.2rem 0", color: "var(--text-primary)" }}>{selectedDetailAttendee.primaryEmail || selectedDetailAttendee.primary_email || "—"}</p>
                            </div>
                            <div>
                                <label className="arrivals__batch-sublabel" style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Secondary Email (Youth / Alt)</label>
                                <p style={{ margin: "0.2rem 0", color: "var(--text-primary)" }}>{selectedDetailAttendee.secondaryEmail || selectedDetailAttendee.secondary_email || "—"}</p>
                            </div>
                            <div style={{ gridColumn: "span 2" }}>
                                <label className="arrivals__batch-sublabel" style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Emergency Contact 1</label>
                                <p style={{ margin: "0.2rem 0", color: "var(--text-primary)" }}>{selectedDetailAttendee.emergencyContact1 || selectedDetailAttendee.emergency_contact_1 || "—"}</p>
                            </div>
                            <div style={{ gridColumn: "span 2" }}>
                                <label className="arrivals__batch-sublabel" style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Emergency Contact 2</label>
                                <p style={{ margin: "0.2rem 0", color: "var(--text-primary)" }}>{selectedDetailAttendee.emergencyContact2 || selectedDetailAttendee.emergency_contact_2 || "—"}</p>
                            </div>
                            {selectedDetailAttendee.category === "Adult" && (
                                <div style={{ gridColumn: "span 2" }}>
                                    <label className="arrivals__batch-sublabel" style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Youth Protection Training</label>
                                    <p style={{ margin: "0.2rem 0", color: "var(--text-primary)" }}>
                                        {selectedDetailAttendee.youthProtectionCompleted ? "✓ Completed" : "✕ Not Completed"}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="arrivals__modal-actions" style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                            <button
                                type="button"
                                className="arrivals__btn-primary"
                                onClick={() => setSelectedDetailAttendee(null)}
                                style={{ padding: "0.6rem 1.2rem", background: "var(--button-bg)", color: "var(--button-text)", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>

    );

}
