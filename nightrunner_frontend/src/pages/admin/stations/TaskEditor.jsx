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
                task.type === "Timed Challenge") && (

                <label className="form-field">

                    <span>
                        Maximum Score
                    </span>

                    <input
                        type="number"
                        min="0"
                        value={task.maxScore}
                        onChange={event =>
                            update(
                                "maxScore",
                                Number(event.target.value)
                            )
                        }
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

                <label className="form-field">

                    <span>
                        Correct Answer
                    </span>

                    <input
                        value={task.correctAnswer}
                        onChange={event =>
                            update(
                                "correctAnswer",
                                event.target.value
                            )
                        }
                        placeholder="Enter the correct answer"
                    />

                </label>

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
                        placeholder="Enter the expected answer"
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

        </div>

    );

}