import "./Stations.css";

const DEFAULT_TASK_TYPES = [
    "Timed Challenge",
    "Stopwatch",
    "Score Challenge",
    "Pass / Fail",
    "Multiple Choice",
    "Text Answer",
    "Checkpoint",
    "Custom"
];

export default function TaskEditor({
                                       task,
                                       onChange,
                                       taskTypes = DEFAULT_TASK_TYPES
                                   }) {

    function update(field, value) {

        onChange({
            ...task,
            [field]: value
        });

    }

    return (

        <div className="task-editor">

            <div className="task-editor-heading">

                <div>

                    <h3>
                        Task Configuration
                    </h3>

                    <p>
                        Configure how this task is scored.
                    </p>

                </div>

            </div>

            <div className="task-form-grid">

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
                        placeholder="Enter task name"
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

                        {taskTypes.map(type => (

                            <option
                                key={type}
                                value={type}
                            >
                                {type}
                            </option>

                        ))}

                    </select>

                </label>

            </div>

            <label className="form-field">

                <span>
                    Instructions
                </span>

                <textarea
                    rows={4}
                    value={task.instructions}
                    onChange={event =>
                        update(
                            "instructions",
                            event.target.value
                        )
                    }
                    placeholder="Explain what the patrol needs to do..."
                />

            </label>

            <label className="form-field">

                <span>
                    Task Score Weight (Multiplier)
                </span>

                <input
                    type="number"
                    step="0.1"
                    min="0"
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

            {(task.type === "Score Challenge" ||
                task.type === "Timed Challenge" ||
                task.type === "Text Answer" ||
                task.type === "Checkpoint" ||
                task.type === "Custom") && (

                <label className="form-field">

                    <span>
                        Maximum Score
                    </span>

                    <input
                        type="number"
                        min="0"
                        value={task.maxScore ?? ""}
                        onChange={event =>
                            update(
                                "maxScore",
                                Number(event.target.value)
                            )
                        }
                        placeholder="e.g. 10"
                    />

                </label>

            )}

            {task.type === "Timed Challenge" && (

                <label className="form-field">

                    <span>
                        Time Limit
                    </span>

                    <div className="input-with-suffix">

                        <input
                            type="number"
                            min="0"
                            value={task.timeLimit}
                            onChange={event =>
                                update(
                                    "timeLimit",
                                    Number(event.target.value)
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
                        value={task.expectedAnswer}
                        onChange={event =>
                            update(
                                "expectedAnswer",
                                event.target.value
                            )
                        }
                        placeholder="Enter the expected answer / grading reference"
                    />

                </label>

            )}


            {task.type === "Checkpoint" && (

                <div className="task-note">

                    <strong>
                        Checkpoint
                    </strong>

                    <p>
                        This task records that a patrol successfully
                        checked in at the station.
                    </p>

                </div>

            )}

            {task.type === "Pass / Fail" && (

                <div className="task-note">

                    <strong>
                        Pass / Fail
                    </strong>

                    <p>
                        Judges will mark the patrol as either
                        Pass or Fail.
                    </p>

                </div>

            )}

            {task.type === "Custom" && (

                <div className="task-note">

                    <strong>
                        Custom Task
                    </strong>

                    <p>
                        This task uses custom scoring behavior.
                    </p>

                </div>

            )}

            <div className="scoring-preview-box" style={{ marginTop: "1rem", padding: "0.85rem", background: "#f8f9fa", borderRadius: "6px", border: "1px solid #e9ecef" }}>
                <strong style={{ fontSize: "0.9em", color: "#495057", display: "block", marginBottom: "0.35rem" }}>
                    📊 Task Scoring Calculation Preview (Example Data)
                </strong>
                {task.active === false ? (
                    <span style={{ color: "#dc3545", fontSize: "0.85em" }}>
                        🚫 Task disabled for scoring: Contributes <strong>0 points</strong> to station total.
                    </span>
                ) : (
                    <div style={{ fontSize: "0.85em", color: "#343a40" }}>
                        {task.maxScore ? (
                            <span>
                                Example Task Raw Score: <strong>{Math.round(task.maxScore * 0.85)}</strong> / {task.maxScore} (85%)<br />
                                Weighted Task Contribution = Raw ({Math.round(task.maxScore * 0.85)}) × Task Weight ({task.scoreWeight ?? 1.0}) = <strong>{(Math.round(task.maxScore * 0.85) * (task.scoreWeight ?? 1.0)).toFixed(1)} points</strong>
                            </span>
                        ) : (
                            <span>
                                Example Task Raw Score: <strong>85</strong> points<br />
                                Weighted Task Contribution = Raw (85) × Task Weight ({task.scoreWeight ?? 1.0}) = <strong>{(85 * (task.scoreWeight ?? 1.0)).toFixed(1)} points</strong>
                            </span>
                        )}
                    </div>
                )}
            </div>

        </div>

    );

}