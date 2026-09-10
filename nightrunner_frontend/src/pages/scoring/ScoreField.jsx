import { useEffect, useState } from "react";

import "./Scoring.css";

export default function ScoreField({

                                       task,
                                       value,
                                       onChange

                                   }) {

    const scoreValue = task.scoreValue ?? {};

    /* Stopwatch State */

    const [startedAt, setStartedAt] = useState(null);
    const [endedAt, setEndedAt] = useState(null);
    const [running, setRunning] = useState(false);
    const [elapsed, setElapsed] = useState(0);

    const [manual, setManual] = useState({
        hours: "00",
        minutes: "00",
        seconds: "00",
        milliseconds: "000"
    });

    useEffect(() => {

        if (!running || !startedAt) {
            return;
        }

        let frame;

        const update = () => {

            const newElapsed =
                Date.now() - startedAt.getTime();

            setElapsed(newElapsed);

            onChange({
                startTime: startedAt.toISOString(),
                endTime: new Date(
                    startedAt.getTime() + newElapsed
                ).toISOString()
            });

            frame = requestAnimationFrame(update);

        };

        update();

        return () =>
            cancelAnimationFrame(frame);

    }, [running, startedAt]);

    function formatElapsed(ms) {

        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const millis = ms % 1000;

        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;

    }

    function startTimer() {

        const now = new Date();

        setStartedAt(now);
        setEndedAt(null);
        setElapsed(0);
        setRunning(true);

    }

    function stopTimer() {

        const end = new Date();

        const finalElapsed =
            end.getTime() - startedAt.getTime();

        setEndedAt(end);
        setElapsed(finalElapsed);
        setRunning(false);

        setManual({

            hours: String(
                Math.floor(finalElapsed / 3600000)
            ).padStart(2, "0"),

            minutes: String(
                Math.floor((finalElapsed % 3600000) / 60000)
            ).padStart(2, "0"),

            seconds: String(
                Math.floor((finalElapsed % 60000) / 1000)
            ).padStart(2, "0"),

            milliseconds: String(
                finalElapsed % 1000
            ).padStart(3, "0")

        });

        onChange({

            startTime: startedAt.toISOString(),

            endTime: end.toISOString()

        });

    }

    function updateManual(field, newValue) {

        setManual(current => ({

            ...current,

            [field]: newValue

        }));

    }

    function applyManual() {

        const adjustedElapsed =

            Number(manual.hours) * 3600000 +

            Number(manual.minutes) * 60000 +

            Number(manual.seconds) * 1000 +

            Number(manual.milliseconds);

        setElapsed(adjustedElapsed);

        const adjustedEnd = new Date(
            startedAt.getTime() + adjustedElapsed
        );

        setEndedAt(adjustedEnd);

        onChange({

            startTime: startedAt.toISOString(),

            endTime: adjustedEnd.toISOString()

        });

    }

    const fieldType = scoreValue.type || task.type;
    const taskTitle = task.name || task.description || "Task";

    switch (fieldType) {

        case "RangeRated":
        case "Score Challenge":
        case "Custom":

            return (

                <div className="score-field">

                    <label>{taskTitle}</label>

                    <input
                        type="number"
                        min={scoreValue.min ?? 0}
                        max={scoreValue.max ?? task.maxScore ?? 100}
                        value={value ?? ""}
                        placeholder={`Score (0 - ${scoreValue.max ?? task.maxScore ?? 100})`}
                        onChange={(e) =>
                            onChange(Number(e.target.value))
                        }
                    />

                    <small>
                        Range: {scoreValue.min ?? 0} - {scoreValue.max ?? task.maxScore ?? 100}
                    </small>

                </div>

            );

        case "Completed":
        case "Pass / Fail":
        case "Checkpoint":

            return (

                <div className="score-field">

                    <label className="checkbox-option">

                        <input
                            type="checkbox"
                            checked={value ?? false}
                            onChange={(e) =>
                                onChange(e.target.checked)
                            }
                        />

                        {taskTitle} ({fieldType === "Pass / Fail" ? "Pass" : "Completed"})

                    </label>

                </div>

            );

        case "MultiChoice":
        case "Multiple Choice":
            const optionsList = scoreValue.options || task.options || [
                { label: "Option A (Full Points)", value: task.maxScore ?? 10 },
                { label: "Option B (Partial Points)", value: Math.floor((task.maxScore ?? 10) / 2) },
                { label: "Option C (No Points)", value: 0 }
            ];

            return (

                <div className="score-field multiple-choice-field">

                    <label style={{ fontWeight: "bold", display: "block", marginBottom: "8px" }}>{taskTitle}</label>

                    <div className="radio-options-list" style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "8px 0" }}>

                        {optionsList.map((option, idx) => {
                            const optLabel = typeof option === "object" ? option.label : option;
                            const optValue = typeof option === "object" ? option.value : option;
                            const isChecked = value === optValue;

                            return (
                                <label
                                    key={idx}
                                    className={`radio-option-item ${isChecked ? "selected" : ""}`}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        padding: "8px 12px",
                                        borderRadius: "6px",
                                        border: isChecked ? "2px solid #007bff" : "1px solid #ced4da",
                                        background: isChecked ? "#e7f1ff" : "#ffffff",
                                        cursor: "pointer"
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name={`mc_${task.id || taskTitle}`}
                                        value={optValue}
                                        checked={isChecked}
                                        onChange={() => onChange(Number(optValue))}
                                    />
                                    <span style={{ fontWeight: isChecked ? "600" : "normal" }}>
                                        {optLabel}
                                    </span>
                                    {typeof optValue === "number" && (
                                        <span style={{ marginLeft: "auto", fontSize: "0.85em", color: "#6c757d", background: "#f8f9fa", padding: "2px 8px", borderRadius: "12px", border: "1px solid #dee2e6" }}>
                                            +{optValue} pts
                                        </span>
                                    )}
                                </label>
                            );
                        })}

                    </div>

                </div>

            );


        case "Text Answer":

            return (

                <div className="score-field">

                    <label>{taskTitle}</label>

                    <input
                        type="text"
                        value={value ?? ""}
                        placeholder="Enter text answer or response..."
                        onChange={(e) =>
                            onChange(e.target.value)
                        }
                    />

                </div>

            );

        case "DeltaTime":

            return (

                <div className="score-field">

                    <label>{taskTitle}</label>

                    <input
                        type="number"
                        value={value ?? ""}
                        onChange={(e) =>
                            onChange(Number(e.target.value))
                        }
                    />

                    <small>
                        {scoreValue.scalar ?? 1} ms per point
                    </small>

                </div>

            );

        case "Timed Challenge":
        case "Stopwatch":

            return (

                <div className="score-field stopwatch-field">

                    <label>{taskTitle}</label>

                    <div className="stopwatch-card">

                        <div className="timer-display">

                            {formatElapsed(elapsed)}

                        </div>

                        <div className="timer-times">

                            <div>

                                <strong>Started</strong>

                                <br />

                                {startedAt
                                    ? startedAt.toLocaleTimeString()
                                    : "--"}

                            </div>

                            <div>

                                <strong>Finished</strong>

                                <br />

                                {endedAt
                                    ? endedAt.toLocaleTimeString()
                                    : "--"}

                            </div>

                        </div>

                        <div className="timer-buttons">

                            <button
                                className="primary-button"
                                disabled={running}
                                onClick={startTimer}
                            >
                                Start
                            </button>

                            <button
                                className="secondary-button"
                                disabled={!running}
                                onClick={stopTimer}
                            >
                                Stop
                            </button>

                        </div>

                        {!running && startedAt && (

                            <>

                                <label>

                                    Adjust Recorded Time

                                </label>

                                <div className="manual-time-grid">

                                    {[
                                        ["hours", "HH", 99],
                                        ["minutes", "MM", 59],
                                        ["seconds", "SS", 59],
                                        ["milliseconds", "MS", 999]
                                    ].map(([field, label, max]) => (

                                        <div key={field}>

                                            <span>{label}</span>

                                            <input
                                                type="number"
                                                min="0"
                                                max={max}
                                                value={manual[field]}
                                                onChange={(e) =>
                                                    updateManual(
                                                        field,
                                                        e.target.value
                                                    )
                                                }
                                            />

                                        </div>

                                    ))}

                                </div>

                                <button
                                    className="secondary-button"
                                    onClick={applyManual}
                                >

                                    Apply Adjusted Time

                                </button>

                            </>

                        )}

                    </div>

                </div>

            );

        default:

            return (

                <div className="score-field">

                    <label>{taskTitle}</label>

                    <input
                        type="number"
                        value={value ?? ""}
                        placeholder="Enter score..."
                        onChange={(e) =>
                            onChange(Number(e.target.value))
                        }
                    />

                </div>

            );

    }

}