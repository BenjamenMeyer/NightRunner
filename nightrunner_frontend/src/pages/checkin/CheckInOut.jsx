import { useEffect, useState } from "react";

import ApiService from "../../api/ApiService.js";
import { useEventContext } from "../../api/helpers/event/EventContext.jsx";

import DataSelector from "../../api/helpers/qr/DataSelector.jsx";
import ConfirmDialog, { patrolLabel } from "../../components/ConfirmDialog.jsx";

import "./CheckInOut.css";

const ACTIONS = {
    CHECK_IN: "check-in",
    CHECK_OUT: "check-out"
};

export default function CheckInOut() {
    const {
        event,
        eventId,
        loading: eventLoading,
        error: eventError
    } = useEventContext();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [patrols, setPatrols] = useState([]);
    const [stations, setStations] = useState([]);

    const [action, setAction] = useState(
        ACTIONS.CHECK_IN
    );

    const [selectedPatrol, setSelectedPatrol] =
        useState(null);

    const [selectedStation, setSelectedStation] =
        useState(null);

    const [completed, setCompleted] =
        useState(false);

    const [visits, setVisits] = useState([]);

    useEffect(() => {
        if (eventLoading) {
            return;
        }

        if (eventError) {
            setError(eventError);
            setPatrols([]);
            setStations([]);
            setVisits([]);
            setLoading(false);
            return;
        }

        if (!eventId) {
            setError("No event is currently selected.");
            setPatrols([]);
            setStations([]);
            setVisits([]);
            setLoading(false);
            return;
        }

        /*
         * The selected event changed.
         *
         * Anything selected from the previous event is
         * no longer valid.
         */
        setSelectedPatrol(null);
        setSelectedStation(null);
        setCompleted(false);

        loadData(eventId);
    }, [
        eventId,
        eventLoading,
        eventError
    ]);

    async function loadData(selectedEventId) {
        try {
            setLoading(true);
            setError(null);

            const [
                patrolResponse,
                stationResponse,
                visitResponse
            ] = await Promise.all([
                ApiService.patrolData.getPatrols(
                    selectedEventId
                ),
                ApiService.stationData.getStations(
                    selectedEventId
                ),
                ApiService.checkInData.getVisits(
                    selectedEventId
                ).catch(() => ({ visits: [] }))
            ]);

            setPatrols(
                patrolResponse ?? []
            );

            setStations(
                stationResponse ?? []
            );

            setVisits(
                visitResponse?.visits ?? []
            );
        } catch (error) {
            console.error(
                "Failed to load check-in/out data:",
                error
            );

            setError(
                error?.message ??
                "Unable to load check-in/out data."
            );

            setPatrols([]);
            setStations([]);
            setVisits([]);
        } finally {
            setLoading(false);
        }
    }

    // Helper to find the current active/latest visit record for a patrol & station
    function getVisitRecord(patrolId, stationId) {
        if (!patrolId || !stationId || !visits) return null;
        // Search visits for matching patrol and station, taking the latest one
        const matches = visits.filter(
            (v) => String(v.patrolId) === String(patrolId) && String(v.stationId) === String(stationId)
        );
        if (matches.length === 0) return null;
        // Sort descending by createdAt or checkedInAt
        matches.sort((a, b) => new Date(b.createdAt || b.checkedInAt) - new Date(a.createdAt || a.checkedInAt));
        return matches[0];
    }

    // Determine current status string and recommended action for chosen patrol & station
    const activeVisit = selectedPatrol && selectedStation ? getVisitRecord(selectedPatrol.id, selectedStation.id) : null;
    const isScoringCompleted = Boolean(activeVisit && activeVisit.status === "completed");
    const isCurrentlyCheckedIn = Boolean(activeVisit && activeVisit.checkedInAt && !activeVisit.checkedOutAt && activeVisit.status !== "completed");
    const isCurrentlyCheckedOut = Boolean(activeVisit && activeVisit.checkedOutAt && activeVisit.status !== "completed");

    function handleActionChange(nextAction) {
        setAction(nextAction);
        setCompleted(false);
    }

    // Every check-in and check-out asks first (#234): on a phone at night the
    // button is easy to hit for the wrong patrol or the wrong station.
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    function handleStationSelection(station) {
        setSelectedStation(station);
        setCompleted(false);
        if (selectedPatrol && station) {
            const v = getVisitRecord(selectedPatrol.id, station.id);
            if (v && v.checkedInAt && !v.checkedOutAt && v.status !== "completed") {
                setAction(ACTIONS.CHECK_OUT);
            } else {
                setAction(ACTIONS.CHECK_IN);
            }
        }
    }

    function handlePatrolSelection(patrol) {
        setSelectedPatrol(patrol);
        setCompleted(false);
        if (patrol && selectedStation) {
            const v = getVisitRecord(patrol.id, selectedStation.id);
            if (v && v.checkedInAt && !v.checkedOutAt && v.status !== "completed") {
                setAction(ACTIONS.CHECK_OUT);
            } else {
                setAction(ACTIONS.CHECK_IN);
            }
        }
    }

    async function handleResetVisit() {
        if (!selectedPatrol || !selectedStation) return;
        const confirmMsg = "Are you sure you want to reopen/reset scoring for this station attempt?\n\nWithin 5 minutes of completion, volunteers can reopen scoring. Beyond 5 minutes, Station Leader / Admin authorization is required.";
        if (!window.confirm(confirmMsg)) return;

        try {
            setIsResetting(true);
            setError(null);
            await ApiService.checkInData.resetVisit({
                eventId,
                patrolId: selectedPatrol.id,
                stationId: selectedStation.id
            });
            alert("Station attempt reopened successfully.");
            if (eventId) {
                const vRes = await ApiService.checkInData.getVisits(eventId);
                setVisits(vRes?.visits ?? []);
            }
        } catch (err) {
            console.error("Failed to reset visit:", err);
            setError(err?.message ?? "Failed to reopen station attempt.");
        } finally {
            setIsResetting(false);
        }
    }

    async function executeCheckInOrOut() {
        try {
            setIsSaving(true);
            setError(null);
            let res;
            if (action === ACTIONS.CHECK_IN) {
                res = await ApiService.checkInData.checkIn({
                    eventId,
                    patrolId: selectedPatrol.id,
                    stationId: selectedStation.id,
                    timestamp: new Date().toISOString()
                });
            } else {
                res = await ApiService.checkInData.checkOut({
                    eventId,
                    patrolId: selectedPatrol.id,
                    stationId: selectedStation.id,
                    timestamp: new Date().toISOString()
                });
            }
            setCompleted(true);
            // Refresh visits list in background to keep local state synchronized
            if (eventId) {
                ApiService.checkInData.getVisits(eventId).then((vRes) => {
                    setVisits(vRes?.visits ?? []);
                }).catch(() => {});
            }
        } catch (err) {
            console.error("Check-in/out error:", err);
            setError(err?.message ?? `Failed to perform ${actionName.toLowerCase()}.`);
        } finally {
            setIsSaving(false);
            setShowConfirmModal(false);
        }
    }

    async function handleSubmit() {
        if (
            !selectedPatrol ||
            !selectedStation
        ) {
            return;
        }

        if (isScoringCompleted) {
            setError("Station attempt is completed/locked. Reopen scoring below before re-checking in.");
            return;
        }

        // Nothing is recorded until the volunteer confirms. A patrol that
        // already checked out gets the warning version of the dialog.
        setShowConfirmModal(true);
    }

    function reset() {
        setSelectedPatrol(null);
        setCompleted(false);
        setShowConfirmModal(false);
    }

    const actionName =
        action === ACTIONS.CHECK_IN
            ? "Check In"
            : "Check Out";

    const isRecheckIn = action === ACTIONS.CHECK_IN && isCurrentlyCheckedOut;

    const canSubmit =
        selectedPatrol !== null &&
        selectedStation !== null &&
        !isScoringCompleted;

    return (
        <div className="checkin-page">

            <div className="page-header">

                <div>

                    <h1>
                        Check In / Check Out
                    </h1>

                    <p>
                        Record when a patrol arrives at or leaves a station.
                    </p>

                </div>

            </div>

            {error && (
                <div className="error-banner">
                    {error}
                </div>
            )}

            {event && !error && (
                <div className="event-context">
                    <strong>
                        {event.name}
                    </strong>
                </div>
            )}

            {eventLoading || loading ? (
                <div className="loading-panel">
                    Loading...
                </div>
            ) : (
                <>
                    {!completed ? (
                        <>
                            <DataSelector
                                title="Select Station"
                                label="Station"
                                items={stations}
                                selected={selectedStation}
                                onSelect={
                                    handleStationSelection
                                }
                                displayField="name"
                            />

                            <DataSelector
                                title="Select Patrol"
                                description="Scan the patrol QR code or select one manually."
                                label="Patrol"
                                items={patrols}
                                selected={selectedPatrol}
                                onSelect={
                                    handlePatrolSelection
                                }
                                displayField="name"
                                allowScan
                            />

                            <div className="checkin-submit-panel">

                                <h2>
                                    {actionName}
                                </h2>

                                {selectedPatrol && selectedStation ? (
                                    <>
                                        {isScoringCompleted && (
                                            <div className="visit-status-badge badge-locked" style={{ background: "#f8d7da", color: "#721c24", padding: "8px 12px", borderRadius: "4px", marginBottom: "12px" }}>
                                                🔒 Station Attempt Completed & Locked. Patrols only get 1 attempt per station.
                                            </div>
                                        )}
                                        {isCurrentlyCheckedIn && (
                                            <div className="visit-status-badge badge-checked-in">
                                                Status: Checked In (since {new Date(activeVisit.checkedInAt).toLocaleTimeString()})
                                            </div>
                                        )}
                                        {isCurrentlyCheckedOut && (
                                            <div className="visit-status-badge badge-checked-out">
                                                Status: Checked Out (at {new Date(activeVisit.checkedOutAt).toLocaleTimeString()})
                                            </div>
                                        )}
                                        {!isCurrentlyCheckedIn && !isCurrentlyCheckedOut && !isScoringCompleted && (
                                            <div className="visit-status-badge badge-not-arrived">
                                                Status: Not Arrived
                                            </div>
                                        )}
                                        <p>
                                            <strong>
                                                {patrolLabel(selectedPatrol)}
                                            </strong>
                                            {" "}
                                            will be marked as{" "}
                                            <strong>
                                                {action === ACTIONS.CHECK_IN
                                                    ? "checked in"
                                                    : "checked out"}
                                            </strong>
                                            {" "}
                                            at{" "}
                                            <strong>
                                                {selectedStation.name}
                                            </strong>.
                                        </p>
                                    </>
                                ) : (
                                    <p>
                                        Select a station and patrol to continue.
                                    </p>
                                )}

                                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                                    <button
                                        type="button"
                                        className="primary-button"
                                        disabled={!canSubmit}
                                        onClick={handleSubmit}
                                    >
                                        {actionName}
                                    </button>

                                    {isScoringCompleted && (
                                        <button
                                            type="button"
                                            className="secondary-button"
                                            onClick={handleResetVisit}
                                            disabled={isResetting}
                                        >
                                            {isResetting ? "Reopening..." : "🔓 Reopen Station Attempt"}
                                        </button>
                                    )}
                                </div>

                            </div>
                        </>
                    ) : (
                        <div className="checkin-complete-panel">

                            <div className="checkin-complete-icon">
                                ✓
                            </div>

                            <h2>
                                {actionName} Complete
                            </h2>

                            <p>
                                <strong>
                                    {patrolLabel(selectedPatrol)}
                                </strong>
                                {" "}
                                has been{" "}
                                {action === ACTIONS.CHECK_IN
                                    ? "checked in"
                                    : "checked out"}
                                {" "}
                                at{" "}
                                <strong>
                                    {selectedStation.name}
                                </strong>.
                            </p>

                            <button
                                type="button"
                                className="primary-button"
                                onClick={reset}
                            >
                                Check Another Patrol
                            </button>

                        </div>
                    )}
                </>
            )}

            <ConfirmDialog
                open={showConfirmModal && Boolean(selectedPatrol && selectedStation)}
                variant={isRecheckIn ? "warning" : "neutral"}
                title={isRecheckIn ? "Check this patrol in again?" : `${actionName}?`}
                confirmLabel={isRecheckIn ? "Yes, check in again" : `Yes, ${actionName.toLowerCase()}`}
                busy={isSaving}
                onConfirm={executeCheckInOrOut}
                onCancel={() => setShowConfirmModal(false)}
            >
                {isRecheckIn ? (
                    <>
                        <p>
                            <strong>{patrolLabel(selectedPatrol)}</strong> has already checked
                            out from <strong>{selectedStation?.name}</strong>.
                        </p>
                        <p>Check them in again for another visit?</p>
                    </>
                ) : (
                    <p>
                        Checking <strong>{patrolLabel(selectedPatrol)}</strong>{" "}
                        <span className="confirm-dialog-direction">{action === ACTIONS.CHECK_IN ? "IN" : "OUT"}</span> at{" "}
                        <strong>{selectedStation?.name}</strong>.
                    </p>
                )}
            </ConfirmDialog>

        </div>
    );
}