import {
    useEffect,
    useRef,
    useState
} from "react";

import {
    useEventContext
} from "../../../api/helpers/event/EventContext.jsx";

import { getLiveScoring } from "./LiveStatusService.js";
import ProgressGrid from "./ProgressGrid.jsx";

import "./LiveStatus.css";

export default function LiveStatus() {
    const {
        event,
        eventId,
        loading: eventLoading,
        error: eventError
    } = useEventContext();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [displayMode, setDisplayMode] = useState("fit");
    const [refreshInterval, setRefreshInterval] = useState(15000);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const tableWrapperRef = useRef(null);

    const loadData = async (isManual = false) => {
        if (!eventId) return;
        if (isManual) setIsRefreshing(true);

        try {
            const response = await getLiveScoring(eventId);
            setData(response);
            setError(null);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Failed to load live scoring:", err);
            setError(err?.message ?? "Unable to load live scoring.");
        } finally {
            setLoading(false);
            if (isManual) setIsRefreshing(false);
        }
    };

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

        setLoading(true);
        loadData();

        if (refreshInterval > 0) {
            const timer = setInterval(() => loadData(false), refreshInterval);
            return () => clearInterval(timer);
        }
    }, [eventId, eventLoading, eventError, refreshInterval]);

    useEffect(() => {
        if (displayMode !== "auto") return;

        const wrapper = tableWrapperRef.current;
        if (!wrapper) return;

        let animationId;
        const speed = 30;
        let lastTime = performance.now();

        function animate(time) {
            const delta = (time - lastTime) / 1000;
            lastTime = time;
            wrapper.scrollTop += speed * delta;

            const halfway = wrapper.scrollHeight / 2;
            if (halfway > 0 && wrapper.scrollTop >= halfway) {
                wrapper.scrollTop -= halfway;
            }
            animationId = requestAnimationFrame(animate);
        }

        animationId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationId);
    }, [displayMode, data]);

    if (eventLoading || loading) {
        return <p>Loading live scoring...</p>;
    }

    if (error) {
        return (
            <div className="live-scoring-container">
                <div className="live-scoring-page">
                    <div className="error-banner">{error}</div>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="live-scoring-container">
                <div className="live-scoring-page">
                    <div className="error-banner">No live scoring data available.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="live-scoring-container">
            <div className="live-scoring-page">
                <div className="page-header">
                    <div>
                        <h1>Live Patrol Progress</h1>
                        <p>
                            {event?.name ? `${event.name} — ` : ""}
                            Shows patrol progress across stations. Scores are not displayed.
                        </p>
                    </div>

                    <div className="controls-row">
                        <div className="refresh-controls">
                            <label htmlFor="refresh-rate-select" className="refresh-label">
                                Refresh:
                            </label>
                            <select
                                id="refresh-rate-select"
                                className="refresh-select"
                                value={refreshInterval}
                                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                            >
                                <option value={0}>Manual (Off)</option>
                                <option value={5000}>5s</option>
                                <option value={10000}>10s</option>
                                <option value={15000}>15s (Default)</option>
                                <option value={30000}>30s</option>
                                <option value={60000}>60s</option>
                            </select>

                            <button
                                type="button"
                                className="primary-button refresh-button"
                                onClick={() => loadData(true)}
                                disabled={isRefreshing}
                                title="Refresh Now"
                            >
                                {isRefreshing ? "Refreshing..." : "🔄 Refresh Now"}
                            </button>

                            {lastUpdated && (
                                <span className="last-updated-tag">
                                    Updated {lastUpdated.toLocaleTimeString()}
                                </span>
                            )}
                        </div>

                        <div className="view-buttons">
                            <button
                                className={`primary-button ${displayMode === "fit" ? "active" : ""}`}
                                onClick={() => setDisplayMode("fit")}
                            >
                                Fit
                            </button>
                            <button
                                className={`primary-button ${displayMode === "auto" ? "active" : ""}`}
                                onClick={() => setDisplayMode("auto")}
                            >
                                Auto Scroll
                            </button>
                            <button
                                className={`primary-button ${displayMode === "manual" ? "active" : ""}`}
                                onClick={() => setDisplayMode("manual")}
                            >
                                Manual
                            </button>
                        </div>
                    </div>
                </div>

                <ProgressGrid
                    stations={data.stations}
                    patrols={data.patrols}
                    visits={data.visits}
                    displayMode={displayMode}
                    tableWrapperRef={tableWrapperRef}
                />

            </div>
        </div>
    );
}