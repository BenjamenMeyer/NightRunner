import "./Stations.css";

const TASK_TYPES = [
    "Timed Challenge",
    "Score Challenge",
    "Pass / Fail",
    "Multiple Choice",
    "Text Answer",
    "Checkpoint",
    "Custom"
];

export default function TaskEditor({
                                       task,
                                       onChange
                                   }) {

    function update(field, value) {

        onChange({
            ...task,
            [field]: value
        });

    }

    return (

        <div className="task-editor">

            <h3>Task Configuration</h3>

            <label>

                Task Name

                <input
                    value={task.name}
                    onChange={(e) =>
                        update("name", e.target.value)
                    }
                />

            </label>

            <label>

                Task Type

                <select
                    value={task.type}
                    onChange={(e) =>
                        update("type", e.target.value)
                    }
                >

                    {TASK_TYPES.map(type => (

                        <option
                            key={type}
                            value={type}
                        >
                            {type}
                        </option>

                    ))}

                </select>

            </label>

            <label>

                Instructions

                <textarea
                    rows={4}
                    value={task.instructions}
                    onChange={(e) =>
                        update(
                            "instructions",
                            e.target.value
                        )
                    }
                />

            </label>

            {(task.type === "Score Challenge" ||
                task.type === "Timed Challenge") && (

                <label>

                    Maximum Score

                    <input
                        type="number"
                        min="0"
                        value={task.maxScore}
                        onChange={(e) =>
                            update(
                                "maxScore",
                                Number(e.target.value)
                            )
                        }
                    />

                </label>

            )}

            {task.type === "Timed Challenge" && (

                <label>

                    Time Limit (seconds)

                    <input
                        type="number"
                        min="0"
                        value={task.timeLimit}
                        onChange={(e) =>
                            update(
                                "timeLimit",
                                Number(e.target.value)
                            )
                        }
                    />

                </label>

            )}

            {task.type === "Multiple Choice" && (

                <label>

                    Correct Answer

                    <input
                        value={task.correctAnswer}
                        onChange={(e) =>
                            update(
                                "correctAnswer",
                                e.target.value
                            )
                        }
                    />

                </label>

            )}

            {task.type === "Text Answer" && (

                <label>

                    Expected Answer

                    <input
                        value={task.expectedAnswer}
                        onChange={(e) =>
                            update(
                                "expectedAnswer",
                                e.target.value
                            )
                        }
                    />

                </label>

            )}

            {task.type === "Checkpoint" && (

                <p className="task-note">
                    Checkpoint stations simply record that a patrol
                    successfully checked in.
                </p>

            )}

            {task.type === "Pass / Fail" && (

                <p className="task-note">
                    Judges will mark the patrol as either Pass or Fail.
                </p>

            )}

        </div>

    );

}