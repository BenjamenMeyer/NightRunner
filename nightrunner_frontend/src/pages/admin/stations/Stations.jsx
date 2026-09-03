import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import ApiService from "@/api/ApiService.js";

import StationDetails from "./StationDetails.jsx";

import "./Stations.css";

export default function Stations() {

    const navigate = useNavigate();

    const [stations, setStations] = useState([]);
    const [selectedStation, setSelectedStation] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState("");

    useEffect(() => {

        loadStations();

    }, []);

    async function loadStations() {

        try {

            setLoading(true);
            setError(null);

            const stations =
                await ApiService.stationData.getStations();

            setStations(stations);

            if (selectedStation) {

                const updated = stations.find(
                    station =>
                        station.id === selectedStation.id
                );

                setSelectedStation(updated ?? null);

            }

        } catch (error) {

            console.error(
                "Failed to load stations:",
                error
            );

            setError(
                error.message ??
                "Failed to load stations."
            );

        } finally {

            setLoading(false);

        }

    }

    async function deleteStation(id) {

        if (!window.confirm(
            "Delete this station? This action cannot be undone."
        )) {
            return;
        }

        try {

            setError(null);

            await ApiService.stationData.deleteStation(id);

            if (selectedStation?.id === id) {
                setSelectedStation(null);
            }

            await loadStations();

        } catch (error) {

            console.error(
                "Failed to delete station:",
                error
            );

            setError(
                error.message ??
                "Failed to delete station."
            );

        }

    }

    const filteredStations = useMemo(() => {

        const query = search.trim().toLowerCase();

        if (!query) {
            return stations;
        }

        return stations.filter(station =>
            station.name
                ?.toLowerCase()
                .includes(query)
        );

    }, [stations, search]);

    return (

        <div className="stations-page">

            {/* Page Header */}

            <header className="page-header">

                <div>

                    <span className="page-eyebrow">
                        Administration
                    </span>

                    <h1>
                        Station Manager
                    </h1>

                    <p>
                        Configure scoring stations and their tasks
                        for the current event.
                    </p>

                </div>

                <button
                    type="button"
                    className="primary-button"
                    onClick={() =>
                        navigate("/admin/stations/create")
                    }
                >
                    + Create Station
                </button>

            </header>

            {/* Error */}

            {error && (

                <div className="error-banner">

                    {error}

                </div>

            )}

            {/* Toolbar */}

            <div className="station-toolbar">

                <div className="search-wrapper">

                    <svg
                        className="search-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >

                        <circle
                            cx="11"
                            cy="11"
                            r="7"
                        />

                        <path d="m20 20-4-4" />

                    </svg>

                    <input
                        className="station-search-box"
                        placeholder="Search stations..."
                        value={search}
                        onChange={event =>
                            setSearch(event.target.value)
                        }
                    />

                </div>

                <span className="station-count">

                    {filteredStations.length}
                    {" "}
                    {filteredStations.length === 1
                        ? "station"
                        : "stations"
                    }

                </span>

            </div>

            {/* Main Layout */}

            <div className="station-layout">

                {/* Station List */}

                <section className="station-list-panel">

                    <div className="panel-header">

                        <div>

                            <h2>
                                Stations
                            </h2>

                            <p>
                                Select a station to view its configuration.
                            </p>

                        </div>

                    </div>

                    <div className="station-list">

                        {loading ? (

                            <div className="loading-panel">

                                <span className="loading-spinner" />

                                Loading stations...

                            </div>

                        ) : filteredStations.length === 0 ? (

                            <div className="empty-list">

                                <h3>
                                    No stations found
                                </h3>

                                <p>

                                    {search
                                        ? "Try a different search."
                                        : "Create a station to get started."
                                    }

                                </p>

                            </div>

                        ) : (

                            filteredStations.map(station => (

                                <button
                                    type="button"
                                    key={station.id}
                                    className={
                                        selectedStation?.id === station.id
                                            ? "station-card selected"
                                            : "station-card"
                                    }
                                    onClick={() =>
                                        setSelectedStation(station)
                                    }
                                >

                                    <span className="station-card-content">

                                        <strong>
                                            {station.name}
                                        </strong>

                                        <span>
                                            {station.activeConfiguration?.name ??
                                                station.type ??
                                                "No configuration"}
                                        </span>

                                    </span>

                                    <span className="station-card-arrow">
                                        →
                                    </span>

                                </button>

                            ))

                        )}

                    </div>

                </section>

                {/* Details */}

                <StationDetails
                    station={selectedStation}
                    onDelete={deleteStation}
                    onEdit={() => {

                        if (!selectedStation) {
                            return;
                        }

                        navigate(
                            `/admin/stations/edit?stationId=${encodeURIComponent(
                                selectedStation.id
                            )}`
                        );

                    }}
                />

            </div>

        </div>

    );

}