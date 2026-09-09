import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    useNavigate
} from "react-router-dom";

import ApiService from "@/api/ApiService.js";
import ConfigurationGroupDialog from "./ConfigurationGroupDialog.jsx";

import "./Configurations.css";

export default function Configurations() {
    const navigate = useNavigate();

    const [groups, setGroups] =
        useState([]);

    const [configurations, setConfigurations] =
        useState([]);

    const [selectedGroupId, setSelectedGroupId] =
        useState(null);

    const [selectedConfigurationId, setSelectedConfigurationId] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState(null);

    const [groupDialog, setGroupDialog] =
        useState(null);

    const [deletingGroup, setDeletingGroup] =
        useState(false);

    const [deletingConfiguration, setDeletingConfiguration] =
        useState(false);

    useEffect(() => {
        load();
    }, []);

    async function load() {
        try {
            setLoading(true);
            setError(null);

            const [
                groupsResponse,
                configurationsResponse
            ] = await Promise.all([
                ApiService.configurationData.getGroups(),
                ApiService.configurationData.getConfigurations()
            ]);

            const loadedGroups =
                Array.isArray(groupsResponse)
                    ? groupsResponse
                    : groupsResponse?.groups ?? [];

            const loadedConfigurations =
                Array.isArray(configurationsResponse)
                    ? configurationsResponse
                    : configurationsResponse?.configurations ?? [];

            setGroups(loadedGroups);
            setConfigurations(loadedConfigurations);

            if (
                selectedGroupId &&
                !loadedGroups.some(
                    group =>
                        String(group.id) ===
                        String(selectedGroupId)
                )
            ) {
                setSelectedGroupId(null);
            }
        }
        catch (error) {
            console.error(
                "Failed to load configurations:",
                error
            );

            setError(
                error?.message ??
                "Unable to load configurations."
            );
        }
        finally {
            setLoading(false);
        }
    }

    async function loadGroups() {
        const response =
            await ApiService.configurationData.getGroups();

        const loadedGroups =
            Array.isArray(response)
                ? response
                : response?.groups ?? [];

        setGroups(loadedGroups);

        return loadedGroups;
    }

    async function loadConfigurations() {
        const response =
            await ApiService.configurationData
                .getConfigurations();

        const loadedConfigurations =
            Array.isArray(response)
                ? response
                : response?.configurations ?? [];

        setConfigurations(
            loadedConfigurations
        );

        return loadedConfigurations;
    }

    async function handleCreateGroup(group) {
        try {
            const created =
                await ApiService.configurationData
                    .createGroup(group);

            const createdGroup =
                created?.group ??
                created;

            await loadGroups();

            await loadConfigurations();

            if (createdGroup?.id) {
                setSelectedGroupId(
                    createdGroup.id
                );
            }

            setGroupDialog(null);
        }
        catch (error) {
            console.error(
                "Failed to create station type:",
                error
            );

            throw error;
        }
    }

    async function handleUpdateGroup(group) {
        if (!groupDialog?.group?.id) {
            return;
        }

        try {
            const updated =
                await ApiService.configurationData
                    .updateGroup(
                        groupDialog.group.id,
                        group
                    );

            const updatedGroup =
                updated?.group ??
                updated;

            await loadGroups();

            await loadConfigurations();

            if (updatedGroup?.id) {
                setSelectedGroupId(
                    updatedGroup.id
                );
            }

            setGroupDialog(null);
        }
        catch (error) {
            console.error(
                "Failed to update station type:",
                error
            );

            throw error;
        }
    }

    async function handleDeleteGroup() {
        const group =
            groups.find(
                group =>
                    String(group.id) ===
                    String(selectedGroupId)
            );

        if (!group) {
            return;
        }

        const groupConfigurations =
            configurations.filter(
                configuration =>
                    String(
                        configuration.groupId ??
                        configuration.group_id
                    ) ===
                    String(group.id)
            );

        if (groupConfigurations.length > 0) {
            setError(
                `Cannot delete "${group.name}" because it has ` +
                `${groupConfigurations.length} configuration` +
                `${groupConfigurations.length === 1 ? "" : "s"} assigned to it.`
            );
            return;
        }

        const confirmed =
            window.confirm(
                `Delete the station type "${group.name}"?`
            );

        if (!confirmed) {
            return;
        }

        try {
            setDeletingGroup(true);
            setError(null);

            await ApiService.configurationData
                .deleteGroup(group.id);

            setSelectedGroupId(null);
            setSelectedConfigurationId(null);

            await loadGroups();
            await loadConfigurations();
        }
        catch (error) {
            console.error(
                "Failed to delete station type:",
                error
            );

            setError(
                error?.message ??
                "Unable to delete the station type."
            );
        }
        finally {
            setDeletingGroup(false);
        }
    }

    async function handleDeleteConfiguration() {
        if (!selectedConfigurationId) {
            return;
        }

        const configuration =
            configurations.find(
                configuration =>
                    String(configuration.id) ===
                    String(selectedConfigurationId)
            );

        if (!configuration) {
            return;
        }

        const confirmed =
            window.confirm(
                `Delete the configuration "${configuration.name}"?`
            );

        if (!confirmed) {
            return;
        }

        try {
            setDeletingConfiguration(true);
            setError(null);

            await ApiService.configurationData
                .deleteConfiguration(
                    configuration.id
                );

            setSelectedConfigurationId(null);

            await loadConfigurations();
        }
        catch (error) {
            console.error(
                "Failed to delete configuration:",
                error
            );

            setError(
                error?.message ??
                "Unable to delete the configuration."
            );
        }
        finally {
            setDeletingConfiguration(false);
        }
    }

    function getConfigurationGroupId(configuration) {
        return (
            configuration?.groupId ??
            configuration?.group_id ??
            null
        );
    }

    const filteredConfigurations =
        useMemo(() => {
            if (!selectedGroupId) {
                return configurations;
            }

            return configurations.filter(
                configuration =>
                    String(
                        getConfigurationGroupId(
                            configuration
                        )
                    ) ===
                    String(selectedGroupId)
            );
        }, [
            configurations,
            selectedGroupId
        ]);

    const selectedGroup =
        groups.find(
            group =>
                String(group.id) ===
                String(selectedGroupId)
        ) ?? null;

    const selectedConfiguration =
        configurations.find(
            configuration =>
                String(configuration.id) ===
                String(selectedConfigurationId)
        ) ?? null;

    function getGroupConfigurationCount(groupId) {
        return configurations.filter(
            configuration =>
                String(
                    getConfigurationGroupId(
                        configuration
                    )
                ) ===
                String(groupId)
        ).length;
    }

    function openCreateGroup() {
        setGroupDialog({
            mode: "create",
            group: null
        });
    }

    function openEditGroup() {
        if (!selectedGroup) {
            return;
        }

        setGroupDialog({
            mode: "edit",
            group: selectedGroup
        });
    }

    function handleCreateConfiguration() {
        navigate(
            "/admin/configurations/create"
        );
    }

    function handleEditConfiguration() {
        if (!selectedConfiguration) {
            return;
        }

        navigate(
            `/admin/configurations/edit?id=${selectedConfiguration.id}`
        );
    }

    function exportConfiguration() {
        if (!selectedConfiguration) {
            return;
        }

        const group =
            groups.find(
                group =>
                    String(group.id) ===
                    String(
                        getConfigurationGroupId(
                            selectedConfiguration
                        )
                    )
            );

        const exportData = {
            ...selectedConfiguration,
            group: group
                ? {
                    id: group.id,
                    name: group.name,
                    description:
                        group.description ?? null
                }
                : null
        };

        const blob =
            new Blob(
                [
                    JSON.stringify(
                        exportData,
                        null,
                        2
                    )
                ],
                {
                    type: "application/json"
                }
            );

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            `${selectedConfiguration.name || "configuration"}.json`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    }

    if (loading) {
        return (
            <div className="configurations">
                <div className="configurations-loading">
                    Loading configurations...
                </div>
            </div>
        );
    }

    return (
        <div className="configurations">
            <div className="configurations-header">
                <div>
                    <h1>
                        Station Configurations
                    </h1>

                    <p>
                        Manage station types and their
                        configurations.
                    </p>
                </div>

                <div className="configurations-header-actions">
                    <button
                        type="button"
                        onClick={openCreateGroup}
                    >
                        + Create Station Type
                    </button>

                    <button
                        type="button"
                        onClick={handleCreateConfiguration}
                        disabled={groups.length === 0}
                    >
                        + Create Configuration
                    </button>
                </div>
            </div>

            {groups.length === 0 && (
                <div className="configurations-notice">
                    <strong>
                        No station types exist.
                    </strong>

                    <span>
                        Create a station type before creating
                        a configuration.
                    </span>

                    <button
                        type="button"
                        onClick={openCreateGroup}
                    >
                        Create Station Type
                    </button>
                </div>
            )}

            {error && (
                <div className="configurations-error">
                    {error}
                </div>
            )}

            <div className="configurations-layout">
                <aside className="configurations-sidebar">
                    <div className="configurations-sidebar-header">
                        <div>
                            <h2>
                                Station Types
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={openCreateGroup}
                            title="Create station type"
                        >
                            +
                        </button>
                    </div>

                    <nav className="configuration-groups">
                        <button
                            type="button"
                            className={
                                selectedGroupId === null
                                    ? "configuration-group active"
                                    : "configuration-group"
                            }
                            onClick={() => {
                                setSelectedGroupId(null);
                                setSelectedConfigurationId(null);
                            }}
                        >
                            <span>
                                All Configurations
                            </span>

                            <span className="configuration-group-count">
                                {configurations.length}
                            </span>
                        </button>

                        {groups.map(group => {
                            const count =
                                getGroupConfigurationCount(
                                    group.id
                                );

                            const selected =
                                String(
                                    selectedGroupId
                                ) ===
                                String(group.id);

                            return (
                                <button
                                    type="button"
                                    key={group.id}
                                    className={
                                        selected
                                            ? "configuration-group active"
                                            : "configuration-group"
                                    }
                                    onClick={() => {
                                        setSelectedGroupId(
                                            group.id
                                        );
                                        setSelectedConfigurationId(
                                            null
                                        );
                                    }}
                                >
                                    <span>
                                        {group.name}
                                    </span>

                                    <span className="configuration-group-count">
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                <main className="configurations-main">
                    {selectedGroup && (
                        <div className="configuration-group-toolbar">
                            <div>
                                <h2>
                                    {selectedGroup.name}
                                </h2>

                                {selectedGroup.description && (
                                    <p>
                                        {selectedGroup.description}
                                    </p>
                                )}
                            </div>

                            <div className="configuration-group-toolbar-actions">
                                <button
                                    type="button"
                                    onClick={openEditGroup}
                                >
                                    Edit Station Type
                                </button>

                                <button
                                    type="button"
                                    onClick={handleDeleteGroup}
                                    disabled={
                                        deletingGroup
                                    }
                                >
                                    {deletingGroup
                                        ? "Deleting..."
                                        : "Delete Station Type"}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="configurations-list">
                        <div className="configurations-list-header">
                            <div>
                                <h2>
                                    {selectedGroup
                                        ? `${selectedGroup.name} Configurations`
                                        : "All Configurations"}
                                </h2>

                                <span>
                                    {filteredConfigurations.length}{" "}
                                    configuration
                                    {filteredConfigurations.length === 1
                                        ? ""
                                        : "s"}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={handleCreateConfiguration}
                                disabled={
                                    groups.length === 0
                                }
                            >
                                + Create Configuration
                            </button>
                        </div>

                        {filteredConfigurations.length === 0 ? (
                            <div className="configurations-empty">
                                <h3>
                                    No configurations
                                </h3>

                                <p>
                                    {selectedGroup
                                        ? `No configurations have been created for ${selectedGroup.name} yet.`
                                        : "No configurations have been created yet."}
                                </p>

                                {groups.length === 0 ? (
                                    <button
                                        type="button"
                                        onClick={openCreateGroup}
                                    >
                                        Create Station Type
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleCreateConfiguration}
                                    >
                                        Create Configuration
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="configurations-list-items">
                                {filteredConfigurations.map(
                                    configuration => {
                                        const group =
                                            groups.find(
                                                group =>
                                                    String(
                                                        group.id
                                                    ) ===
                                                    String(
                                                        getConfigurationGroupId(
                                                            configuration
                                                        )
                                                    )
                                            );

                                        const selected =
                                            String(
                                                selectedConfigurationId
                                            ) ===
                                            String(
                                                configuration.id
                                            );

                                        return (
                                            <button
                                                type="button"
                                                key={configuration.id}
                                                className={
                                                    selected
                                                        ? "configuration-list-item selected"
                                                        : "configuration-list-item"
                                                }
                                                onClick={() =>
                                                    setSelectedConfigurationId(
                                                        configuration.id
                                                    )
                                                }
                                            >
                                                <div>
                                                    <strong>
                                                        {
                                                            configuration.name
                                                        }
                                                    </strong>

                                                    {configuration.description && (
                                                        <p>
                                                            {
                                                                configuration.description
                                                            }
                                                        </p>
                                                    )}
                                                </div>

                                                {!selectedGroup && group && (
                                                    <span>
                                                        {
                                                            group.name
                                                        }
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    }
                                )}
                            </div>
                        )}
                    </div>
                </main>

                <aside className="configuration-details">
                    {selectedConfiguration ? (
                        <>
                            <div className="configuration-details-header">
                                <div>
                                    <h2>
                                        {
                                            selectedConfiguration.name
                                        }
                                    </h2>

                                    {selectedGroup ? (
                                        <span>
                                            {
                                                selectedGroup.name
                                            }
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            {selectedConfiguration.description && (
                                <p className="configuration-details-description">
                                    {
                                        selectedConfiguration.description
                                    }
                                </p>
                            )}

                            <div className="configuration-details-section">
                                <p style={{ margin: "0.5rem 0", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                                    <strong>Preset Station Weight:</strong> {selectedConfiguration.stationWeight ?? selectedConfiguration.station_weight ?? 1.0}
                                </p>
                            </div>

                            <div className="configuration-details-section">
                                <h3>
                                    Tasks
                                </h3>

                                {(
                                    selectedConfiguration.tasks ??
                                    []
                                ).length === 0 ? (
                                    <p>
                                        No tasks configured.
                                    </p>
                                ) : (
                                    <ol>
                                        {selectedConfiguration.tasks.map(
                                            (
                                                task,
                                                index
                                            ) => (
                                                <li
                                                    key={
                                                        index
                                                    }
                                                >
                                                    <strong>
                                                        {
                                                            task.name
                                                        }
                                                    </strong>

                                                    {task.description && (
                                                        <p>
                                                            {
                                                                task.description
                                                            }
                                                        </p>
                                                    )}
                                                </li>
                                            )
                                        )}
                                    </ol>
                                )}
                            </div>

                            <div className="configuration-details-actions">
                                <button
                                    type="button"
                                    onClick={
                                        handleEditConfiguration
                                    }
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (selectedConfiguration) {
                                            navigate(
                                                `/admin/configurations/create?copyFrom=${selectedConfiguration.id}`
                                            );
                                        }
                                    }}
                                >
                                    Copy as Template
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        exportConfiguration
                                    }
                                >
                                    Export JSON
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        handleDeleteConfiguration
                                    }
                                    disabled={
                                        deletingConfiguration
                                    }
                                >
                                    {deletingConfiguration
                                        ? "Deleting..."
                                        : "Delete"}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="configuration-details-empty">
                            <h2>
                                Select a Configuration
                            </h2>

                            <p>
                                Select a configuration to
                                view its details.
                            </p>
                        </div>
                    )}
                </aside>
            </div>

            {groupDialog && (
                <ConfigurationGroupDialog
                    group={
                        groupDialog.mode === "edit"
                            ? groupDialog.group
                            : null
                    }
                    onSave={
                        groupDialog.mode === "edit"
                            ? handleUpdateGroup
                            : handleCreateGroup
                    }
                    onClose={() =>
                        setGroupDialog(null)
                    }
                />
            )}
        </div>
    );
}