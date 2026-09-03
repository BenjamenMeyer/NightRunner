import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import ApiService from "@/api/ApiService.js";

import "./Configurations.css";

export default function Configurations() {

    const navigate = useNavigate();

    const [groups, setGroups] = useState([]);
    const [configurations, setConfigurations] = useState([]);

    const [selectedGroupId, setSelectedGroupId] =
        useState(null);

    const [selectedConfigurationId, setSelectedConfigurationId] =
        useState(null);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState(null);

    const [search, setSearch] = useState("");

    useEffect(() => {

        loadConfigurations();

    }, []);

    async function loadConfigurations() {

        try {

            setLoading(true);
            setError(null);

            const [
                groupData,
                configurationData
            ] = await Promise.all([

                ApiService.configurationData.getGroups(),

                ApiService.configurationData.getConfigurations()

            ]);

            setGroups(groupData ?? []);
            setConfigurations(configurationData ?? []);

        } catch (error) {

            console.error(
                "Failed to load configurations:",
                error
            );

            setError(
                error.message ??
                "Failed to load configurations."
            );

        } finally {

            setLoading(false);

        }

    }

    const filteredConfigurations = useMemo(() => {

        const value =
            search.trim().toLowerCase();

        if (!value) {
            return configurations;
        }

        return configurations.filter(configuration =>

            configuration.name
                ?.toLowerCase()
                .includes(value)

        );

    }, [configurations, search]);

    const visibleConfigurations =
        selectedGroupId

            ? filteredConfigurations.filter(
                configuration =>
                    configuration.groupId === selectedGroupId ||
                    configuration.group_id === selectedGroupId
            )

            : filteredConfigurations;

    const selectedConfiguration =
        configurations.find(
            configuration =>
                configuration.id ===
                selectedConfigurationId
        );

    function getGroupName(configuration) {

        const groupId =
            configuration.groupId ??
            configuration.group_id;

        return groups.find(
            group =>
                group.id === groupId
        )?.name ?? "Unknown Group";

    }

    function exportConfiguration(configuration) {

        const exported = {
            version: 1,

            group: {
                name: getGroupName(configuration),

                description:
                    groups.find(
                        group =>
                            group.id ===
                            (configuration.groupId ??
                                configuration.group_id)
                    )?.description ?? null
            },

            configuration: {
                name: configuration.name,

                description:
                    configuration.description ?? null,

                tasks:
                    configuration.tasks ?? []
            }

        };

        const blob = new Blob(
            [
                JSON.stringify(
                    exported,
                    null,
                    4
                )
            ],
            {
                type: "application/json"
            }
        );

        const url =
            URL.createObjectURL(blob);

        const anchor =
            document.createElement("a");

        anchor.href = url;

        anchor.download =
            `${configuration.name
                .replace(/[^a-z0-9]+/gi, "-")
                .toLowerCase()}.json`;

        anchor.click();

        URL.revokeObjectURL(url);

    }

    async function deleteConfiguration() {

        if (!selectedConfiguration) {
            return;
        }

        if (!window.confirm(
            `Delete "${selectedConfiguration.name}"?`
        )) {
            return;
        }

        try {

            setError(null);

            await ApiService.configurationData.deleteConfiguration(
                selectedConfiguration.id
            );

            setSelectedConfigurationId(null);

            await loadConfigurations();

        } catch (error) {

            console.error(
                "Failed to delete configuration:",
                error
            );

            setError(
                error.message ??
                "Failed to delete configuration."
            );

        }

    }

    if (loading) {

        return (

            <div className="configurations-page">

                <div className="configurations-loading">

                    <span className="loading-spinner" />

                    Loading configurations...

                </div>

            </div>

        );

    }

    return (

        <div className="configurations-page">

            <header className="configurations-header">

                <div>

                    <span className="page-eyebrow">
                        System Administration
                    </span>

                    <h1>
                        Configurations
                    </h1>

                    <p>
                        Manage reusable station presets
                        and the station types available
                        to the system.
                    </p>

                </div>

                <button
                    type="button"
                    className="primary-button"
                    onClick={() =>
                        navigate(
                            "/admin/configurations/create"
                        )
                    }
                >
                    + Create Configuration
                </button>

            </header>

            {error && (

                <div className="error-banner">
                    {error}
                </div>

            )}

            <div className="configuration-toolbar">

                <input
                    className="configuration-search"
                    placeholder="Search configurations..."
                    value={search}
                    onChange={event =>
                        setSearch(
                            event.target.value
                        )
                    }
                />

            </div>

            <div className="configuration-layout">

                <aside className="group-panel">

                    <div className="group-panel-header">

                        <div>

                            <h2>
                                Station Types
                            </h2>

                            <p>
                                Configuration groups
                            </p>

                        </div>

                        <span className="count-badge">
                            {groups.length}
                        </span>

                    </div>

                    <button
                        type="button"
                        className={
                            selectedGroupId === null
                                ? "group-item selected"
                                : "group-item"
                        }
                        onClick={() =>
                            setSelectedGroupId(null)
                        }
                    >

                        <span>
                            All Configurations
                        </span>

                        <small>
                            {configurations.length}
                        </small>

                    </button>

                    {groups.map(group => {

                        const count =
                            configurations.filter(
                                configuration =>
                                    (
                                        configuration.groupId ??
                                        configuration.group_id
                                    ) === group.id
                            ).length;

                        return (

                            <button
                                type="button"
                                key={group.id}
                                className={
                                    selectedGroupId === group.id
                                        ? "group-item selected"
                                        : "group-item"
                                }
                                onClick={() =>
                                    setSelectedGroupId(
                                        group.id
                                    )
                                }
                            >

                                <span>
                                    {group.name}
                                </span>

                                <small>
                                    {count}
                                </small>

                            </button>

                        );

                    })}

                </aside>

                <main className="configuration-content">

                    <div className="configuration-content-header">

                        <div>

                            <h2>

                                {selectedGroupId

                                    ? groups.find(
                                        group =>
                                            group.id ===
                                            selectedGroupId
                                    )?.name

                                    : "All Configurations"

                                }

                            </h2>

                            <p>
                                Reusable station task presets.
                            </p>

                        </div>

                    </div>

                    {visibleConfigurations.length === 0 ? (

                        <div className="empty-panel">

                            <strong>
                                No configurations found
                            </strong>

                            <span>
                                Create a configuration preset
                                to get started.
                            </span>

                        </div>

                    ) : (

                        <div className="configuration-list">

                            {visibleConfigurations.map(
                                configuration => (

                                    <button
                                        type="button"
                                        key={
                                            configuration.id
                                        }
                                        className={
                                            selectedConfigurationId ===
                                            configuration.id

                                                ? "configuration-card selected"

                                                : "configuration-card"
                                        }
                                        onClick={() =>
                                            setSelectedConfigurationId(
                                                configuration.id
                                            )
                                        }
                                    >

                                        <div className="configuration-card-main">

                                            <div className="configuration-card-title">

                                                <h3>
                                                    {
                                                        configuration.name
                                                    }
                                                </h3>

                                                <span className="configuration-group">
                                                    {
                                                        getGroupName(
                                                            configuration
                                                        )
                                                    }
                                                </span>

                                            </div>

                                            <p>
                                                {
                                                    configuration.description ??
                                                    "No description."
                                                }
                                            </p>

                                        </div>

                                        <div className="configuration-task-count">

                                            <strong>
                                                {
                                                    configuration.tasks
                                                        ?.length ?? 0
                                                }
                                            </strong>

                                            <span>
                                                Tasks
                                            </span>

                                        </div>

                                    </button>

                                )
                            )}

                        </div>

                    )}

                </main>

                <aside className="configuration-details">

                    {selectedConfiguration ? (

                        <>

                            <div className="details-header">

                                <span className="configuration-group">
                                    {
                                        getGroupName(
                                            selectedConfiguration
                                        )
                                    }
                                </span>

                                <h2>
                                    {
                                        selectedConfiguration.name
                                    }
                                </h2>

                                <p>
                                    {
                                        selectedConfiguration.description ??
                                        "No description."
                                    }
                                </p>

                            </div>

                            <div className="details-section">

                                <h3>
                                    Tasks
                                </h3>

                                {selectedConfiguration.tasks?.length ? (

                                    <div className="details-task-list">

                                        {selectedConfiguration.tasks.map(
                                            (task, index) => (

                                                <div
                                                    className="details-task"
                                                    key={
                                                        task.id ??
                                                        index
                                                    }
                                                >

                                                    <span className="task-number">
                                                        {index + 1}
                                                    </span>

                                                    <div>

                                                        <strong>
                                                            {
                                                                task.name
                                                            }
                                                        </strong>

                                                        <span>
                                                            {
                                                                task.type
                                                            }
                                                        </span>

                                                    </div>

                                                </div>

                                            )
                                        )}

                                    </div>

                                ) : (

                                    <p className="details-empty">
                                        This configuration has
                                        no tasks.
                                    </p>

                                )}

                            </div>

                            <div className="details-actions">

                                <button
                                    type="button"
                                    className="primary-button"
                                    onClick={() =>
                                        navigate(
                                            `/admin/configurations/edit?configurationId=${selectedConfiguration.id}`
                                        )
                                    }
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() =>
                                        exportConfiguration(
                                            selectedConfiguration
                                        )
                                    }
                                >
                                    Export JSON
                                </button>

                                <button
                                    type="button"
                                    className="danger"
                                    onClick={
                                        deleteConfiguration
                                    }
                                >
                                    Delete
                                </button>

                            </div>

                        </>

                    ) : (

                        <div className="details-placeholder">

                            <strong>
                                Select a configuration
                            </strong>

                            <span>
                                Select a preset to view
                                its tasks and actions.
                            </span>

                        </div>

                    )}

                </aside>

            </div>

        </div>

    );

}