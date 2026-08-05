import { useState } from "react";

import TaskEditor from "./TaskEditor";

const STATION_TYPES = [
    "Challenge",
    "Checkpoint",
    "Skill",
    "Service"
];

const PRESETS = [
    {
        id: "custom",
        name: "Custom"
    }
];

const DEFAULT_TASK = {
    name: "",
    type: "Score Challenge",
    instructions: "",
    maxScore: 100,
    timeLimit: 0,
    correctAnswer: "",
    expectedAnswer: ""
};

export default function StationCreator({

                                           onCreate,
                                           onCancel

                                       }) {

    const [station, setStation] = useState({

        name: "",

        type: STATION_TYPES[0],

        preset: "",

        task: DEFAULT_TASK

    });

    function update(field, value) {

        setStation(current => ({
            ...current,
            [field]: value
        }));

    }

    function updateTask(task) {

        setStation(current => ({
            ...current,
            task
        }));

    }

    function create() {

        if (!station.name.trim()) {
            return;
        }

        if (!station.preset) {
            return;
        }

        onCreate(station);

    }

    return (

        <div className="modal-backdrop">

            <div className="station-creator">

                <div className="creator-header">

                    <h2>Create Station</h2>

                </div>

                <div className="creator-body">

                    <label>

                        Station Name

                        <input
                            value={station.name}
                            onChange={(e) =>
                                update(
                                    "name",
                                    e.target.value
                                )
                            }
                        />

                    </label>

                    <label>

                        Station Type

                        <select
                            value={station.type}
                            onChange={(e) =>
                                update(
                                    "type",
                                    e.target.value
                                )
                            }
                        >

                            {STATION_TYPES.map(type => (

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

                        Preset

                        <select
                            value={station.preset}
                            onChange={(e) =>
                                update(
                                    "preset",
                                    e.target.value
                                )
                            }
                        >

                            <option value="">
                                Select...
                            </option>

                            {PRESETS.map(preset => (

                                <option
                                    key={preset.id}
                                    value={preset.id}
                                >
                                    {preset.name}
                                </option>

                            ))}

                        </select>

                    </label>

                    {station.preset === "custom" && (

                        <TaskEditor
                            task={station.task}
                            onChange={updateTask}
                        />

                    )}

                </div>

                <div className="creator-footer">

                    <button
                        className="secondary-button"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>

                    <button
                        className="primary-button"
                        onClick={create}
                    >
                        Create Station
                    </button>

                </div>

            </div>

        </div>

    );

}