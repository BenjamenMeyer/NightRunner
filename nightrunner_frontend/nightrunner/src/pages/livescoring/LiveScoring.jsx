import { useEffect, useRef, useState } from "react";

import { getLiveScoring } from "./LiveScoringService";

import "./LiveScoring.css";

export default function LiveScoring() {

    const [loading, setLoading] = useState(true);

    const [data, setData] = useState(null);

    const [displayMode, setDisplayMode] = useState("fit");

    const tableWrapperRef = useRef(null);

    useEffect(() => {

        async function load() {

            const response = await getLiveScoring();

            setData(response);

            setLoading(false);

        }

        load();

        const timer = setInterval(load, 15000);

        return () => clearInterval(timer);

    }, []);

    useEffect(() => {

        if (displayMode !== "auto") {

            return;

        }

        const wrapper = tableWrapperRef.current;

        if (!wrapper) {

            return;

        }

        let animationId;

        const speed = 30; // pixels per second

        let lastTime = performance.now();

        function animate(time) {

            const delta = (time - lastTime) / 1000;

            lastTime = time;

            wrapper.scrollTop += speed * delta;

            // Halfway down = finished first copy
            const halfway = wrapper.scrollHeight / 2;

            if (wrapper.scrollTop >= halfway) {

                wrapper.scrollTop -= halfway;

            }

            animationId = requestAnimationFrame(animate);

        }

        animationId = requestAnimationFrame(animate);

        return () => {

            cancelAnimationFrame(animationId);

        };

    }, [displayMode, data]);

    if (loading) {

        return <p>Loading live scoring...</p>;

    }

    // Only duplicate rows if there are more than 10 patrols AND displayMode is "auto"
    const patrolsToMap = (data.patrols.length > 10 && displayMode === "auto")
        ? [...data.patrols, ...data.patrols]
        : data.patrols;

    return (

        <div className="live-scoring-container">

            <div className="live-scoring-page">

                <div className="page-header">

                    <div>

                        <h1>Live Patrol Progress</h1>

                        <p>
                            Shows patrol progress only. Scores are not displayed.
                        </p>

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

                <div
                    ref={tableWrapperRef}
                    className={`live-table-wrapper ${displayMode}`}
                >

                    <table className={`live-table ${displayMode}`}>

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

                        {patrolsToMap.map((patrol, index) => (

                            <tr key={`${patrol.id}-${index}`}>

                                <td className="sticky-column patrol-name">

                                    {patrol.programName}

                                </td>

                                {data.stations.map(station => {

                                    const completed = true;
                                        //patrol.completed[station.id];

                                    const current = false;
                                        //patrol.currentStation === station.id;

                                    let className = "";
                                    let value = "";

                                    if (completed) {

                                        className = "completed";
                                        value = "✓";

                                    } else if (current) {

                                        className = "current";
                                        value = "⏳";

                                    }

                                    return (

                                        <td
                                            key={station.id}
                                            className={className}
                                        >

                                            {value}

                                        </td>

                                    );

                                })}

                            </tr>

                        ))}

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