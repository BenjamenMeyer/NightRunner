import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import ApiService from "../../../api/ApiService.js";
import { useEventContext } from "../../../api/helpers/event/EventContext.jsx";
import DataSelector from "../../../api/helpers/qr/DataSelector.jsx";

import StationReviewTable from "./StationReviewTable.jsx";

import "./StationReview.css";

/**
 * /scoring/review — what was entered at one station, per patrol, read-only.
 *
 * Accepts ?station=<id> to open on a station and ?patrol=<id> to highlight a
 * row; the "Patrol Already Scored" panel on the Scoring page links here with
 * both set.
 */
export default function StationReview() {
    const {
        event,
        eventId,
        loading: eventLoading,
        error: eventError
    } = useEventContext();

    const [searchParams, setSearchParams] = useSearchParams();
    const stationParam = searchParams.get("station");
    const patrolParam = searchParams.get("patrol");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stations, setStations] = useState([]);
    const [patrols, setPatrols] = useState([]);

    const [report, setReport] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportError, setReportError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const selectedStation =
        stations.find((s) => String(s.id) === String(stationParam)) ?? null;

    useEffect(() => {
        if (eventLoading) return;

        if (eventError) {
            setError(eventError);
            setLoading(false);
            return;
        }
        if (!eventId) {
            setError("No event is currently selected.");
            setLoading(false);
            return;
        }

        let isMounted = true;
        setLoading(true);
        setError(null);

        Promise.all([
            ApiService.stationData.getStations(eventId),
            ApiService.patrolData.getPatrols(eventId)
        ])
            .then(([stationResponse, patrolResponse]) => {
                if (!isMounted) return;
                const sortedStations = Array.isArray(stationResponse)
                    ? [...stationResponse].sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                    : [];
                setStations(sortedStations);
                setPatrols(Array.isArray(patrolResponse) ? patrolResponse : []);
            })
            .catch((err) => {
                console.error("Failed to load review data:", err);
                if (isMounted) setError(err?.message ?? "Unable to load stations and patrols.");
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [eventId, eventLoading, eventError]);

    useEffect(() => {
        if (!eventId || !selectedStation) {
            setReport(null);
            return;
        }

        let isMounted = true;
        setReportLoading(true);
        setReportError(null);

        ApiService.reportData
            .getStationReport(selectedStation.id, eventId)
            .then((res) => {
                if (isMounted) setReport(res ?? { patrols: [] });
            })
            .catch((err) => {
                console.error("Failed to load station entries:", err);
                if (isMounted) {
                    setReport(null);
                    setReportError(err?.message ?? "Unable to load entries for this station.");
                }
            })
            .finally(() => {
                if (isMounted) setReportLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [eventId, selectedStation?.id, refreshKey]);

    function handleStationSelection(station) {
        // Picking a different station drops the patrol highlight: it belonged
        // to the station the user arrived from.
        const next = new URLSearchParams();
        if (station) next.set("station", station.id);
        setSearchParams(next, { replace: true });
    }

    return (
        <div className="station-review-page">
            <div className="page-header">
                <div>
                    <h1>Review Entries</h1>
                    <p>What was entered at each station, patrol by patrol. Read-only.</p>
                </div>
            </div>

            {error && <div className="error-banner">{error}</div>}

            {event && !error && (
                <div className="event-context">
                    <strong>{event.name}</strong>
                </div>
            )}

            {eventLoading || loading ? (
                <div className="loading-panel">Loading...</div>
            ) : !error && (
                <>
                    <div className="review-controls">
                        <DataSelector
                            title="Select Station"
                            label="Station"
                            items={stations}
                            selected={selectedStation}
                            onSelect={handleStationSelection}
                            displayField="name"
                        />
                        {selectedStation && (
                            <button
                                type="button"
                                className="secondary-button review-refresh"
                                onClick={() => setRefreshKey((k) => k + 1)}
                                disabled={reportLoading}
                            >
                                {reportLoading ? "Refreshing..." : "Refresh"}
                            </button>
                        )}
                    </div>

                    {!selectedStation ? (
                        <div className="empty-panel">
                            <h2>Pick a station</h2>
                            <p>Choose a station to see every patrol's entries there.</p>
                        </div>
                    ) : reportError ? (
                        <div className="error-banner">{reportError}</div>
                    ) : report ? (
                        <StationReviewTable
                            station={selectedStation}
                            patrols={patrols}
                            report={report}
                            highlightPatrolId={patrolParam}
                        />
                    ) : (
                        <div className="loading-panel">Loading entries...</div>
                    )}
                </>
            )}
        </div>
    );
}
