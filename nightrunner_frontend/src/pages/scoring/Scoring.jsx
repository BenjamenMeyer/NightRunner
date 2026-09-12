import { useEffect, useState } from "react";

import ApiService from "../../api/ApiService.js";
import { useEventContext } from "../../api/helpers/event/EventContext.jsx";

import DataSelector from "../../api/helpers/qr/DataSelector.jsx";
import ScoreForm from "./ScoreForm";

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
            return;
        }

        let isMounted = true;
        ApiService.backendTransport
            .get(`/scores?eventId=${eventId}&stationId=${selectedStation.id}&patrolId=${selectedPatrol.id}`)
            .then((res) => {
                if (isMounted && res) {
                    setIsAlreadyScored(Boolean(res.isAlreadyScored));
                    setLastScoredAt(res.lastScoredAt || null);
                }
            })
            .catch(() => {
                if (isMounted) {
                    setIsAlreadyScored(false);
                    setLastScoredAt(null);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [eventId, selectedPatrol, selectedStation]);

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

        if (isAlreadyScored) {
            const confirmed = window.confirm(
                `⚠️ WARNING: Patrol "${selectedPatrol.name}" was already scored at station "${selectedStation.name}".\n\n` +
                `Are you sure you want to restart scoring for this patrol?\n\n` +
                `This will deactivate the previous score and record a new score entry. This action cannot be undone.`
            );

            if (!confirmed) {
                return;
            }

            try {
                await ApiService.backendTransport.post("/scores", {
                    action: "deactivate",
                    eventId,
                    stationId: selectedStation.id,
                    patrolId: selectedPatrol.id
                });
                setIsAlreadyScored(false);
            } catch (err) {
                console.error("Failed to deactivate previous scores:", err);
            }
        }

        setScoringStarted(true);
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
                                patrol={selectedPatrol}
                                station={selectedStation}
                                eventId={eventId}
                                onScoreSubmitted={() => {
                                    setSelectedPatrol(null);
                                    setScoringStarted(false);
                                    setIsAlreadyScored(false);
                                    setLastScoredAt(null);
                                }}
                            />
                        ) : isAlreadyScored ? (
                            <div className="ready-panel warning-panel" style={{ border: "2px solid #ef4444", background: "var(--card-bg)" }}>

                                <h2 style={{ color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
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

                                <div style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid #ef4444", padding: "12px 16px", borderRadius: "8px", color: "var(--text-primary)", fontSize: "0.9rem", textAlign: "center", maxWidth: "500px" }}>
                                    <strong>Notice:</strong> This patrol has already been scored at this station{lastScoredAt ? ` (last scored ${new Date(lastScoredAt).toLocaleTimeString()})` : ""}.
                                    <br /><br />
                                    Starting a new score session will <strong>deactivate the previous score</strong> and record new scores for this patrol.
                                </div>

                                <button
                                    className="primary-button"
                                    style={{ background: "#dc2626", borderColor: "#b91c1c", color: "#ffffff" }}
                                    onClick={startScoring}
                                >
                                    Restart Scoring (Re-Score Patrol)
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