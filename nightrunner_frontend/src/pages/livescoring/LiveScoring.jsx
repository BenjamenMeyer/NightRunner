import {
    useEffect,
    useRef,
    useState
} from "react";

import {
    useEventContext
} from "../../api/helpers/EventContext.jsx";

import { getLiveScoring } from "./LiveScoringService";

import "./LiveScoring.css";

export default function LiveScoring() {
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

    const tableWrapperRef = useRef(null);

    useEffect(() => {
        if (eventLoading) {
            return;
        }

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

        let cancelled = false;

        async function load() {
            try {
                const response =
                    await getLiveScoring(eventId);

                if (!cancelled) {
                    setData(response);
                    setError(null);
                    setLoading(false);
                }
            } catch (error) {
                console.error(
                    "Failed to load live scoring:",
                    error
                );

                if (!cancelled) {
                    setError(
                        error?.message ??
                        "Unable to load live scoring."
                    );

                    setLoading(false);
                }
            }
        }

        setLoading(true);
        load();

        const timer =
            setInterval(load, 15000);

        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [
        eventId,
        eventLoading,
        eventError
    ]);

    useEffect(() => {
        if (displayMode !== "auto") {
            return;
        }

        const wrapper =
            tableWrapperRef.current;

        if (!wrapper) {
            return;
        }

        let animationId;

        const speed = 30;
        let lastTime = performance.now();

        function animate(time) {
            const delta =
                (time - lastTime) / 1000;

            lastTime = time;

            wrapper.scrollTop +=
                speed * delta;

            const halfway =
                wrapper.scrollHeight / 2;

            if (
                halfway > 0 &&
                wrapper.scrollTop >= halfway
            ) {
                wrapper.scrollTop -= halfway;
            }

            animationId =
                requestAnimationFrame(animate);
        }

        animationId =
            requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [
        displayMode,
        data
    ]);

    if (
        eventLoading ||
        loading
    ) {
        return (
            <p>
                Loading live scoring...
            </p>
        );
    }

    if (error) {
        return (
            <div className="live-scoring-container">
                <div className="live-scoring-page">
                    <div className="error-banner">
                        {error}
                    </div>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="live-scoring-container">
                <div className="live-scoring-page">
                    <div className="error-banner">
                        No live scoring data available.
                    </div>
                </div>
            </div>
        );
    }

    const patrolsToMap =
        data.patrols.length > 10 &&
        displayMode === "auto"
            ? [...data.patrols, ...data.patrols]
            : data.patrols;

    return (
        <div className="live-scoring-container">
            <div className="live-scoring-page">
                <div className="page-header">
                    <div>
                        <h1>
                            Live Patrol Progress
                        </h1>

                        <p>
                            {event?.name
                                ? `${event.name} — `
                                : ""}
                            Shows patrol progress only.
                            Scores are not displayed.
                        </p>
                    </div>

                    <div className="view-buttons">
                        <button
                            className={
                                `primary-button ${
                                    displayMode === "fit"
                                        ? "active"
                                        : ""
                                }`
                            }
                            onClick={() =>
                                setDisplayMode("fit")
                            }
                        >
                            Fit
                        </button>

                        <button
                            className={
                                `primary-button ${
                                    displayMode === "auto"
                                        ? "active"
                                        : ""
                                }`
                            }
                            onClick={() =>
                                setDisplayMode("auto")
                            }
                        >
                            Auto Scroll
                        </button>

                        <button
                            className={
                                `primary-button ${
                                    displayMode === "manual"
                                        ? "active"
                                        : ""
                                }`
                            }
                            onClick={() =>
                                setDisplayMode("manual")
                            }
                        >
                            Manual
                        </button>
                    </div>
                </div>

                <div
                    ref={tableWrapperRef}
                    className={
                        `live-table-wrapper ${displayMode}`
                    }
                >
                    <table
                        className={
                            `live-table ${displayMode}`
                        }
                    >
                        <thead>
                        <tr>
                            <th className="sticky-column">
                                Patrol
                            </th>

                            {data.stations.map(station => (
                                <th key={station.id}>
                                    {station.name}
                                </th>
                            ))}
                        </tr>
                        </thead>

                        <tbody>
                        {patrolsToMap.map(
                            (patrol, index) => (
                                <tr
                                    key={
                                        `${patrol.id}-${index}`
                                    }
                                >
                                    <td className="sticky-column patrol-name">
                                        {patrol.programName}
                                    </td>

                                    {data.stations.map(
                                        station => {
                                            const completed =
                                                true;
                                            // patrol.completed[station.id];

                                            const current =
                                                false;
                                            // patrol.currentStation === station.id;

                                            let className = "";
                                            let value = "";

                                            if (completed) {
                                                className =
                                                    "completed";
                                                value = "✓";
                                            } else if (current) {
                                                className =
                                                    "current";
                                                value = "⏳";
                                            }

                                            return (
                                                <td
                                                    key={
                                                        station.id
                                                    }
                                                    className={
                                                        className
                                                    }
                                                >
                                                    {value}
                                                </td>
                                            );
                                        }
                                    )}
                                </tr>
                            )
                        )}
                        </tbody>
                    </table>
                </div>

                <div className="legend">
                    <span className="legend-item">
                        <span className="legend-box completed"></span>
                        Completed
                    </span>

                    <span className="legend-item">
                        <span className="legend-box current"></span>
                        Currently at Station
                    </span>
                </div>
            </div>
        </div>
    );
}