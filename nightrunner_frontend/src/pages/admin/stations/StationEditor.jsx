import { useEffect, useMemo, useState } from "react";
import {
    useNavigate,
    useSearchParams
} from "react-router-dom";

import ApiService from "../../../api/ApiService.js";

import TaskEditor from "./TaskEditor.jsx";

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
        description: "",
        eventId: null,
        activeConfigurationId: null,
        members: [],
        tasks: []
    };
}

export default function StationEditor() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const stationId = searchParams.get("stationId");
    const isEditing = Boolean(stationId);

    const [station, setStation] = useState(
        createEmptyStation
    );

    const [groups, setGroups] = useState([]);
    const [configurations, setConfigurations] = useState([]);

    const [loading, setLoading] = useState(
        isEditing
    );

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [editingTaskId, setEditingTaskId] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        loadData(controller.signal);

        return () => controller.abort();
    }, [stationId]);

    async function loadData(signal) {
        try {
            setLoading(true);
            setError(null);

            const requests = [
                ApiService.configurationData.getGroups(),
                ApiService.configurationData.getConfigurations()
            ];

            if (isEditing) {
                requests.push(
                    ApiService.stationData.getStation(
                        stationId
                    )
                );
            }

            const [
                groupData,
                configurationData,
                existing
            ] = await Promise.all(requests);

            if (signal?.aborted) {
                return;
            }

            setGroups(groupData ?? []);
            setConfigurations(configurationData ?? []);

            if (isEditing && existing) {
                setStation({
                    ...existing,
                    eventId: existing.eventId ?? null,
                    activeConfigurationId:
                        existing.activeConfigurationId ??
                        null,
                    members: existing.members ?? [],
                    tasks: existing.tasks ?? []
                });
            }
        } catch (error) {
            if (signal?.aborted) {
                return;
            }

            console.error(
                "Failed to load station:",
                error
            );

            setError(
                error?.message ??
                "Failed to load station."
            );
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }

    const activeConfiguration = useMemo(() => {
        if (!station.activeConfigurationId) {
            return null;
        }

        return configurations.find(
            configuration =>
                String(configuration.id) ===
                String(station.activeConfigurationId)
        ) ?? null;
    }, [
        configurations,
        station.activeConfigurationId
    ]);

    const selectedGroupId =
        activeConfiguration?.group_id ??
        activeConfiguration?.groupId ??
        null;

    const availableConfigurations = useMemo(() => {
        if (!selectedGroupId) {
            return [];
        }

        return configurations.filter(
            configuration =>
                String(
                    configuration.group_id ??
                    configuration.groupId
                ) === String(selectedGroupId)
        );
    }, [
        configurations,
        selectedGroupId
    ]);

    function updateStation(field, value) {
        setStation(current => ({
            ...current,
            [field]: value
        }));
    }

    function handleGroupChange(groupId) {
        if (station.tasks && station.tasks.length > 0) {
            const confirmed = window.confirm(
                "Switching station types will update the configuration and clear custom tasks. Do you want to proceed?"
            );
            if (!confirmed) {
                return;
            }
        }

        if (!groupId) {
            setStation(current => ({
                ...current,
                activeConfigurationId: null,
                tasks: []
            }));
            return;
        }

        const firstConfiguration =
            configurations.find(
                configuration =>
                    String(
                        configuration.group_id ??
                        configuration.groupId
                    ) === String(groupId)
            );

        const configTasks = firstConfiguration?.tasks ? JSON.parse(JSON.stringify(firstConfiguration.tasks)) : [];

        setStation(current => ({
            ...current,
            activeConfigurationId:
                firstConfiguration?.id ?? null,
            tasks: configTasks
        }));
    }

    function handleConfigurationChange(configurationId) {
        if (station.activeConfigurationId && station.activeConfigurationId !== configurationId) {
            if (station.tasks && station.tasks.length > 0) {
                const confirmed = window.confirm(
                    "Switching configuration presets will load tasks from the new configuration and replace current tasks. Do you want to proceed?"
                );
                if (!confirmed) {
                    return;
                }
            }
        }

        const selectedConfig = configurations.find(c => String(c.id) === String(configurationId));
        const configTasks = selectedConfig?.tasks ? JSON.parse(JSON.stringify(selectedConfig.tasks)) : [];

        setStation(current => ({
            ...current,
            activeConfigurationId: configurationId || null,
            tasks: configTasks
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

        if (!station.activeConfigurationId) {
            setError(
                "A configuration must be selected."
            );
            return;
        }

        try {
            setSaving(true);
            setError(null);

            const data = {
                ...station,
                name: station.name.trim(),
                description:
                    station.description?.trim() ?? "",
                activeConfigurationId:
                station.activeConfigurationId
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

            navigate("/admin/stations");
        } catch (error) {
            console.error(
                "Failed to save station:",
                error
            );

            setError(
                error?.message ??
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
            <header className="editor-header">
                <button
                    type="button"
                    className="back-button"
                    onClick={() =>
                        navigate("/admin/stations")
                    }
                >
                    ← Stations
                </button>

                <div className="editor-title">
                    <span className="page-eyebrow">
                        Administration
                    </span>

                    <h1>
                        {isEditing
                            ? "Edit Station"
                            : "Create Station"}
                    </h1>

                    <p>
                        {isEditing
                            ? "Update the station configuration and scoring tasks."
                            : "Configure a new scoring station and its tasks."}
                    </p>
                </div>
            </header>

            {error && (
                <div className="error-banner">
                    {error}
                </div>
            )}

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
                            value={
                                selectedGroupId ?? ""
                            }
                            onChange={event =>
                                handleGroupChange(
                                    event.target.value
                                )
                            }
                        >
                            <option value="">
                                Select a station type...
                            </option>

                            {groups.map(group => (
                                <option
                                    key={group.id}
                                    value={group.id}
                                >
                                    {group.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="form-field">
                        <span>
                            Configuration
                        </span>

                        <select
                            value={
                                station.activeConfigurationId ??
                                ""
                            }
                            onChange={event =>
                                handleConfigurationChange(
                                    event.target.value
                                )
                            }
                            disabled={
                                !selectedGroupId ||
                                availableConfigurations.length === 0
                            }
                        >
                            <option value="">
                                {selectedGroupId
                                    ? "Select a configuration..."
                                    : "Select a station type first"}
                            </option>

                            {availableConfigurations.map(
                                configuration => (
                                    <option
                                        key={configuration.id}
                                        value={configuration.id}
                                    >
                                        {configuration.name ??
                                            configuration.key}
                                    </option>
                                )
                            )}
                        </select>
                    </label>

                    <label className="form-field">
                        <span>
                            Description
                        </span>

                        <textarea
                            value={
                                station.description ?? ""
                            }
                            onChange={event =>
                                updateStation(
                                    "description",
                                    event.target.value
                                )
                            }
                            placeholder="Describe this station"
                            rows={3}
                        />
                    </label>
                </div>

                {selectedGroupId &&
                    availableConfigurations.length === 0 && (
                        <div className="empty-panel">
                            <strong>
                                No configurations available
                            </strong>

                            <span>
                            This station type does not have
                            any configurations yet.
                        </span>
                        </div>
                    )}
            </section>

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
                                                        editingTaskId ===
                                                        task.id
                                                            ? null
                                                            : task.id
                                                    )
                                                }
                                            >
                                                {editingTaskId ===
                                                task.id
                                                    ? "Close"
                                                    : "Edit"}
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
                                                taskTypes={
                                                    TASK_TYPES
                                                }
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
                        !station.name.trim() ||
                        !station.activeConfigurationId
                    }
                >
                    {saving
                        ? "Saving..."
                        : isEditing
                            ? "Save Changes"
                            : "Create Station"}
                </button>
            </footer>
        </div>
    );
}