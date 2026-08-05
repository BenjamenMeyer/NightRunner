import { useEffect, useMemo, useState } from "react";

import ApiService from "@/api/ApiService";

import StationCreator from "./StationCreator";
import StationDetails from "./StationDetails";

import "./Stations.css";

export default function Stations() {

    const [stations, setStations] = useState([]);

    const [selectedStation, setSelectedStation] = useState(null);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState(null);

    const [search, setSearch] = useState("");

    const [showCreator, setShowCreator] = useState(false);

    useEffect(() => {

        loadStations();

    }, []);

    async function loadStations() {

        try {

            setLoading(true);

            setError(null);

            const stations = await ApiService.get("/stations");

            setStations(stations);

            if (selectedStation) {

                const updated = stations.find(
                    station => station.id === selectedStation.id
                );

                setSelectedStation(updated ?? null);

            }

        } catch (error) {

            setError(error.message);

        } finally {

            setLoading(false);

        }

    }

    async function createStation(station) {

        try {

            setError(null);

            const created = await ApiService.post(
                "/stations",
                station
            );

            await loadStations();

            setSelectedStation(created);

            setShowCreator(false);

        } catch (error) {

            setError(error.message);

        }

    }

    async function deleteStation(id) {

        if (!window.confirm("Delete this station?")) {

            return;

        }

        try {

            await ApiService.delete(
                `/stations/${id}`
            );

            await loadStations();

            if (selectedStation?.id === id) {

                setSelectedStation(null);

            }

        } catch (error) {

            setError(error.message);

        }

    }

    const filteredStations = useMemo(() => {

        return stations.filter(station =>

            station.name
                .toLowerCase()
                .includes(search.toLowerCase())

        );

    }, [stations, search]);

    return (

        <>

            <div className="page-header">

                <div>

                    <h1>

                        Stations

                    </h1>

                    <p>

                        Configure every scoring station for the event.

                    </p>

                </div>

                <button
                    className="primary-button"
                    onClick={() => setShowCreator(true)}
                >

                    + Create Station

                </button>

            </div>

            {error && (

                <div className="error-banner">

                    {error}

                </div>

            )}

            <input
                className="search-box"
                placeholder="Search stations..."
                value={search}
                onChange={(e) =>
                    setSearch(e.target.value)
                }
            />

            <div className="station-layout">

                <div className="station-list">

                    {loading ? (

                        <div className="loading-panel">

                            Loading stations...

                        </div>

                    ) : filteredStations.length === 0 ? (

                        <div className="empty-panel">

                            No stations exist.

                        </div>

                    ) : (

                        filteredStations.map(station => (

                            <div
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

                                <h2>

                                    {station.name}

                                </h2>

                                <p>

                                    {station.activeConfiguration?.name ??
                                        "No Configuration"}

                                </p>

                            </div>

                        ))

                    )}

                </div>

                <StationDetails

                    station={selectedStation}

                    onDelete={deleteStation}

                    onEdit={() =>
                        setShowCreator(true)
                    }

                />

            </div>

            {showCreator && (

                <StationCreator

                    onCancel={() =>
                        setShowCreator(false)
                    }

                    onCreate={createStation}

                />

            )}

        </>

    );

}