export default function StationDetails({

                                           station,
                                           onEdit,
                                           onDelete

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
            config => config.id === station.activeConfigurationId
        ) ??
        station.configurations?.[0];

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
                        onClick={() => onEdit(station)}
                    >

                        Edit

                    </button>

                    <button
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

                            Type

                        </th>

                        <td>

                            {station.type}

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

                    </tbody>

                </table>

            </div>

            {configuration && (

                <>

                    <div className="details-section">

                        <h3>

                            Scenario

                        </h3>

                        <p>

                            {configuration.scenario || "None"}

                        </p>

                    </div>

                    <div className="details-section">

                        <h3>

                            Notes

                        </h3>

                        <p>

                            {configuration.notes || "None"}

                        </p>

                    </div>

                    <div className="details-section">

                        <h3>

                            Tasks

                        </h3>

                        <table className="member-table">

                            <thead>

                            <tr>

                                <th>

                                    Description

                                </th>

                                <th>

                                    Type

                                </th>

                                <th>

                                    Weight

                                </th>

                            </tr>

                            </thead>

                            <tbody>

                            {configuration.tasks?.length ? (

                                configuration.tasks.map(task => (

                                    <tr key={task.id}>

                                        <td>

                                            {task.description}

                                        </td>

                                        <td>

                                            {task.scoreValue?.type}

                                        </td>

                                        <td>

                                            {task.scoreWeight}

                                        </td>

                                    </tr>

                                ))

                            ) : (

                                <tr>

                                    <td
                                        colSpan="3"
                                        className="empty-table"
                                    >

                                        No tasks configured.

                                    </td>

                                </tr>

                            )}

                            </tbody>

                        </table>

                    </div>

                </>

            )}

        </div>

    );

}