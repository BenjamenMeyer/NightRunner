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

    const [isNotesCollapsed, setIsNotesCollapsed] = useState(false);
    const [isInstCollapsed, setIsInstCollapsed] = useState(false);

    const fieldType = task.type || task.fieldType || "Custom";
    const taskTitle = task.name || task.title || "Task";
    const taskInstructions = task.instructions || null;
    const taskNotes = task.notes || null;

    const renderInstructionsBubble = () => {
        if (!taskInstructions || !taskInstructions.trim()) return null;
        return (
            <div className="task-instructions-bubble" style={{
                marginBottom: "8px",
                padding: "8px 12px",
                background: "var(--card-bg, #1e293b)",
                border: "1px dashed var(--button-bg, #3b82f6)",
                borderRadius: "6px"
            }}>
                <div
                    onClick={() => setIsInstCollapsed(!isInstCollapsed)}
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        userSelect: "none"
                    }}
                >
                    <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>📋 Task Instructions:</strong>
                    <button
                        type="button"
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}
                    >
                        {isInstCollapsed ? "Show" : "Hide"}
                    </button>
                </div>
                {!isInstCollapsed && (
                    <span style={{ display: "block", marginTop: "4px", fontSize: "0.9rem", whiteSpace: "pre-wrap", color: "var(--text-secondary)" }}>
                        {taskInstructions}
                    </span>
                )}
            </div>
        );
    };

    const renderNotesBubble = () => {
        if (!taskNotes || !taskNotes.trim()) return null;
        return (
            <div className="task-notes-bubble">
                <div
                    onClick={() => setIsNotesCollapsed(!isNotesCollapsed)}
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        userSelect: "none"
                    }}
                >
                    <strong style={{ marginBottom: "2px" }}>💡 Scorer Guidance / Note:</strong>
                    <button
                        type="button"
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "var(--text-secondary, #94a3b8)" }}
                    >
                        {isNotesCollapsed ? "Show" : "Hide"}
                    </button>
                </div>
                {!isNotesCollapsed && (
                    <span style={{ display: "block", marginTop: "4px" }}>{taskNotes}</span>
                )}
            </div>
        );
    };

    switch (fieldType) {

        case "RangeRated":
        case "Score Challenge":
        case "Custom":
            const minBound = scoreValue.min ?? 0;
            const maxBound = scoreValue.max ?? task.maxScore ?? 100;

            const handleRangeChange = (e) => {
                const rawVal = e.target.value;
                if (rawVal === "") {
                    onChange("");
                    return;
                }
                const numVal = Number(rawVal);
                if (Number.isNaN(numVal)) return;
                // Clamp within bounds [minBound, maxBound]
                const clampedVal = Math.max(minBound, Math.min(maxBound, numVal));
                onChange(clampedVal);
            };

            return (

                <div className="score-field">

                    {renderInstructionsBubble()}
                    {renderNotesBubble()}

                    <label>{taskTitle}</label>

                    <input
                        type="number"
                        min={minBound}
                        max={maxBound}
                        value={value ?? ""}
                        placeholder={`Score (${minBound} - ${maxBound})`}
                        onChange={handleRangeChange}
                    />

                    <small>
                        Range: {minBound} - {maxBound}
                    </small>

                </div>

            );

        case "Completed":
        case "Pass / Fail":
        case "Checkpoint":

            return (

                <div className="score-field">

                    {renderInstructionsBubble()}
                    {renderNotesBubble()}

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
                { label: "Option A", value: task.maxScore ?? 10 },
                { label: "Option B", value: Math.floor((task.maxScore ?? 10) / 2) },
                { label: "Option C", value: 0 }
            ];

            const handleSelectChange = (e) => {
                const selectedRaw = e.target.value;
                if (!selectedRaw) {
                    onChange(null);
                    return;
                }

                // Try parsing JSON object or numeric/string value
                try {
                    const parsed = JSON.parse(selectedRaw);
                    onChange(parsed);
                } catch {
                    if (!Number.isNaN(Number(selectedRaw))) {
                        onChange(Number(selectedRaw));
                    } else {
                        onChange(selectedRaw);
                    }
                }
            };

            // Calculate current selected value string representation for <select>
            let currentSelectVal = "";
            if (value !== undefined && value !== null) {
                if (typeof value === "object") {
                    currentSelectVal = JSON.stringify(value);
                } else {
                    currentSelectVal = String(value);
                }
            }

            return (

                <div className="score-field multiple-choice-field">

                    {renderInstructionsBubble()}
                    {renderNotesBubble()}

                    <label style={{ fontWeight: "bold", display: "block", marginBottom: "8px" }}>{taskTitle}</label>

                    <select
                        value={currentSelectVal}
                        onChange={handleSelectChange}
                        style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", width: "100%", fontSize: "1rem" }}
                    >
                        <option value="">-- Select Option --</option>
                        {optionsList.map((option, idx) => {
                            const optLabel = typeof option === "object" && option !== null ? (option.label ?? option.name ?? String(option)) : option;
                            const optValue = typeof option === "object" && option !== null && "value" in option ? option.value : option;
                            const optionValString = typeof optValue === "object" ? JSON.stringify(optValue) : String(optValue !== undefined ? optValue : option);

                            return (
                                <option key={idx} value={optionValString}>
                                    {optLabel}
                                </option>
                            );
                        })}
                    </select>

                </div>

            );


        case "Text Answer":

            return (

                <div className="score-field">

                    {renderInstructionsBubble()}
                    {renderNotesBubble()}

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

                    {renderInstructionsBubble()}
                    {renderNotesBubble()}

                    <label>{taskTitle}</label>

                    <input
                        type="number"
                        value={value ?? ""}
                        onChange={(e) =>
                            onChange(Number(e.target.value))
                        }
                    />

                </div>

            );

        case "Timed Challenge":
        case "Stopwatch":

            return (

                <div className="score-field stopwatch-field">

                    {renderInstructionsBubble()}
                    {renderNotesBubble()}

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

                    {renderInstructionsBubble()}
                    {renderNotesBubble()}

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