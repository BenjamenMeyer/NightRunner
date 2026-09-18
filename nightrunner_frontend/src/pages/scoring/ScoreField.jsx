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

    // Clock times as typed into the Started / Finished inputs ("HH:MM:SS").
    // These are the source of truth for those two inputs; startedAt / endedAt
    // are derived from them so a scorer can copy the times off a paper
    // scoresheet instead of working out the duration themselves.
    const [startClock, setStartClock] = useState("");
    const [endClock, setEndClock] = useState("");
    const [rolledOver, setRolledOver] = useState(false);

    const divideByPatrolSize = task.divideByPatrolSize ?? scoreValue.divideByPatrolSize ?? false;
    const initialRawValue = (typeof value === "object" && value !== null && "rawValue" in value) ? value.rawValue : (typeof value === "object" ? value : value);
    const initialParticipantCount = (typeof value === "object" && value !== null && "participantCount" in value) ? value.participantCount : 1;

    const [participantCount, setParticipantCount] = useState(initialParticipantCount);

    // True once the HH/MM/SS/MS boxes have been edited but "Apply Adjusted Time"
    // has not been pressed. Until it is pressed the value that would submit is
    // still the raw timer run, not the time written on the paper scoresheet.
    const [manualDirty, setManualDirty] = useState(false);

    useEffect(() => {

        if (!running || !startedAt) {
            return;
        }

        let frame;

        const update = () => {

            const newElapsed =
                Date.now() - startedAt.getTime();

            setElapsed(newElapsed);

            onChange(stopwatchPayload(
                startedAt.toISOString(),
                new Date(
                    startedAt.getTime() + newElapsed
                ).toISOString(),
                { running: true }
            ));

            frame = requestAnimationFrame(update);

        };

        update();

        return () =>
            cancelAnimationFrame(frame);

    }, [running, startedAt, participantCount]);

    // Stopwatch submissions are {startTime, endTime}; the backend derives elapsed
    // seconds from them. When the task divides by patrol size the count has to ride
    // along on the same object, since the backend reads participantCount off
    // whatever dict it is given.
    function stopwatchPayload(startIso, endIso, extra = {}, count) {

        const payload = {
            startTime: startIso,
            endTime: endIso,
            ...extra
        };

        if (divideByPatrolSize) {
            payload.participantCount = count !== undefined ? count : participantCount;
        }

        return payload;

    }

    function handleStopwatchCountChange(cnt) {

        // While the timer runs the animation-frame loop re-emits every frame and
        // picks up the new count from its refreshed dependencies.
        if (running || !startedAt) {
            return;
        }

        onChange(stopwatchPayload(
            startedAt.toISOString(),
            (endedAt ?? startedAt).toISOString(),
            {},
            cnt
        ));

    }

    const DAY_MS = 86400000;

    function formatClock(date) {

        return [date.getHours(), date.getMinutes(), date.getSeconds()]
            .map(part => String(part).padStart(2, "0"))
            .join(":");

    }

    // "HH:MM" or "HH:MM:SS" to milliseconds past midnight. Null if incomplete,
    // which is what a time input reports part-way through being typed.
    function parseClock(text) {

        const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text ?? "");

        if (!match) {
            return null;
        }

        const hours = Number(match[1]);
        const minutes = Number(match[2]);
        const seconds = Number(match[3] ?? 0);

        if (hours > 23 || minutes > 59 || seconds > 59) {
            return null;
        }

        return hours * 3600000 + minutes * 60000 + seconds * 1000;

    }

    // Both times are clock times off a scoresheet, so they carry no date. Anchor
    // them to the day the timer was started, or to today when nothing has been
    // timed. A finish earlier than the start means the station ran through
    // midnight, so it belongs to the next day — no station activity runs 24h.
    function applyClockTimes(startText, endText) {

        setStartClock(startText);
        setEndClock(endText);

        const startMs = parseClock(startText);
        const endMs = parseClock(endText);

        if (startMs === null || endMs === null) {
            setRolledOver(false);
            return;
        }

        const anchor = new Date(startedAt ?? Date.now());
        anchor.setHours(0, 0, 0, 0);

        const start = new Date(anchor.getTime() + startMs);
        const crossesMidnight = endMs < startMs;
        const end = new Date(anchor.getTime() + endMs + (crossesMidnight ? DAY_MS : 0));

        setRunning(false);
        setStartedAt(start);
        setEndedAt(end);
        setElapsed(end.getTime() - start.getTime());
        setRolledOver(crossesMidnight);
        setManualDirty(false);

        onChange(stopwatchPayload(
            start.toISOString(),
            end.toISOString(),
            { running: false }
        ));

    }

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
        setManualDirty(false);
        setStartClock(formatClock(now));
        setEndClock("");
        setRolledOver(false);

        onChange(stopwatchPayload(
            now.toISOString(),
            now.toISOString(),
            { running: true }
        ));

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

        setManualDirty(false);
        setStartClock(formatClock(startedAt));
        setEndClock(formatClock(end));
        setRolledOver(false);

        onChange(stopwatchPayload(
            startedAt.toISOString(),
            end.toISOString(),
            { running: false }
        ));

    }

    function updateManual(field, newValue) {

        setManualDirty(true);

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
        setManualDirty(false);
        setStartClock(formatClock(startedAt));
        setEndClock(formatClock(adjustedEnd));
        setRolledOver(adjustedEnd.getDate() !== startedAt.getDate());

        onChange(stopwatchPayload(
            startedAt.toISOString(),
            adjustedEnd.toISOString()
        ));

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

    // onCountChange lets a caller re-emit in its own value shape. The numeric
    // tasks submit {rawValue, participantCount}; a stopwatch submits
    // {startTime, endTime, participantCount}, so it passes its own handler.
    const renderDivideByPatrolSizeInput = (onCountChange) => {
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
                        if (onCountChange) {
                            onCountChange(cnt);
                        } else {
                            updateValueWithParticipants(initialRawValue, cnt);
                        }
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
        case "Secret Cipher / Decoding":
            const cipherTextVal = (typeof value === "object" && value !== null) ? (value.submittedText ?? "") : (value ?? "");

            return (

                <div className="score-field">

                    {renderInstructionsBubble()}
                    {renderNotesBubble()}

                    <label>{taskTitle}</label>

                    <input
                        type="text"
                        value={cipherTextVal}
                        placeholder={fieldType === "Secret Cipher / Decoding" ? "Enter patrol decoded secret string..." : "Enter text answer or response..."}
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

                    {renderDivideByPatrolSizeInput(handleStopwatchCountChange)}

                    <div className="stopwatch-card">

                        <div className="timer-display">

                            {formatElapsed(elapsed)}

                        </div>

                        <div className="timer-times">

                            <div>

                                <label htmlFor={`${task.id}-started`}>
                                    <strong>Started</strong>
                                </label>

                                <input
                                    id={`${task.id}-started`}
                                    type="time"
                                    step="1"
                                    value={startClock}
                                    disabled={running}
                                    onChange={event =>
                                        applyClockTimes(event.target.value, endClock)
                                    }
                                />

                            </div>

                            <div>

                                <label htmlFor={`${task.id}-finished`}>
                                    <strong>Finished</strong>
                                </label>

                                <input
                                    id={`${task.id}-finished`}
                                    type="time"
                                    step="1"
                                    value={endClock}
                                    disabled={running}
                                    onChange={event =>
                                        applyClockTimes(startClock, event.target.value)
                                    }
                                />

                            </div>

                        </div>

                        {rolledOver && (
                            <p className="timer-rollover-note">
                                Finished is before Started, so this is being counted
                                as running past midnight into the next day.
                            </p>
                        )}

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

                                {manualDirty && (
                                    <p className="manual-time-unapplied">
                                        Time edited but not applied &mdash; press
                                        &ldquo;Apply Adjusted Time&rdquo; or the
                                        {" "}{formatElapsed(elapsed)} above is what will be saved.
                                    </p>
                                )}

                                <button
                                    className="apply-adjusted-time-button"
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