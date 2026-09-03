import { useEffect, useState } from "react";
import {
    useNavigate,
    useSearchParams
} from "react-router-dom";

import ApiService from "@/api/ApiService.js";

import TaskEditor from "./TaskEditor.jsx";

import "./Stations.css";

const STATION_TYPES = [
    "Challenge",
    "Checkpoint",
    "Skill",
    "Service"
];

const TASK_TYPES = [
    "Timed Challenge",
    "Score Challenge",
    "Pass / Fail",
    "Multiple Choice",
    "Text Answer",
    "Checkpoint",
    "Custom"
];

function createTask() {

    return {
        id: crypto.randomUUID(),

        name: "",

        type: "Score Challenge",

        instructions: "",

        maxScore: 100,

        timeLimit: 0,

        correctAnswer: "",

        expectedAnswer: ""
    };

}

function createEmptyStation() {

    return {
        name: "",

        type: STATION_TYPES[0],

        tasks: []
    };

}

export default function StationEditor() {

    const navigate = useNavigate();

    const [searchParams] = useSearchParams();

    const stationId =
        searchParams.get("stationId");

    const isEditing =
        Boolean(stationId);

    const [station, setStation] =
        useState(createEmptyStation);

    const [loading, setLoading] =
        useState(isEditing);

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState(null);

    const [editingTaskId, setEditingTaskId] =
        useState(null);

    /*
     * Load existing station when editing.
     */

    useEffect(() => {

        if (!isEditing) {
            return;
        }

        loadStation();

    }, [stationId]);

    async function loadStation() {

        try {

            setLoading(true);
            setError(null);

            const existing =
                await ApiService.stationData.getStation(
                    stationId
                );

            setStation({
                ...existing,

                tasks: existing.tasks ?? []
            });

        } catch (error) {

            console.error(
                "Failed to load station:",
                error
            );

            setError(
                error.message ??
                "Failed to load station."
            );

        } finally {

            setLoading(false);

        }

    }

    function updateStation(field, value) {

        setStation(current => ({
            ...current,
            [field]: value
        }));

    }

    function addTask() {

        const task = createTask();

        setStation(current => ({

            ...current,

            tasks: [
                ...current.tasks,
                task
            ]

        }));

        setEditingTaskId(task.id);

    }

    function updateTask(updatedTask) {

        setStation(current => ({

            ...current,

            tasks: current.tasks.map(task =>
                task.id === updatedTask.id
                    ? updatedTask
                    : task
            )

        }));

    }

    function deleteTask(id) {

        setStation(current => ({

            ...current,

            tasks: current.tasks.filter(
                task => task.id !== id
            )

        }));

        if (editingTaskId === id) {

            setEditingTaskId(null);

        }

    }

    async function saveStation() {

        if (!station.name.trim()) {

            setError(
                "Station name is required."
            );

            return;

        }

        if (station.tasks.length === 0) {

            setError(
                "A station must have at least one task."
            );

            return;

        }

        try {

            setSaving(true);
            setError(null);

            const data = {

                ...station,

                name: station.name.trim()

            };

            if (isEditing) {

                await ApiService.stationData.updateStation(
                    stationId,
                    data
                );

            } else {

                await ApiService.stationData.createStation(
                    data
                );

            }

            navigate("/stations");

        } catch (error) {

            console.error(
                "Failed to save station:",
                error
            );

            setError(
                error.message ??
                "Failed to save station."
            );

        } finally {

            setSaving(false);

        }

    }

    if (loading) {

        return (

            <div className="station-editor-page">

                <div className="loading-panel large">

                    <span className="loading-spinner" />

                    Loading station...

                </div>

            </div>

        );

    }

    return (

        <div className="station-editor-page">

            {/* Header */}

            <header className="editor-header">

                <button
                    type="button"
                    className="back-button"
                    onClick={() =>
                        navigate("/admin/stations")
                    }
                >

                    ←
                    {" "}
                    Stations

                </button>

                <div className="editor-title">

                    <span className="page-eyebrow">
                        Administration
                    </span>

                    <h1>
                        {isEditing
                            ? "Edit Station"
                            : "Create Station"
                        }
                    </h1>

                    <p>
                        {isEditing
                            ? "Update the station configuration and scoring tasks."
                            : "Configure a new scoring station and its tasks."
                        }
                    </p>

                </div>

            </header>

            {error && (

                <div className="error-banner">

                    {error}

                </div>

            )}

            {/* Station Information */}

            <section className="editor-section">

                <div className="section-heading">

                    <div>

                        <h2>
                            Station Information
                        </h2>

                        <p>
                            Basic information about this station.
                        </p>

                    </div>

                </div>

                <div className="station-form-grid">

                    <label className="form-field">

                        <span>
                            Station Name
                        </span>

                        <input
                            value={station.name}
                            onChange={event =>
                                updateStation(
                                    "name",
                                    event.target.value
                                )
                            }
                            placeholder="Enter station name"
                        />

                    </label>

                    <label className="form-field">

                        <span>
                            Station Type
                        </span>

                        <select
                            value={station.type}
                            onChange={event =>
                                updateStation(
                                    "type",
                                    event.target.value
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

                </div>

            </section>

            {/* Tasks */}

            <section className="editor-section">

                <div className="section-heading">

                    <div>

                        <h2>
                            Tasks
                        </h2>

                        <p>
                            Configure the tasks patrols will complete
                            at this station.
                        </p>

                    </div>

                    <button
                        type="button"
                        className="primary-button"
                        onClick={addTask}
                    >
                        + Add Task
                    </button>

                </div>

                {station.tasks.length === 0 ? (

                    <div className="empty-tasks">

                        <div className="empty-icon">
                            +
                        </div>

                        <h3>
                            No Tasks
                        </h3>

                        <p>
                            Add a task to define what patrols
                            will do at this station.
                        </p>

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={addTask}
                        >
                            Add First Task
                        </button>

                    </div>

                ) : (

                    <div className="task-list">

                        {station.tasks.map(
                            (task, index) => (

                                <article
                                    key={task.id}
                                    className={
                                        editingTaskId === task.id
                                            ? "task-card editing"
                                            : "task-card"
                                    }
                                >

                                    <div className="task-card-header">

                                        <div className="task-number">
                                            {index + 1}
                                        </div>

                                        <div className="task-summary">

                                            <h3>
                                                {task.name ||
                                                    "Unnamed Task"}
                                            </h3>

                                            <span>
                                                {task.type}
                                            </span>

                                        </div>

                                        <div className="task-actions">

                                            <button
                                                type="button"
                                                className="secondary-button"
                                                onClick={() =>
                                                    setEditingTaskId(
                                                        editingTaskId === task.id
                                                            ? null
                                                            : task.id
                                                    )
                                                }
                                            >

                                                {editingTaskId === task.id
                                                    ? "Close"
                                                    : "Edit"
                                                }

                                            </button>

                                            <button
                                                type="button"
                                                className="remove-button"
                                                onClick={() =>
                                                    deleteTask(
                                                        task.id
                                                    )
                                                }
                                            >
                                                Delete
                                            </button>

                                        </div>

                                    </div>

                                    {task.instructions && (

                                        <p className="task-summary-description">

                                            {task.instructions}

                                        </p>

                                    )}

                                    {editingTaskId === task.id && (

                                        <div className="task-editor-container">

                                            <TaskEditor
                                                task={task}
                                                taskTypes={TASK_TYPES}
                                                onChange={
                                                    updateTask
                                                }
                                            />

                                        </div>

                                    )}

                                </article>

                            )
                        )}

                    </div>

                )}

            </section>

            {/* Footer */}

            <footer className="editor-footer">

                <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                        navigate("/admin/stations")
                    }
                    disabled={saving}
                >
                    Cancel
                </button>

                <button
                    type="button"
                    className="primary-button"
                    onClick={saveStation}
                    disabled={
                        saving ||
                        !station.name.trim()
                    }
                >

                    {saving
                        ? "Saving..."
                        : isEditing
                            ? "Save Changes"
                            : "Create Station"
                    }

                </button>

            </footer>

        </div>

    );

}