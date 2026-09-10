export default function StationDetails({
    station,
    configurations = [],
    onEdit,
    onDelete,
    onCopyToTemplate
}) {
    if (!station) {
        return (
            <div className="station-details empty-panel">
                <h2>
                    No Station Selected
                </h2>
                <p>
                    Select a station from the list to view its configuration.
                </p>
            </div>
        );
    }

    const configuration =
        station.activeConfiguration ??
        station.configurations?.find(
            config => String(config.id) === String(station.activeConfigurationId)
        ) ??
        configurations.find(
            config => String(config.id) === String(station.activeConfigurationId)
        ) ??
        station.configurations?.[0];

    const tasks = (station.tasks && station.tasks.length > 0)
        ? station.tasks
        : (configuration?.tasks ?? []);

    return (
        <div className="station-details">
            <div className="details-header">
                <div>
                    <h2>
                        {station.name}
                    </h2>
                    <p>
                        {station.description || "No description provided."}
                    </p>
                </div>

                <div className="detail-buttons">
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() => onEdit(station)}
                    >
                        Edit
                    </button>

                    {onCopyToTemplate && (
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() => onCopyToTemplate(station)}
                        >
                            Copy as Template
                        </button>
                    )}

                    <button
                        type="button"
                        className="danger"
                        onClick={() => onDelete(station.id)}
                    >
                        Delete
                    </button>
                </div>
            </div>

            <div className="details-section">
                <h3>
                    Station Information
                </h3>

                <table className="detail-table">
                    <tbody>
                    <tr>
                        <th>
                            Name
                        </th>
                        <td>
                            {station.name}
                        </td>
                    </tr>

                    <tr>
                        <th>
                            Configuration
                        </th>
                        <td>
                            {configuration?.name ?? "None"}
                        </td>
                    </tr>

                    <tr>
                        <th>
                            Station Weight
                        </th>
                        <td>
                            {station.stationWeight ?? 1.0}
                        </td>
                    </tr>
                    </tbody>
                </table>
            </div>

            <div className="details-section">
                <h3>
                    Tasks ({tasks.length})
                </h3>

                <table className="member-table">
                    <thead>
                    <tr>
                        <th>
                            Name / Description
                        </th>
                        <th>
                            Type
                        </th>
                        <th>
                            Weight / Max
                        </th>
                        <th>
                            Scoring Enabled
                        </th>
                    </tr>
                    </thead>

                    <tbody>
                    {tasks.length > 0 ? (
                        tasks.map((task, idx) => (
                            <tr key={task.id || idx}>
                                <td>
                                    <strong>{task.name || "Unnamed Task"}</strong>
                                    {task.instructions || task.description ? (
                                        <p style={{ margin: 0, fontSize: "0.85em", color: "#666" }}>
                                            {task.instructions || task.description}
                                        </p>
                                    ) : null}
                                </td>

                                <td>
                                    {task.type || task.scoreValue?.type || "Custom"}
                                </td>

                                <td>
                                    {(task.scoreWeight ?? 1.0)}x / {task.maxScore ?? "-"}
                                </td>

                                <td>
                                    {task.active !== false ? "Yes" : "No"}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td
                                colSpan="3"
                                className="empty-table"
                            >
                                No tasks configured for this station.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}