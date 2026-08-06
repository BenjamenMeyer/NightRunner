import { useState } from "react";

import ApiService from "@/api/ApiService";
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

                switch (task.scoreValue?.type) {
                    case "Completed":
                        return typeof value !== "boolean";

                    case "RangeRated":
                    case "DeltaTime":
                        return typeof value !== "number" || Number.isNaN(value);

                    case "MultiChoice":
                        return value === undefined || value === null;

                    case "Stopwatch":
                        return (
                            !value ||
                            !value.startTime ||
                            !value.endTime
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

                scores: (station.tasks ?? []).map(task => ({

                    taskId: task.id,

                    value: scores[task.id]

                })),

                comments: comments?.trim() || "None."

            };

            await ApiService.post(
                "/scores",
                submission
            );

            alert("Score submitted.");

            setScores({});
            setComments("");

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

            </div>

            <div className="tasks-section">

                <h3>Station Tasks</h3>

                {(station.tasks ?? []).map(task => (

                    <ScoreField
                        key={task.id}
                        task={task}
                        value={scores[task.id]}
                        onChange={(value) =>
                            updateScore(task.id, value)
                        }
                    />

                ))}

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