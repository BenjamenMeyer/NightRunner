import "./ConfigurationTaskEditor.css";

const TASK_TYPES = [
    "Timed Challenge",
    "Stopwatch",
    "Score Challenge",
    "Pass / Fail",
    "Multiple Choice",
    "Text Answer",
    "Checkpoint",
    "Automatic Station Disqualification",
    "Secret Cipher / Decoding",
    "Custom"
];

const TASK_GUIDANCE = {
    "Score Challenge": {
        title: "Score Challenge Guidance",
        text: "Used for direct numeric scoring (e.g. 0 to 100 points). The raw score is multiplied by the Task Weight for total points."
    },
    "Timed Challenge": {
        title: "Timed Challenge Guidance",
        text: "Combines time limit tracking with a maximum score. Scorers can use the built-in stopwatch or enter manual timing."
    },
    "Stopwatch": {
        title: "Stopwatch Guidance",
        text: "Provides live Start/Stop timer buttons and manual adjustment fields (HH:MM:SS.MS) for paper record transfers."
    },
    "Pass / Fail": {
        title: "Pass / Fail Guidance",
        text: "Presents a simple checkbox for binary evaluation. Checking 'Pass' awards 100% of points."
    },
    "Multiple Choice": {
        title: "Multiple Choice Guidance",
        text: "Allows configuring multiple choice options, each with a specific point value. On the scoring page, radio buttons are rendered for selection."
    },
    "Text Answer": {
        title: "Text Answer Guidance",
        text: "Provides a text entry field alongside an expected answer reference and maximum point limit."
    },
    "Checkpoint": {
        title: "Checkpoint Guidance",
        text: "Marks arrival or safety milestone completion. Checking the checkpoint awards full credit."
    },
    "Automatic Station Disqualification": {
        title: "Automatic Disqualification Guidance",
        text: "Provides a simple true/false checkbox field to automatically fail a patrol at this station (setting station score to zero). Requires entering a reason before saving after user confirmation warning."
    },
    "Secret Cipher / Decoding": {
        title: "Secret Cipher / Decoding Guidance",
        text: "Allows setting an expected secret string in the configuration editor (hidden from judges/station). On the scoring form, judges enter the patrol's submitted decoded string. The score automatically equals the number of matching characters."
    },
    "Custom": {
        title: "Custom Task Guidance",
        text: "Flexible task with configurable max score limit for custom station activities."
    }
};

export default function ConfigurationTaskEditor({
                                                    task,
                                                    onChange,
                                                    error,
                                                    editing
                                                }) {

    function update(field, value) {

        onChange({
            ...task,
            [field]: value
        });

    }

    const currentGuidance = TASK_GUIDANCE[task.type] || TASK_GUIDANCE["Score Challenge"];

    return (

        <div className="configuration-task-editor-layout" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "20px" }}>

            <div className="configuration-task-editor">

                <div className="task-editor-heading">

                    <div>

                        <h3>
                            {editing
                                ? "Edit Task"
                                : "Add Task"
                            }
                        </h3>

                        <p>
                            Configure the task that will
                            be included in this preset.
                        </p>

                    </div>

                </div>

                {error && (

                    <div className="task-editor-error">
                        {error}
                    </div>

                )}

                <div className="task-editor-form">

                    <label className="form-field">

                        <span>
                            Task Name
                        </span>

                        <input
                            value={task.name}
                            onChange={event =>
                                update(
                                    "name",
                                    event.target.value
                                )
                            }
                            placeholder="Task name"
                        />

                    </label>

                    <label className="form-field">

                        <span>
                            Task Type
                        </span>

                        <select
                            value={task.type}
                            onChange={event =>
                                update(
                                    "type",
                                    event.target.value
                                )
                            }
                        >

                            {TASK_TYPES.map(
                                type => (

                                    <option
                                        key={type}
                                        value={type}
                                    >
                                        {type}
                                    </option>

                                )
                            )}

                        </select>

                    </label>

                    <label className="form-field task-instructions">

                        <span>
                            Instructions (for Patrol / Scorer)
                        </span>

                        <textarea
                            rows={3}
                            value={
                                task.instructions
                            }
                            onChange={event =>
                                update(
                                    "instructions",
                                    event.target.value
                                )
                            }
                            placeholder="Explain what the patrol must do..."
                        />

                    </label>

                    <label className="form-field task-notes">

                        <span>
                            Scorer Notes / Ambiguity Resolver (Optional)
                        </span>

                        <textarea
                            rows={3}
                            value={
                                task.notes || ""
                            }
                            onChange={event =>
                                update(
                                    "notes",
                                    event.target.value
                                )
                            }
                            placeholder="Notes or hints for scorers to resolve ambiguity (shown in a speech bubble on scoring page)..."
                        />

                    </label>

                    <label className="form-field">

                        <span>
                            Task Score Weight (Multiplier)
                        </span>

                        <input
                            type="number"
                            step="0.1"
                            value={task.scoreWeight ?? 1.0}
                            onChange={event =>
                                update(
                                    "scoreWeight",
                                    Number(event.target.value)
                                )
                            }
                        />

                    </label>

                    <label className="form-field checkbox-field" style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>

                        <input
                            type="checkbox"
                            checked={task.active !== false}
                            onChange={event =>
                                update(
                                    "active",
                                    event.target.checked
                                )
                            }
                        />

                        <span>
                            Include this task in scoring calculations
                        </span>

                    </label>

                    <label className="form-field checkbox-field" style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>

                        <input
                            type="checkbox"
                            checked={task.divideByPatrolSize ?? false}
                            onChange={event =>
                                update(
                                    "divideByPatrolSize",
                                    event.target.checked
                                )
                            }
                        />

                        <span>
                            Divide earned score by participating patrol size (for fairness between large/small patrols)
                        </span>

                    </label>

                    <label className="form-field">

                        <span>
                            Maximum Score
                        </span>

                        <input
                            type="number"
                            min="0"
                            value={
                                task.maxScore ?? ""
                            }
                            onChange={event =>
                                update(
                                    "maxScore",
                                    event.target.value === "" ? "" : Number(event.target.value)
                                )
                            }
                            placeholder="e.g. 100"
                        />

                    </label>

                    {task.type === "Timed Challenge" && (

                        <label className="form-field">

                            <span>
                                Time Limit
                            </span>

                            <div className="input-with-suffix">

                                <input
                                    type="number"
                                    min="0"
                                    value={
                                        task.timeLimit
                                    }
                                    onChange={event =>
                                        update(
                                            "timeLimit",
                                            Number(
                                                event.target.value
                                            )
                                        )
                                    }
                                />

                                <span>
                                    seconds
                                </span>

                            </div>

                        </label>

                    )}

                    {task.type === "Multiple Choice" && (

                        <div className="form-field" style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "8px" }}>

                            <span>
                                Multiple Choice Options & Point Values
                            </span>

                            <div className="options-editor-list" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

                                {(task.options || [
                                    { label: "Option A (Full Points)", value: task.maxScore || 10 },
                                    { label: "Option B (Partial Points)", value: Math.floor((task.maxScore || 10) / 2) },
                                    { label: "Option C (No Points)", value: 0 }
                                ]).map((opt, idx) => (

                                    <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>

                                        <input
                                            type="text"
                                            placeholder={`Option ${idx + 1} Label`}
                                            value={opt.label || ""}
                                            style={{ flex: "2", padding: "6px" }}
                                            onChange={(e) => {
                                                const newOpts = [...(task.options || [
                                                    { label: "Option A (Full Points)", value: task.maxScore || 10 },
                                                    { label: "Option B (Partial Points)", value: Math.floor((task.maxScore || 10) / 2) },
                                                    { label: "Option C (No Points)", value: 0 }
                                                ])];
                                                newOpts[idx] = { ...newOpts[idx], label: e.target.value };
                                                update("options", newOpts);
                                            }}
                                        />

                                        <input
                                            type="number"
                                            placeholder="Points"
                                            value={opt.value ?? ""}
                                            style={{ flex: "1", padding: "6px" }}
                                            onChange={(e) => {
                                                const newOpts = [...(task.options || [
                                                    { label: "Option A (Full Points)", value: task.maxScore || 10 },
                                                    { label: "Option B (Partial Points)", value: Math.floor((task.maxScore || 10) / 2) },
                                                    { label: "Option C (No Points)", value: 0 }
                                                ])];
                                                newOpts[idx] = { ...newOpts[idx], value: Number(e.target.value) };
                                                update("options", newOpts);
                                            }}
                                        />

                                        <button
                                            type="button"
                                            style={{ padding: "6px 10px", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                                            onClick={() => {
                                                const currentOpts = task.options || [
                                                    { label: "Option A (Full Points)", value: task.maxScore || 10 },
                                                    { label: "Option B (Partial Points)", value: Math.floor((task.maxScore || 10) / 2) },
                                                    { label: "Option C (No Points)", value: 0 }
                                                ];
                                                if (currentOpts.length <= 1) return;
                                                const newOpts = currentOpts.filter((_, i) => i !== idx);
                                                update("options", newOpts);
                                            }}
                                        >
                                            ✕
                                        </button>

                                    </div>

                                ))}

                                <button
                                    type="button"
                                    style={{ alignSelf: "flex-start", marginTop: "4px", padding: "6px 12px", background: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                                    onClick={() => {
                                        const currentOpts = task.options || [
                                            { label: "Option A (Full Points)", value: task.maxScore || 10 },
                                            { label: "Option B (Partial Points)", value: Math.floor((task.maxScore || 10) / 2) },
                                            { label: "Option C (No Points)", value: 0 }
                                        ];
                                        const newOpts = [...currentOpts, { label: `Option ${currentOpts.length + 1}`, value: 0 }];
                                        update("options", newOpts);
                                    }}
                                >
                                    ➕ Add Choice Option
                                </button>

                            </div>

                        </div>

                    )}

                    {task.type === "Text Answer" && (

                        <label className="form-field">

                            <span>
                                Expected Answer
                            </span>

                            <input
                                value={
                                    task.expectedAnswer
                                }
                                onChange={event =>
                                    update(
                                        "expectedAnswer",
                                        event.target.value
                                    )
                                }
                                placeholder="Expected answer / grading reference"
                            />

                        </label>

                    )}

                    {task.type === "Secret Cipher / Decoding" && (

                        <label className="form-field" style={{ gridColumn: "1 / -1" }}>

                            <span>
                                🔒 Expected Secret Result String (Hidden from Station & Judges)
                            </span>

                            <input
                                value={
                                    task.expectedAnswer || task.expectedSecret || ""
                                }
                                onChange={event => {
                                    const val = event.target.value;
                                    update("expectedAnswer", val);
                                    update("expectedSecret", val);
                                    update("maxScore", val.length);
                                }}
                                placeholder="Enter secret decoded string (e.g. BE PREPARED AT MIDNIGHT)..."
                            />

                            <small style={{ color: "var(--text-secondary)", marginTop: "4px" }}>
                                * Max score will automatically equal the secret string length ({ (task.expectedAnswer || task.expectedSecret || "").length } characters). Score will be calculated by counting matching characters.
                            </small>

                        </label>

                    )}

                    <div className="scoring-preview-box" style={{ gridColumn: "1 / -1", marginTop: "1rem", padding: "0.85rem", background: "#f8f9fa", borderRadius: "6px", border: "1px solid #e9ecef" }}>
                        <strong style={{ fontSize: "0.9em", color: "#495057", display: "block", marginBottom: "0.35rem" }}>
                            📊 Dynamic Scoring Calculation Preview (Example Data)
                        </strong>
                        {task.active === false ? (
                            <span style={{ color: "#dc3545", fontSize: "0.85em" }}>
                                🚫 Task disabled for scoring: Contributes <strong>0 points</strong> to final score.
                            </span>
                        ) : (
                            <div style={{ fontSize: "0.85em", color: "#343a40" }}>
                                {task.maxScore ? (
                                    <span>
                                        Example Raw Score: <strong>{Math.round(task.maxScore * 0.85)}</strong> / {task.maxScore} (85%)<br />
                                        {task.divideByPatrolSize ? (
                                            <span>
                                                Patrol Division = Raw ({Math.round(task.maxScore * 0.85)}) ÷ Patrol Members (e.g. 5) = {(Math.round(task.maxScore * 0.85) / 5).toFixed(1)}<br />
                                                Weighted Task Score = Per-person Score ({(Math.round(task.maxScore * 0.85) / 5).toFixed(1)}) × Task Weight ({task.scoreWeight ?? 1.0}) = <strong>{((Math.round(task.maxScore * 0.85) / 5) * (task.scoreWeight ?? 1.0)).toFixed(1)} points</strong>
                                            </span>
                                        ) : (
                                            <span>
                                                Weighted Task Score = Raw Score ({Math.round(task.maxScore * 0.85)}) × Task Weight ({task.scoreWeight ?? 1.0}) = <strong>{(Math.round(task.maxScore * 0.85) * (task.scoreWeight ?? 1.0)).toFixed(1)} points</strong>
                                            </span>
                                        )}
                                    </span>
                                ) : (
                                    <span>
                                        Example Raw Score: <strong>85</strong> points<br />
                                        {task.divideByPatrolSize ? (
                                            <span>
                                                Patrol Division = Raw (85) ÷ Patrol Members (e.g. 5) = 17.0<br />
                                                Weighted Task Score = Per-person Score (17.0) × Task Weight ({task.scoreWeight ?? 1.0}) = <strong>{(17.0 * (task.scoreWeight ?? 1.0)).toFixed(1)} points</strong>
                                            </span>
                                        ) : (
                                            <span>
                                                Weighted Task Score = Raw Score (85) × Task Weight ({task.scoreWeight ?? 1.0}) = <strong>{(85 * (task.scoreWeight ?? 1.0)).toFixed(1)} points</strong>
                                            </span>
                                        )}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                </div>

            </div>

            <aside className="task-guidance-sidebar" style={{ background: "#f8f9fa", borderLeft: "2px solid #e9ecef", padding: "16px", borderRadius: "8px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#007bff" }}>💡 {currentGuidance.title}</h4>
                <p style={{ fontSize: "0.88rem", color: "#495057", lineHeight: "1.45" }}>
                    {currentGuidance.text}
                </p>
                <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #dee2e6", fontSize: "0.82rem", color: "#6c757d" }}>
                    <strong>💡 Scorer Note Tip:</strong>
                    <p style={{ margin: "4px 0 0 0" }}>
                        Fill out the <em>Scorer Notes</em> field above to clarify rules or instructions for station judges. If provided, notes are displayed in a callout bubble on the scoring page.
                    </p>
                </div>
            </aside>

        </div>

    );

}