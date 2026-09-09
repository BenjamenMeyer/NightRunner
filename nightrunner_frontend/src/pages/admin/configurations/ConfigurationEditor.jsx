import {
    useEffect,
    useRef,
    useState
} from "react";

import {
    useNavigate,
    useSearchParams
} from "react-router-dom";

import ApiService from "@/api/ApiService.js";
import ConfigurationGroupDialog from "./ConfigurationGroupDialog.jsx";
import ConfigurationTaskEditor from "./ConfigurationTaskEditor.jsx";

import "./ConfigurationEditor.css";

const EMPTY_CONFIGURATION = {
    groupId: "",
    name: "",
    description: "",
    tasks: []
};

function createEmptyTask() {
    return {
        name: "",
        type: "Timed Challenge",
        instructions: "",
        maxScore: 0,
        timeLimit: 0,
        correctAnswer: "",
        expectedAnswer: ""
    };
}

export default function ConfigurationEditor() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const configurationId =
        searchParams.get("id");

    const copyFromId =
        searchParams.get("copyFrom");

    const editing =
        Boolean(configurationId);

    const [configuration, setConfiguration] =
        useState(EMPTY_CONFIGURATION);

    const [groups, setGroups] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState(null);

    const [showGroupDialog, setShowGroupDialog] =
        useState(false);

    const [importError, setImportError] =
        useState(null);

    const [taskEditor, setTaskEditor] =
        useState(null);

    const [taskEditorError, setTaskEditorError] =
        useState(null);

    const fileInputRef =
        useRef(null);

    useEffect(() => {
        load();
    }, [configurationId, copyFromId]);

    async function load() {
        try {
            setLoading(true);
            setError(null);

            const groupsResponse =
                await ApiService.configurationData.getGroups();

            const loadedGroups =
                Array.isArray(groupsResponse)
                    ? groupsResponse
                    : groupsResponse?.groups ?? [];

            setGroups(loadedGroups);

            const targetId = configurationId || copyFromId;

            if (!targetId) {
                setConfiguration({
                    ...EMPTY_CONFIGURATION
                });

                return;
            }

            const response =
                await ApiService.configurationData
                    .getConfiguration(targetId);

            const loadedConfiguration =
                response?.configuration ??
                response;

            setConfiguration({
                groupId:
                    loadedConfiguration?.groupId ??
                    loadedConfiguration?.group_id ??
                    "",
                name:
                    copyFromId
                        ? `${loadedConfiguration?.name || "Configuration"} (Copy)`
                        : (loadedConfiguration?.name ?? ""),
                description:
                    loadedConfiguration?.description ??
                    "",
                tasks:
                    loadedConfiguration?.tasks
                        ? JSON.parse(JSON.stringify(loadedConfiguration.tasks))
                        : []
            });
        }
        catch (error) {
            console.error(
                "Failed to load configuration:",
                error
            );

            setError(
                error?.message ??
                "Unable to load the configuration."
            );
        }
        finally {
            setLoading(false);
        }
    }

    function updateField(field, value) {
        setConfiguration(current => ({
            ...current,
            [field]: value
        }));
    }

    async function handleCreateGroup(group) {
        const created =
            await ApiService.configurationData
                .createGroup(group);

        const createdGroup =
            created?.group ??
            created;

        const groupsResponse =
            await ApiService.configurationData.getGroups();

        const loadedGroups =
            Array.isArray(groupsResponse)
                ? groupsResponse
                : groupsResponse?.groups ?? [];

        setGroups(loadedGroups);

        if (createdGroup?.id) {
            setConfiguration(current => ({
                ...current,
                groupId: createdGroup.id
            }));
        }

        setShowGroupDialog(false);
    }

    async function handleSave(event) {
        event.preventDefault();

        setError(null);

        if (!configuration.groupId) {
            setError(
                "A station type is required."
            );
            return;
        }

        if (!configuration.name.trim()) {
            setError(
                "A configuration name is required."
            );
            return;
        }

        try {
            setSaving(true);

            const payload = {
                groupId:
                    configuration.groupId,
                name:
                    configuration.name.trim(),
                description:
                    configuration.description.trim() ||
                    null,
                tasks:
                    configuration.tasks ?? []
            };

            if (editing) {
                await ApiService.configurationData
                    .updateConfiguration(
                        configurationId,
                        payload
                    );
            }
            else {
                await ApiService.configurationData
                    .createConfiguration(payload);
            }

            navigate("/admin/configurations");
        }
        catch (error) {
            console.error(
                "Failed to save configuration:",
                error
            );

            setError(
                error?.message ??
                "Unable to save the configuration."
            );
        }
        finally {
            setSaving(false);
        }
    }

    function handleCancel() {
        navigate("/admin/configurations");
    }

    function handleImportClick() {
        fileInputRef.current?.click();
    }

    async function handleImport(event) {
        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        setImportError(null);

        try {
            const text =
                await file.text();

            const imported =
                JSON.parse(text);

            const importedGroupId =
                imported?.groupId ??
                imported?.group_id;

            let groupId =
                importedGroupId ?? "";

            if (!groupId && imported?.group?.name) {
                const matchingGroup =
                    groups.find(group =>
                        String(group.name).toLowerCase() ===
                        String(imported.group.name).toLowerCase()
                    );

                if (matchingGroup) {
                    groupId = matchingGroup.id;
                }
            }

            setConfiguration({
                groupId,
                name:
                    imported?.name ?? "",
                description:
                    imported?.description ?? "",
                tasks:
                    imported?.tasks ?? []
            });
        }
        catch (error) {
            console.error(
                "Failed to import configuration:",
                error
            );

            setImportError(
                "The selected file is not a valid configuration JSON file."
            );
        }
        finally {
            event.target.value = "";
        }
    }

    function openCreateTask() {
        setTaskEditor({
            mode: "create",
            index: null,
            task: createEmptyTask()
        });

        setTaskEditorError(null);
    }

    function openEditTask(index) {
        const task =
            configuration.tasks[index];

        if (!task) {
            return;
        }

        setTaskEditor({
            mode: "edit",
            index,
            task: {
                ...createEmptyTask(),
                ...task
            }
        });

        setTaskEditorError(null);
    }

    function saveTask(task) {
        if (!task.name?.trim()) {
            setTaskEditorError(
                "A task name is required."
            );
            return;
        }

        const normalizedTask = {
            ...task,
            name:
                task.name.trim(),
            instructions:
                task.instructions?.trim() ?? ""
        };

        setConfiguration(current => {
            const tasks = [
                ...(current.tasks ?? [])
            ];

            if (taskEditor.mode === "edit") {
                tasks[taskEditor.index] =
                    normalizedTask;
            }
            else {
                tasks.push(
                    normalizedTask
                );
            }

            return {
                ...current,
                tasks
            };
        });

        setTaskEditor(null);
        setTaskEditorError(null);
    }

    function removeTask(index) {
        setConfiguration(current => ({
            ...current,
            tasks: current.tasks.filter(
                (_, taskIndex) =>
                    taskIndex !== index
            )
        }));
    }

    if (loading) {
        return (
            <div className="configuration-editor">
                <div className="configuration-editor-loading">
                    Loading configuration...
                </div>
            </div>
        );
    }

    return (
        <div className="configuration-editor">
            <div className="configuration-editor-header">
                <div>
                    <h1>
                        {editing
                            ? "Edit Configuration"
                            : "Create Configuration"}
                    </h1>

                    <p>
                        Configure the tasks and settings
                        for a station.
                    </p>
                </div>

                <div className="configuration-editor-header-actions">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/json,.json"
                        onChange={handleImport}
                        hidden
                    />

                    <button
                        type="button"
                        onClick={handleImportClick}
                        disabled={saving}
                    >
                        Import JSON
                    </button>
                </div>
            </div>

            {error && (
                <div className="configuration-editor-error">
                    {error}
                </div>
            )}

            {importError && (
                <div className="configuration-editor-error">
                    {importError}
                </div>
            )}

            <form onSubmit={handleSave}>
                <section className="configuration-editor-section">
                    <div className="configuration-editor-section-header">
                        <div>
                            <h2>
                                Configuration Details
                            </h2>

                            <p>
                                Select the station type this
                                configuration belongs to.
                            </p>
                        </div>
                    </div>

                    <div className="configuration-editor-field">
                        <label htmlFor="configuration-group">
                            Station Type
                        </label>

                        <div className="configuration-editor-group-row">
                            <select
                                id="configuration-group"
                                value={
                                    configuration.groupId
                                }
                                onChange={event =>
                                    updateField(
                                        "groupId",
                                        event.target.value
                                    )
                                }
                                disabled={saving}
                                required
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

                            <button
                                type="button"
                                onClick={() =>
                                    setShowGroupDialog(true)
                                }
                                disabled={saving}
                            >
                                + New Station Type
                            </button>
                        </div>

                        {groups.length === 0 && (
                            <p className="configuration-editor-help">
                                No station types exist yet.
                                Create one before saving this
                                configuration.
                            </p>
                        )}
                    </div>

                    <div className="configuration-editor-field">
                        <label htmlFor="configuration-name">
                            Name
                        </label>

                        <input
                            id="configuration-name"
                            type="text"
                            value={
                                configuration.name
                            }
                            onChange={event =>
                                updateField(
                                    "name",
                                    event.target.value
                                )
                            }
                            placeholder="Configuration name"
                            disabled={saving}
                            required
                        />
                    </div>

                    <div className="configuration-editor-field">
                        <label htmlFor="configuration-description">
                            Description
                        </label>

                        <textarea
                            id="configuration-description"
                            value={
                                configuration.description
                            }
                            onChange={event =>
                                updateField(
                                    "description",
                                    event.target.value
                                )
                            }
                            placeholder="Describe this configuration..."
                            rows={4}
                            disabled={saving}
                        />
                    </div>
                </section>

                <section className="configuration-editor-section">
                    <div className="configuration-editor-section-header">
                        <div>
                            <h2>
                                Tasks
                            </h2>

                            <p>
                                Define the tasks performed at this station.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={openCreateTask}
                            disabled={saving}
                        >
                            + Add Task
                        </button>
                    </div>

                    {configuration.tasks.length === 0 ? (
                        <div className="configuration-editor-empty">
                            No tasks have been added.
                        </div>
                    ) : (
                        <div className="configuration-editor-tasks">
                            {configuration.tasks.map(
                                (task, index) => (
                                    <div
                                        className="configuration-editor-task"
                                        key={index}
                                    >
                                        <div className="configuration-editor-task-header">
                                            <div>
                                                <h3>
                                                    {index + 1}.{" "}
                                                    {task.name ||
                                                        "Unnamed Task"}
                                                </h3>

                                                <span>
                                    {task.type ||
                                        "Custom"}
                                </span>
                                            </div>

                                            <div className="configuration-editor-task-actions">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openEditTask(index)
                                                    }
                                                    disabled={saving}
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeTask(index)
                                                    }
                                                    disabled={saving}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>

                                        {task.instructions && (
                                            <p className="configuration-editor-task-instructions">
                                                {task.instructions}
                                            </p>
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    )}

                    {taskEditor && (
                        <div className="configuration-editor-task-form">
                            <ConfigurationTaskEditor
                                task={taskEditor.task}
                                editing={
                                    taskEditor.mode === "edit"
                                }
                                error={taskEditorError}
                                onChange={task =>
                                    setTaskEditor(current => ({
                                        ...current,
                                        task
                                    }))
                                }
                            />

                            <div className="configuration-editor-task-form-actions">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTaskEditor(null);
                                        setTaskEditorError(null);
                                    }}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        saveTask(
                                            taskEditor.task
                                        )
                                    }
                                    disabled={saving}
                                >
                                    {taskEditor.mode === "edit"
                                        ? "Save Task"
                                        : "Add Task"}
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                <div className="configuration-editor-actions">
                    <button
                        type="button"
                        onClick={handleCancel}
                        disabled={saving}
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={
                            saving ||
                            !configuration.groupId ||
                            !configuration.name.trim()
                        }
                    >
                        {saving
                            ? "Saving..."
                            : editing
                                ? "Save Configuration"
                                : "Create Configuration"}
                    </button>
                </div>
            </form>

            {showGroupDialog && (
                <ConfigurationGroupDialog
                    onSave={handleCreateGroup}
                    onClose={() =>
                        setShowGroupDialog(false)
                    }
                />
            )}
        </div>
    );
}