import { useState, useEffect } from "react";

import ApiService from "../../api/ApiService.js";
import UserService from "../../api/UserService.js";
import ScoreField from "./ScoreField";

import "./Scoring.css";

export default function ScoreForm({
                                      patrol,
                                      station,
                                      eventId,
                                      configurationId
                                  }) {

    const [scores, setScores] = useState({});
    const [comments, setComments] = useState("");
    const [entryMode, setEntryMode] = useState("live"); // Default: "live"
    const [isManualAllowed, setIsManualAllowed] = useState(false);
    const [stationStartedAt, setStationStartedAt] = useState(null);
    const [stationCompletedAt, setStationCompletedAt] = useState(null);

    useEffect(() => {
        const userService = new UserService();
        const cachedUser = userService.getCached();
        if (cachedUser) {
            // Check if admin or has scorer/scoring-center role for this event (support single role or multiple roles)
            const eventRole = cachedUser.roles?.[eventId];
            const rolesList = Array.isArray(eventRole) ? eventRole : [eventRole, ...(cachedUser.roles ? Object.values(cachedUser.roles) : [])];
            const allowed = cachedUser.isAdmin || rolesList.some(r => r === "scorer" || r === "admin" || r === "scoring-center" || r === "event-admin");
            setIsManualAllowed(allowed);
        } else {
            // Default to allowed so fallback works if user cache is empty
            setIsManualAllowed(true);
        }
    }, [eventId]);

    function updateScore(taskId, value) {

        setScores(current => ({
            ...current,
            [taskId]: value
        }));

    }

    async function submitScore() {

        const confirmed = window.confirm(
            "Are you sure you want to submit this score?\n\nThis action cannot be undone."
        );

        if (!confirmed) {
            return;
        }

        try {

            const missingTask = station.tasks.find(task => {
                const value = scores[task.id];

                switch (task.scoreValue?.type || task.type) {
                    case "Completed":
                        return typeof value !== "boolean";

                    case "RangeRated":
                    case "DeltaTime":
                        return typeof value !== "number" || Number.isNaN(value);

                    case "MultiChoice":
                        return value === undefined || value === null;

                    case "Stopwatch":
                    case "Timed Challenge":
                        return (
                            !value ||
                            typeof value !== "object" ||
                            (value.elapsedSeconds === undefined && !value.startTime)
                        );

                    default:
                        return value === undefined || value === null;
                }
            });

            if (missingTask) {
                alert(`Please complete "${missingTask.description}" before submitting.`);
                return;
            }

            const submission = {

                eventId,

                patrolId: patrol.id,

                stationId: station.id,

                configurationId,

                timestamp: new Date().toISOString(),

                entryMode,

                startedAt: stationStartedAt,

                completedAt: stationCompletedAt,

                scores: (station.tasks ?? []).map(task => ({

                    taskId: task.id,

                    value: scores[task.id]

                })),

                comments: comments?.trim() || "None."

            };

            await ApiService.backendTransport.post(
                "/scores",
                submission
            );

            alert("Score submitted.");

            setScores({});
            setComments("");
            setStationStartedAt(null);
            setStationCompletedAt(null);

        }
        catch (error) {

            alert(error.message);

        }

    }

    return (

        <div className="score-card">

            <div className="score-header">

                <div>

                    <h2>{patrol.programName}</h2>

                    <p>{station.name}</p>

                </div>

                {isManualAllowed && (
                    <div className="entry-mode-toggle" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <label style={{ fontWeight: "bold", fontSize: "0.85rem" }}>Manual Paper Entry Mode:</label>
                        <input
                            type="checkbox"
                            checked={entryMode === "manual"}
                            onChange={(e) => setEntryMode(e.target.checked ? "manual" : "live")}
                        />
                    </div>
                )}

            </div>

            <div className="station-timing-section" style={{ background: "#f8f9fa", padding: "12px", borderRadius: "6px", marginBottom: "16px" }}>
                <h4 style={{ margin: "0 0 8px 0" }}>Station Activity Timing</h4>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                    <div>
                        <label style={{ fontSize: "0.85rem", display: "block", marginBottom: "4px" }}>Station Started At (UTC):</label>
                        <input
                            type="text"
                            placeholder="YYYY-MM-DDTHH:MM:SSZ"
                            value={stationStartedAt || ""}
                            onChange={(e) => setStationStartedAt(e.target.value || null)}
                            style={{ padding: "6px", width: "220px" }}
                        />
                        {entryMode === "live" && (
                            <button
                                type="button"
                                style={{ marginLeft: "8px", padding: "6px 10px" }}
                                onClick={() => setStationStartedAt(new Date().toISOString())}
                            >
                                Set Now
                            </button>
                        )}
                    </div>

                    <div>
                        <label style={{ fontSize: "0.85rem", display: "block", marginBottom: "4px" }}>Station Completed At (UTC):</label>
                        <input
                            type="text"
                            placeholder="YYYY-MM-DDTHH:MM:SSZ"
                            value={stationCompletedAt || ""}
                            onChange={(e) => setStationCompletedAt(e.target.value || null)}
                            style={{ padding: "6px", width: "220px" }}
                        />
                        {entryMode === "live" && (
                            <button
                                type="button"
                                style={{ marginLeft: "8px", padding: "6px 10px" }}
                                onClick={() => setStationCompletedAt(new Date().toISOString())}
                            >
                                Set Now
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="tasks-section">

                <h3>Station Tasks</h3>

                {(station.tasks ?? []).map((task, idx) => {
                    const taskId = task.id || task._id || `task-${idx}`;
                    return (
                        <ScoreField
                            key={taskId}
                            task={{ ...task, id: taskId }}
                            value={scores[taskId]}
                            onChange={(value) =>
                                updateScore(taskId, value)
                            }
                        />
                    );
                })}

            </div>

            <div className="comments-section">

                <label>Judge Comments</label>

                <textarea
                    rows="5"
                    placeholder="Additional notes..."
                    value={comments}
                    onChange={(e) =>
                        setComments(e.target.value)
                    }
                />

            </div>

            <div className="submit-row">

                <button
                    className="primary-button"
                    onClick={submitScore}
                >

                    Submit Score

                </button>

            </div>

        </div>

    );

}