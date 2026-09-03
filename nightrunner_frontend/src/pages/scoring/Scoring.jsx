import { useEffect, useState } from "react";

import ApiService from "@/api/ApiService";
import EventSelector from "@/api/helpers/EventSelector";

import QRScanner from "./QRScanner";
import ScoreForm from "./ScoreForm";

import "./Scoring.css";

export default function Scoring() {

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState(null);

    const [patrols, setPatrols] = useState([]);

    const [stations, setStations] = useState([]);

    const [selectedPatrol, setSelectedPatrol] = useState(null);

    const [selectedStation, setSelectedStation] = useState(null);

    const [showScanner, setShowScanner] = useState(false);

    const [showEventSelector, setShowEventSelector] = useState(false);

    const [scoringStarted, setScoringStarted] = useState(false);

    useEffect(() => {

        loadData();

    }, []);

    async function loadData(eventId = null) {

        try {

            setLoading(true);
            setError(null);

            const resolvedEventId =
                eventId ??
                ApiService.userData.getEventId();

            /*
             * System administrators may not have an event
             * assigned to their account. Let them select one.
             */
            if (!resolvedEventId) {

                if (ApiService.userData.isSystemAdmin()) {

                    setShowEventSelector(true);
                    setLoading(false);

                    return;

                }

                throw new Error(
                    "No event is currently assigned to your account."
                );

            }

            const [
                patrolResponse,
                stationResponse
            ] = await Promise.all([
                ApiService.patrolData.getPatrols(
                    resolvedEventId
                ),
                ApiService.stationData.getStations(
                    resolvedEventId
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

        } finally {

            setLoading(false);

        }

    }

    async function handleEventSelected(eventId) {

        setShowEventSelector(false);

        setSelectedPatrol(null);
        setSelectedStation(null);
        setScoringStarted(false);

        await loadData(eventId);

    }

    function handleManualSelection(event) {

        const patrol = patrols.find(
            patrol => String(patrol.id) === String(event.target.value)
        );

        setSelectedPatrol(patrol ?? null);
        setScoringStarted(false);

    }

    function handleScan(patrol) {

        setSelectedPatrol(patrol);

        setShowScanner(false);

        setScoringStarted(false);

    }

    function handleStationSelection(event) {

        const station = stations.find(
            station => String(station.id) === String(event.target.value)
        );

        setSelectedStation(station ?? null);
        setScoringStarted(false);

    }

    async function startScoring() {

        if (!selectedPatrol || !selectedStation) {
            return;
        }

        // TODO:
        // await ApiService.scoreData.start({
        //     patrolId: selectedPatrol.id,
        //     stationId: selectedStation.id,
        //     timestamp: new Date().toISOString()
        // });

        setScoringStarted(true);

    }

    return (

        <div className="scoring-page">

            {showEventSelector && (

                <EventSelector
                    onSelect={handleEventSelected}
                />

            )}

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

            {loading ? (

                <div className="loading-panel">

                    Loading...

                </div>

            ) : (

                <>

                    {!scoringStarted ? (

                        <>

                            <div className="score-selection-card">

                                <h2>Select Patrol</h2>

                                <p>
                                    Scan the patrol QR code or select one manually.
                                </p>

                                <div className="patrol-selection">

                                    <button
                                        className="scan-card"
                                        onClick={() => setShowScanner(true)}
                                    >
                                        <span className="scan-icon">📷</span>

                                        <span>
                                            Scan QR Code
                                        </span>

                                    </button>

                                    <div className="selection-divider">
                                        OR
                                    </div>

                                    <div className="manual-selection">

                                        <label>
                                            Patrol
                                        </label>

                                        <select
                                            value={selectedPatrol?.id ?? ""}
                                            onChange={handleManualSelection}
                                        >

                                            <option value="">
                                                Select Patrol...
                                            </option>

                                            {patrols.map(patrol => (

                                                <option
                                                    key={patrol.id}
                                                    value={patrol.id}
                                                >
                                                    {patrol.programName}
                                                </option>

                                            ))}

                                        </select>

                                    </div>

                                </div>

                                {selectedPatrol && (

                                    <div className="selected-patrol">

                                        <span>✓</span>

                                        <div>

                                            <small>
                                                Selected Patrol
                                            </small>

                                            <div>
                                                {selectedPatrol.programName}
                                            </div>

                                        </div>

                                    </div>

                                )}

                            </div>

                            <div className="score-selection-card">

                                <h2>
                                    Select Station
                                </h2>

                                <select
                                    value={selectedStation?.id ?? ""}
                                    onChange={handleStationSelection}
                                >

                                    <option value="">
                                        Select Station...
                                    </option>

                                    {stations.map(station => (

                                        <option
                                            key={station.id}
                                            value={station.id}
                                        >
                                            {station.name}
                                        </option>

                                    ))}

                                </select>

                            </div>

                        </>

                    ) : (

                        <div className="score-selection-card">

                            <h2>
                                Currently Scoring
                            </h2>

                            <div className="selected-patrol">

                                <span>📝</span>

                                <div>

                                    <small>
                                        Patrol
                                    </small>

                                    <div>
                                        {selectedPatrol.programName}
                                    </div>

                                </div>

                            </div>

                            <div className="selected-patrol">

                                <span>📍</span>

                                <div>

                                    <small>
                                        Station
                                    </small>

                                    <div>
                                        {selectedStation.name}
                                    </div>

                                </div>

                            </div>

                        </div>

                    )}

                    {selectedPatrol && selectedStation ? (

                        scoringStarted ? (

                            <ScoreForm
                                patrol={selectedPatrol}
                                station={selectedStation}
                            />

                        ) : (

                            <div className="ready-panel">

                                <h2>
                                    Ready to Begin
                                </h2>

                                <p>

                                    <strong>
                                        Patrol:
                                    </strong>{" "}
                                    {selectedPatrol.programName}

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

            {showScanner && (

                <QRScanner

                    onScan={handleScan}

                    onCancel={() =>
                        setShowScanner(false)
                    }

                />

            )}

        </div>

    );

}