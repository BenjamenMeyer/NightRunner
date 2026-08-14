import { useEffect, useState } from "react";

import ApiService from "@/api/ApiService";

import QRScanner from "./QRScanner";
import ScoreForm from "./ScoreForm";

import "./Scoring.css";

export default function Scoring() {

    // TODO: Replace with the logged-in user's assigned station.
    // If null, the user is assumed to be HQ and may choose a station.
    const assignedStation = null;

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState(null);

    const [patrols, setPatrols] = useState([]);

    const [stations, setStations] = useState([]);

    const [selectedPatrol, setSelectedPatrol] = useState(null);

    const [selectedStation, setSelectedStation] = useState(
        assignedStation
    );

    const [showScanner, setShowScanner] = useState(false);

    const [scoringStarted, setScoringStarted] = useState(false);

    useEffect(() => {

        loadData();

    }, []);

    async function loadData() {

        try {

            setLoading(true);

            setError(null);

            const [
                patrols,
                stations
            ] = await Promise.all([
                ApiService.patrolData.getPatrols(),
                ApiService.stationData.getStations()
            ]);

            setPatrols(patrols);
            setStations(stations);

        } catch (error) {

            setError(error.message);

        } finally {

            setLoading(false);

        }

    }

    function handleManualSelection(event) {

        const patrol = patrols.find(
            patrol => patrol.id === event.target.value
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
            station => station.id === event.target.value
        );

        setSelectedStation(station ?? null);
        setScoringStarted(false);

    }

    async function startScoring() {

        // TODO:
        // await ApiService.post("/scores/start", {
        //     patrolId: selectedPatrol.id,
        //     stationId: selectedStation.id,
        //     timestamp: new Date().toISOString()
        // });

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
                                        <span>Scan QR Code</span>
                                    </button>

                                    <div className="selection-divider">
                                        OR
                                    </div>

                                    <div className="manual-selection">

                                        <label>Patrol</label>

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

                                            <small>Selected Patrol</small>

                                            <div>{selectedPatrol.programName}</div>

                                        </div>

                                    </div>

                                )}

                            </div>

                            {!assignedStation && (

                                <div className="score-selection-card">

                                    <h2>Select Station</h2>

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

                            )}

                        </>

                    ) : (

                        <div className="score-selection-card">

                            <h2>Currently Scoring</h2>

                            <div className="selected-patrol">

                                <span>📝</span>

                                <div>

                                    <small>Patrol</small>

                                    <div>{selectedPatrol.programName}</div>

                                </div>

                            </div>

                            <div className="selected-patrol">

                                <span>📍</span>

                                <div>

                                    <small>Station</small>

                                    <div>{selectedStation.name}</div>

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

                                    <strong>Patrol:</strong> {selectedPatrol.programName}

                                    <br />

                                    <strong>Station:</strong> {selectedStation.name}

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

                                {assignedStation
                                    ? "Select or scan a patrol to begin scoring."
                                    : "Select a patrol and station to begin scoring."}

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