import { useEffect, useRef, useState } from "react";
import {
    useNavigate,
    useSearchParams
} from "react-router-dom";

import ApiService from "@/api/ApiService.js";

import ConfigurationTaskEditor from "./ConfigurationTaskEditor.jsx";

import "./ConfigurationEditor.css";

const EMPTY_TASK = {
    name: "",
    type: "Score Challenge",
    instructions: "",
    maxScore: 100,
    timeLimit: 0,
    correctAnswer: "",
    expectedAnswer: ""
};

const EMPTY_CONFIGURATION = {
    groupId: "",
    name: "",
    description: "",
    tasks: []
};

export default function ConfigurationEditor({
                                                mode
                                            }) {

    const navigate = useNavigate();

    const [searchParams] =
        useSearchParams();

    const configurationId =
        searchParams.get(
            "configurationId"
        );

    const isEdit =
        mode === "edit";

    const fileInputRef =
        useRef(null);

    const [groups, setGroups] =
        useState([]);

    const [configuration, setConfiguration] =
        useState(EMPTY_CONFIGURATION);

    const [editingTaskIndex, setEditingTaskIndex] =
        useState(null);

    const [task, setTask] =
        useState({
            ...EMPTY_TASK
        });

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState(null);

    const [taskError, setTaskError] =
        useState(null);

    useEffect(() => {

        load();

    }, [isEdit, configurationId]);

    async function load() {

        try {

            setLoading(true);
            setError(null);

            const groupData =
                await ApiService.configurationData.getGroups();

            setGroups(groupData ?? []);

            if (!isEdit) {

                setConfiguration({
                    ...EMPTY_CONFIGURATION
                });

                return;

            }

            if (!configurationId) {

                setError(
                    "No configuration ID was provided."
                );

                return;

            }

            const data =
                await ApiService.configurationData
                    .getConfiguration(
                        configurationId
                    );

            setConfiguration({
                ...EMPTY_CONFIGURATION,
                ...data,
                groupId:
                    data.groupId ??
                    data.group_id ??
                    "",
                tasks:
                    data.tasks ?? []
            });

        } catch (error) {

            console.error(
                "Failed to load configuration:",
                error
            );

            setError(
                error.message ??
                "Failed to load configuration."
            );

        } finally {

            setLoading(false);

        }

    }

    function updateConfiguration(
        field,
        value
    ) {

        setConfiguration(current => ({
            ...current,
            [field]: value
        }));

    }

    function resetTaskEditor() {

        setTask({
            ...EMPTY_TASK
        });

        setEditingTaskIndex(null);

        setTaskError(null);

    }

    function addTask() {

        setTaskError(null);

        if (!task.name.trim()) {

            setTaskError(
                "Task name is required."
            );

            return;

        }

        const normalizedTask = {
            ...task,
            name: task.name.trim(),
            instructions:
                task.instructions?.trim() ?? ""
        };

        setConfiguration(current => ({

            ...current,

            tasks:
                editingTaskIndex !== null

                    ? current.tasks.map(
                        (existingTask, index) =>
                            index === editingTaskIndex
                                ? {
                                    ...existingTask,
                                    ...normalizedTask
                                }
                                : existingTask
                    )

                    : [
                        ...current.tasks,
                        {
                            ...normalizedTask,
                            id:
                                crypto.randomUUID()
                        }
                    ]

        }));

        resetTaskEditor();

    }

    function editTask(
        taskToEdit,
        index
    ) {

        setEditingTaskIndex(index);

        setTask({
            ...EMPTY_TASK,
            ...taskToEdit
        });

        setTaskError(null);

        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth"
        });

    }

    function removeTask(index) {

        setConfiguration(current => ({

            ...current,

            tasks:
                current.tasks.filter(
                    (_, taskIndex) =>
                        taskIndex !== index
                )

        }));

        if (
            editingTaskIndex === index
        ) {
            resetTaskEditor();
        }

    }

    function moveTask(
        index,
        direction
    ) {

        const newIndex =
            index + direction;

        if (
            newIndex < 0 ||
            newIndex >= configuration.tasks.length
        ) {
            return;
        }

        setConfiguration(current => {

            const tasks = [
                ...current.tasks
            ];

            [
                tasks[index],
                tasks[newIndex]
            ] = [
                tasks[newIndex],
                tasks[index]
            ];

            return {
                ...current,
                tasks
            };

        });

    }

    function importJson(event) {

        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        const reader =
            new FileReader();

        reader.onload = () => {

            try {

                const imported =
                    JSON.parse(
                        reader.result
                    );

                const importedConfiguration =
                    imported.configuration ??
                    imported;

                const importedGroup =
                    imported.group;

                let groupId =
                    importedConfiguration.groupId ??
                    importedConfiguration.group_id ??
                    "";

                if (
                    !groupId &&
                    importedGroup?.name
                ) {

                    const matchingGroup =
                        groups.find(
                            group =>
                                group.name
                                    ?.toLowerCase() ===
                                importedGroup.name
                                    .toLowerCase()
                        );

                    if (matchingGroup) {
                        groupId =
                            matchingGroup.id;
                    }

                }

                setConfiguration({

                    ...EMPTY_CONFIGURATION,

                    ...importedConfiguration,

                    groupId,

                    tasks:
                        importedConfiguration.tasks ??
                        []

                });

                setEditingTaskIndex(null);

                setTask({
                    ...EMPTY_TASK
                });

                setError(null);

            } catch (error) {

                console.error(
                    "Failed to import configuration:",
                    error
                );

                setError(
                    "The selected file is not valid configuration JSON."
                );

            } finally {

                event.target.value = "";

            }

        };

        reader.readAsText(file);

    }

    async function saveConfiguration() {

        setError(null);

        const name =
            configuration.name.trim();

        if (!name) {

            setError(
                "Configuration name is required."
            );

            return;

        }

        if (!configuration.groupId) {

            setError(
                "A station type is required."
            );

            return;

        }

        try {

            setSaving(true);

            const payload = {

                ...configuration,

                name,

                description:
                    configuration.description
                        ?.trim() ?? "",

                tasks:
                    configuration.tasks.map(
                        currentTask => ({
                            ...currentTask,

                            name:
                                currentTask.name
                                    .trim(),

                            instructions:
                                currentTask.instructions
                                    ?.trim() ?? ""
                        })
                    )

            };

            if (isEdit) {

                await ApiService.configurationData
                    .updateConfiguration(
                        configurationId,
                        payload
                    );

            } else {

                await ApiService.configurationData
                    .createConfiguration(
                        payload
                    );

            }

            navigate(
                "/admin/configurations"
            );

        } catch (error) {

            console.error(
                "Failed to save configuration:",
                error
            );

            setError(
                error.message ??
                "Failed to save configuration."
            );

        } finally {

            setSaving(false);

        }

    }

    if (loading) {

        return (

            <div className="configuration-editor-page">

                <div className="editor-loading">

                    <span className="loading-spinner" />

                    Loading configuration...

                </div>

            </div>

        );

    }

    return (

        <div className="configuration-editor-page">

            <header className="editor-header">

                <button
                    type="button"
                    className="back-button"
                    onClick={() =>
                        navigate(
                            "/admin/configurations"
                        )
                    }
                >
                    ← Back to Configurations
                </button>

                <div>

                    <span className="page-eyebrow">
                        System Administration
                    </span>

                    <h1>
                        {isEdit
                            ? "Edit Configuration"
                            : "Create Configuration"
                        }
                    </h1>

                    <p>
                        {isEdit
                            ? "Update this reusable station preset."
                            : "Create a reusable preset of station tasks."
                        }
                    </p>

                </div>

            </header>

            {error && (

                <div className="error-banner">
                    {error}
                </div>

            )}

            <div className="configuration-editor-layout">

                {/* Configuration Information */}

                <section className="editor-card">

                    <div className="editor-card-header">

                        <div>

                            <h2>
                                Configuration Information
                            </h2>

                            <p>
                                Define the station type and
                                preset information.
                            </p>

                        </div>

                        {!isEdit && (

                            <>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json,application/json"
                                    className="hidden-file-input"
                                    onChange={
                                        importJson
                                    }
                                />

                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() =>
                                        fileInputRef
                                            .current
                                            ?.click()
                                    }
                                >
                                    Import JSON
                                </button>

                            </>

                        )}

                    </div>

                    <div className="editor-card-body">

                        <div className="configuration-form-grid">

                            <label className="form-field">

                                <span>
                                    Station Type
                                </span>

                                <select
                                    value={
                                        configuration.groupId
                                    }
                                    onChange={event =>
                                        updateConfiguration(
                                            "groupId",
                                            event.target.value
                                        )
                                    }
                                >

                                    <option value="">
                                        Select station type...
                                    </option>

                                    {groups.map(
                                        group => (

                                            <option
                                                key={group.id}
                                                value={group.id}
                                            >
                                                {group.name}
                                            </option>

                                        )
                                    )}

                                </select>

                                <small>
                                    This determines which
                                    station type can use
                                    this preset.
                                </small>

                            </label>

                            <label className="form-field">

                                <span>
                                    Configuration Name
                                </span>

                                <input
                                    value={
                                        configuration.name
                                    }
                                    onChange={event =>
                                        updateConfiguration(
                                            "name",
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g. Advanced Knots"
                                    autoFocus
                                />

                            </label>

                        </div>

                        <label className="form-field">

                            <span>
                                Description
                            </span>

                            <textarea
                                rows={3}
                                value={
                                    configuration.description
                                }
                                onChange={event =>
                                    updateConfiguration(
                                        "description",
                                        event.target.value
                                    )
                                }
                                placeholder="Describe what this preset is used for..."
                            />

                        </label>

                    </div>

                </section>

                {/* Tasks */}

                <section className="editor-card">

                    <div className="editor-card-header">

                        <div>

                            <h2>
                                Tasks
                            </h2>

                            <p>
                                These tasks will be copied
                                to a station when this preset
                                is selected.
                            </p>

                        </div>

                        <span className="member-badge">
                            {configuration.tasks.length}
                        </span>

                    </div>

                    <div className="editor-card-body">

                        {configuration.tasks.length > 0 ? (

                            <div className="configuration-task-list">

                                {configuration.tasks.map(
                                    (currentTask, index) => (

                                        <div
                                            className={
                                                "configuration-task-card" +
                                                (
                                                    editingTaskIndex === index
                                                        ? " editing"
                                                        : ""
                                                )
                                            }
                                            key={
                                                currentTask.id ??
                                                index
                                            }
                                        >

                                            <div className="task-order">

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        moveTask(
                                                            index,
                                                            -1
                                                        )
                                                    }
                                                    disabled={
                                                        index === 0
                                                    }
                                                    aria-label="Move task up"
                                                >
                                                    ↑
                                                </button>

                                                <span>
                                                    {index + 1}
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        moveTask(
                                                            index,
                                                            1
                                                        )
                                                    }
                                                    disabled={
                                                        index ===
                                                        configuration.tasks.length -
                                                        1
                                                    }
                                                    aria-label="Move task down"
                                                >
                                                    ↓
                                                </button>

                                            </div>

                                            <div className="task-card-content">

                                                <div className="task-card-title">

                                                    <h3>
                                                        {
                                                            currentTask.name
                                                        }
                                                    </h3>

                                                    <span>
                                                        {
                                                            currentTask.type
                                                        }
                                                    </span>

                                                </div>

                                                <p>
                                                    {
                                                        currentTask.instructions ||
                                                        "No instructions."
                                                    }
                                                </p>

                                            </div>

                                            <div className="task-card-actions">

                                                <button
                                                    type="button"
                                                    className="secondary-button small"
                                                    onClick={() =>
                                                        editTask(
                                                            currentTask,
                                                            index
                                                        )
                                                    }
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    type="button"
                                                    className="danger small"
                                                    onClick={() =>
                                                        removeTask(
                                                            index
                                                        )
                                                    }
                                                >
                                                    Remove
                                                </button>

                                            </div>

                                        </div>

                                    )
                                )}

                            </div>

                        ) : (

                            <div className="empty-tasks">

                                <strong>
                                    No tasks added
                                </strong>

                                <span>
                                    Add the first task below.
                                </span>

                            </div>

                        )}

                        <div className="task-editor-container">

                            <ConfigurationTaskEditor
                                task={task}
                                onChange={setTask}
                                error={taskError}
                                editing={
                                    editingTaskIndex !== null
                                }
                            />

                            <div className="task-editor-actions">

                                <button
                                    type="button"
                                    className="primary-button"
                                    onClick={
                                        addTask
                                    }
                                >
                                    {editingTaskIndex !== null
                                        ? "Update Task"
                                        : "Add Task"
                                    }
                                </button>

                                {editingTaskIndex !== null && (

                                    <button
                                        type="button"
                                        className="secondary-button"
                                        onClick={
                                            resetTaskEditor
                                        }
                                    >
                                        Cancel
                                    </button>

                                )}

                            </div>

                        </div>

                    </div>

                </section>

            </div>

            <footer className="editor-footer">

                <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                        navigate(
                            "/admin/configurations"
                        )
                    }
                    disabled={saving}
                >
                    Cancel
                </button>

                <button
                    type="button"
                    className="primary-button"
                    onClick={
                        saveConfiguration
                    }
                    disabled={
                        saving ||
                        !configuration.name.trim() ||
                        !configuration.groupId
                    }
                >
                    {saving
                        ? "Saving..."
                        : isEdit
                            ? "Save Configuration"
                            : "Create Configuration"
                    }
                </button>

            </footer>

        </div>

    );

}