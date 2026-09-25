import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import ApiService from "../../api/ApiService.js";
import { useEventContext } from "../../api/helpers/event/EventContext.jsx";

import DataSelector from "../../api/helpers/qr/DataSelector.jsx";
import ScoreForm from "./ScoreForm";
import { buildCorrectionValues } from "./prefill.js";

import "./Scoring.css";

export default function Scoring() {
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

    const [selectedPatrol, setSelectedPatrol] = useState(null);
    const [selectedStation, setSelectedStation] = useState(null);

    const [scoringStarted, setScoringStarted] = useState(false);
    const [isAlreadyScored, setIsAlreadyScored] = useState(false);
    const [lastScoredAt, setLastScoredAt] = useState(null);

    // The patrol's active score rows at the selected station, kept so a
    // correction can open pre-filled, and the values built from them.
    const [savedRows, setSavedRows] = useState([]);
    const [correctionValues, setCorrectionValues] = useState(null);
    const [preparingCorrection, setPreparingCorrection] = useState(false);

    // ?station=<id>&patrol=<id> pre-selects both, e.g. from "Edit" on the
    // review page. Applied once, after the lists have loaded.
    const [searchParams] = useSearchParams();
    const appliedParams = useRef(false);

    useEffect(() => {
        if (eventLoading) {
            return;
        }

        if (eventError) {
            setError(eventError);
            setPatrols([]);
            setStations([]);
            setLoading(false);
            return;
        }

        if (!eventId) {
            setError("No event is currently selected.");
            setPatrols([]);
            setStations([]);
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
        setScoringStarted(false);
        setIsAlreadyScored(false);
        setLastScoredAt(null);

        loadData(eventId);
    }, [eventId, eventLoading, eventError]);

    useEffect(() => {
        if (!selectedPatrol || !selectedStation || !eventId) {
            setIsAlreadyScored(false);
            setLastScoredAt(null);
            setSavedRows([]);
            return;
        }

        let isMounted = true;
        ApiService.backendTransport
            .get(`/scores?eventId=${eventId}&stationId=${selectedStation.id}&patrolId=${selectedPatrol.id}`)
            .then((res) => {
                if (isMounted && res) {
                    setIsAlreadyScored(Boolean(res.isAlreadyScored));
                    setLastScoredAt(res.lastScoredAt || null);
                    setSavedRows(Array.isArray(res.scores) ? res.scores : []);
                }
            })
            .catch(() => {
                if (isMounted) {
                    setIsAlreadyScored(false);
                    setLastScoredAt(null);
                    setSavedRows([]);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [eventId, selectedPatrol, selectedStation]);

    useEffect(() => {
        if (appliedParams.current || loading || stations.length === 0) {
            return;
        }
        appliedParams.current = true;

        const stationParam = searchParams.get("station");
        const patrolParam = searchParams.get("patrol");
        const station = stations.find((s) => String(s.id) === String(stationParam));
        const patrol = patrols.find((p) => String(p.id) === String(patrolParam));
        if (station) setSelectedStation(station);
        if (patrol) setSelectedPatrol(patrol);
    }, [loading, stations, patrols, searchParams]);

    async function loadData(selectedEventId) {
        try {
            setLoading(true);
            setError(null);

            const [
                patrolResponse,
                stationResponse
            ] = await Promise.all([
                ApiService.patrolData.getPatrols(
                    selectedEventId
                ),
                ApiService.stationData.getStations(
                    selectedEventId
                )
            ]);

            setPatrols(patrolResponse ?? []);
            setStations(stationResponse ?? []);
        } catch (error) {
            console.error(
                "Failed to load scoring data:",
                error
            );

            setError(
                error?.message ??
                "Unable to load scoring data."
            );

            setPatrols([]);
            setStations([]);
        } finally {
            setLoading(false);
        }
    }

    function handlePatrolSelection(patrol) {
        setSelectedPatrol(patrol);
        setScoringStarted(false);
    }

    function handleStationSelection(station) {
        setSelectedStation(station);
        setScoringStarted(false);
    }

    async function startScoring() {
        if (!selectedPatrol || !selectedStation) {
            return;
        }

        if (!isAlreadyScored) {
            setCorrectionValues(null);
            setScoringStarted(true);
            return;
        }

        // Correcting an already-scored patrol. Nothing is deactivated here:
        // POST /v1/scores replaces each task's previous row as the new one is
        // written, so the saved entries stay live until the corrected form is
        // submitted. Walking away mid-correction loses nothing.
        //
        // The judge comment lives on the visit, not on the score rows, so it
        // comes from the station report. Losing it is not worth blocking a
        // correction over.
        setPreparingCorrection(true);
        let comments = "";
        try {
            const report = await ApiService.reportData.getStationReport(selectedStation.id, eventId);
            const entry = (report?.patrols || []).find(
                (p) => String(p.patrolId) === String(selectedPatrol.id)
            );
            comments = entry?.comments || "";
        } catch (err) {
            console.error("Failed to load saved comments for correction:", err);
        } finally {
            setPreparingCorrection(false);
        }

        setCorrectionValues(buildCorrectionValues(selectedStation.tasks || [], savedRows, comments));
        setScoringStarted(true);
    }

    function cancelCorrection() {
        setCorrectionValues(null);
        setScoringStarted(false);
    }

    return (
        <div className="scoring-page">

            <div className="page-header">

                <div>

                    <h1>
                        Scoring
                    </h1>

                    <p>
                        Record patrol scores for each station.
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
                    {!scoringStarted ? (
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
                        </>

                    ) : (
                        <div className="score-selection-card">

                            <h2>
                                Currently Scoring
                            </h2>

                            <div className="selected-data">

                                <span>
                                    📝
                                </span>

                                <div>

                                    <small>
                                        Patrol
                                    </small>

                                    <div>
                                        {selectedPatrol.name}
                                    </div>

                                </div>

                            </div>

                            <div className="selected-data">

                                <span>
                                    📍
                                </span>

                                <div>

                                    <small>
                                        Station
                                    </small>

                                    <div>
                                        {selectedStation.name}
                                    </div>

                                </div>

                            </div>

                            {selectedStation.description && (
                                <div className="station-scenario-card" style={{ marginTop: "16px", padding: "12px 16px", background: "var(--input-bg)", border: "1px solid var(--button-bg)", borderRadius: "8px", textAlign: "left" }}>
                                    <strong style={{ display: "block", marginBottom: "4px", color: "var(--text-primary)" }}>📋 Station Scenario / Instructions:</strong>
                                    <p style={{ margin: "0", whiteSpace: "pre-wrap", color: "var(--text-primary)", fontSize: "0.95rem", lineHeight: "1.5" }}>
                                        {selectedStation.description}
                                    </p>
                                </div>
                            )}

                        </div>
                    )}

                    {selectedPatrol && selectedStation ? (
                        scoringStarted ? (
                            <ScoreForm
                                // Remount per patrol/station/mode so a correction's
                                // pre-filled values are read fresh every time.
                                key={`${selectedStation.id}:${selectedPatrol.id}:${correctionValues ? "edit" : "new"}`}
                                patrol={selectedPatrol}
                                station={selectedStation}
                                eventId={eventId}
                                initialValues={correctionValues}
                                onCancel={correctionValues ? cancelCorrection : null}
                                onScoreSubmitted={() => {
                                    setSelectedPatrol(null);
                                    setScoringStarted(false);
                                    setIsAlreadyScored(false);
                                    setLastScoredAt(null);
                                    setSavedRows([]);
                                    setCorrectionValues(null);
                                }}
                            />
                        ) : isAlreadyScored ? (
                            <div className="ready-panel warning-panel" style={{ border: "2px solid var(--error)", background: "var(--card-bg)" }}>

                                <h2 style={{ color: "var(--error)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                    <span>⚠️</span> Patrol Already Scored
                                </h2>

                                <p style={{ margin: "0" }}>

                                    <strong>
                                        Patrol:
                                    </strong>{" "}
                                    {selectedPatrol.name}

                                    <br />

                                    <strong>
                                        Station:
                                    </strong>{" "}
                                    {selectedStation.name}

                                </p>

                                <div style={{ background: "var(--page-bg)", border: "1px solid var(--error)", padding: "12px 16px", borderRadius: "8px", color: "var(--text-primary)", fontSize: "0.9rem", textAlign: "center", maxWidth: "500px" }}>
                                    <strong>Notice:</strong> This patrol has already been scored at this station{lastScoredAt ? ` (last scored ${new Date(lastScoredAt).toLocaleTimeString()})` : ""}.
                                    <br /><br />
                                    To fix an entry, open the saved entries below. The form opens with what was
                                    entered. Change what's wrong and submit. <strong>Nothing changes until you
                                    submit.</strong> The earlier entries are kept in the history.
                                </div>

                                <Link
                                    className="review-entries-link"
                                    to={`/scoring/review?station=${encodeURIComponent(selectedStation.id)}&patrol=${encodeURIComponent(selectedPatrol.id)}`}
                                >
                                    Review what was entered →
                                </Link>

                                <button
                                    className="primary-button"
                                    onClick={startScoring}
                                    disabled={preparingCorrection}
                                >
                                    {preparingCorrection ? "Loading saved entries..." : "Edit Saved Entries"}
                                </button>

                            </div>
                        ) : (
                            <div className="ready-panel">

                                <h2>
                                    Ready to Begin
                                </h2>

                                <p>

                                    <strong>
                                        Patrol:
                                    </strong>{" "}
                                    {selectedPatrol.name}

                                    <br />

                                    <strong>
                                        Station:
                                    </strong>{" "}
                                    {selectedStation.name}

                                </p>

                                <button
                                    className="primary-button"
                                    onClick={startScoring}
                                >
                                    Start Scoring
                                </button>

                            </div>
                        )
                    ) : (
                        <div className="empty-panel">

                            <h2>
                                Ready to Score
                            </h2>

                            <p>
                                Select a patrol and station to begin scoring.
                            </p>

                        </div>
                    )}
                </>
            )}

        </div>
    );
}