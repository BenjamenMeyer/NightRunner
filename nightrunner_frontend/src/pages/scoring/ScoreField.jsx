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
                ).toISOString(),
                running: true
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

        onChange({
            startTime: now.toISOString(),
            endTime: now.toISOString(),
            running: true
        });

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

            endTime: end.toISOString(),

            running: false

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

    const divideByPatrolSize = task.divideByPatrolSize ?? scoreValue.divideByPatrolSize ?? false;
    const initialRawValue = (typeof value === "object" && value !== null && "rawValue" in value) ? value.rawValue : (typeof value === "object" ? value : value);
    const initialParticipantCount = (typeof value === "object" && value !== null && "participantCount" in value) ? value.participantCount : 1;

    const [participantCount, setParticipantCount] = useState(initialParticipantCount);

    function updateValueWithParticipants(newVal, newCount = participantCount) {
        if (divideByPatrolSize) {
            onChange({
                rawValue: newVal,
                participantCount: newCount
            });
        } else {
            onChange(newVal);
        }
    }

    const renderDivideByPatrolSizeInput = () => {
        if (!divideByPatrolSize) return null;
        return (
            <div className="task-participant-count-box" style={{
                marginTop: "6px",
                marginBottom: "8px",
                padding: "8px 12px",
                background: "var(--card-bg, #1e293b)",
                border: "1px solid var(--border, #334155)",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                gap: "12px"
            }}>
                <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-primary)" }}>
                    👥 Participating Patrol Members Count:
                </label>
                <input
                    type="number"
                    min="1"
                    value={participantCount}
                    onChange={(e) => {
                        const cnt = Math.max(1, parseInt(e.target.value, 10) || 1);
                        setParticipantCount(cnt);
                        updateValueWithParticipants(initialRawValue, cnt);
                    }}
                    style={{ width: "80px", padding: "4px 8px" }}
                />
                <small style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                    (Score will be divided by {participantCount} for fairness)
                </small>
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
                    updateValueWithParticipants("");
                    return;
                }
                // Allow entering negative sign or partial valid numbers
                if (rawVal === "-") {
                    updateValueWithParticipants("-");
                    return;
                }
                const numVal = Number(rawVal);
                if (Number.isNaN(numVal)) return;
                updateValueWithParticipants(numVal);
            };

            const handleRangeBlur = (e) => {
                const rawVal = e.target.value;
                if (rawVal === "" || rawVal === "-") return;
                const numVal = Number(rawVal);
                if (!Number.isNaN(numVal)) {
                    const clampedVal = Math.max(minBound, Math.min(maxBound, numVal));
                    updateValueWithParticipants(clampedVal);
                }
            };

            const displayValue = (typeof value === "object" && value !== null && "rawValue" in value) ? value.rawValue : (typeof value === "object" ? "" : value);

            return (

                <div className="score-field">

                    {renderInstructionsBubble()}
                    {renderNotesBubble()}

                    <label>{taskTitle}</label>

                    {renderDivideByPatrolSizeInput()}

                    <input
                        type="number"
                        min={minBound}
                        max={maxBound}
                        value={displayValue ?? ""}
                        placeholder={`Score (${minBound} - ${maxBound})`}
                        onChange={handleRangeChange}
                        onBlur={handleRangeBlur}
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

        case "Automatic Station Disqualification":
            const currentDisqual = (typeof value === "object" && value !== null) ? value : { disqualified: false, reason: "" };

            const handleDisqualToggle = (e) => {
                const checked = e.target.checked;
                if (checked) {
                    const confirmed = window.confirm(
                        `⚠️ WARNING: Marking "${taskTitle}" as True will set the station score to ZERO (0) for this patrol.\n\nA reason is REQUIRED before you can submit.\n\nDo you wish to proceed?`
                    );
                    if (!confirmed) {
                        return;
                    }
                }
                onChange({
                    disqualified: checked,
                    reason: checked ? currentDisqual.reason : ""
                });
            };

            const handleReasonChange = (e) => {
                onChange({
                    ...currentDisqual,
                    reason: e.target.value
                });
            };

            return (
                <div className="score-field disqualification-field" style={{
                    padding: "14px",
                    borderRadius: "8px",
                    border: currentDisqual.disqualified ? "2px solid var(--error, #ef4444)" : "1px solid var(--border)",
                    background: currentDisqual.disqualified ? "rgba(239, 68, 68, 0.1)" : "var(--card-bg)"
                }}>
                    {renderInstructionsBubble()}
                    {renderNotesBubble()}

                    <label className="checkbox-option" style={{ color: currentDisqual.disqualified ? "var(--error, #ef4444)" : "var(--text-primary)", fontWeight: "bold", fontSize: "1rem" }}>
                        <input
                            type="checkbox"
                            checked={currentDisqual.disqualified}
                            onChange={handleDisqualToggle}
                        />
                        🚫 {taskTitle} (Automatic Station Disqualification / Zero Score)
                    </label>

                    {currentDisqual.disqualified && (
                        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                            <label style={{ fontSize: "0.85rem", color: "var(--error, #ef4444)", fontWeight: "bold" }}>
                                ⚠️ Disqualification Reason (Required):
                            </label>
                            <textarea
                                rows="3"
                                placeholder="Explain why the patrol was disqualified at this station..."
                                value={currentDisqual.reason || ""}
                                onChange={handleReasonChange}
                                style={{
                                    padding: "8px",
                                    borderRadius: "6px",
                                    border: !currentDisqual.reason?.trim() ? "2px solid var(--error, #ef4444)" : "1px solid var(--border)",
                                    background: "var(--input-bg, #0f172a)",
                                    color: "var(--text-primary)"
                                }}
                            />
                            {!currentDisqual.reason?.trim() && (
                                <small style={{ color: "var(--error, #ef4444)", fontWeight: "600" }}>
                                    * A disqualification reason must be entered before saving.
                                </small>
                            )}
                        </div>
                    )}
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

            const handleDeltaTimeChange = (e) => {
                const rawVal = e.target.value;
                if (rawVal === "") {
                    onChange("");
                    return;
                }
                const numVal = Number(rawVal);
                if (Number.isNaN(numVal)) return;
                onChange(numVal);
            };

            return (

                <div className="score-field">

                    {renderInstructionsBubble()}
                    {renderNotesBubble()}

                    <label>{taskTitle}</label>

                    <input
                        type="number"
                        value={value ?? ""}
                        placeholder="Enter delta time (seconds)..."
                        onChange={handleDeltaTimeChange}
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
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === "" || !Number.isNaN(Number(val))) {
                                                        updateManual(field, val);
                                                    }
                                                }}
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

            const handleDefaultNumericChange = (e) => {
                const rawVal = e.target.value;
                if (rawVal === "") {
                    onChange("");
                    return;
                }
                const numVal = Number(rawVal);
                if (Number.isNaN(numVal)) return;
                onChange(numVal);
            };

            return (

                <div className="score-field">

                    {renderInstructionsBubble()}
                    {renderNotesBubble()}

                    <label>{taskTitle}</label>

                    <input
                        type="number"
                        value={value ?? ""}
                        placeholder="Enter score..."
                        onChange={handleDefaultNumericChange}
                    />

                </div>

            );

    }

}