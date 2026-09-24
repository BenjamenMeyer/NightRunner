import {
    useCallback,
    useEffect,
    useState
} from "react";

import { useParams } from "react-router-dom";

import {
    getPublicCheckIn,
    publicCheckIn,
    publicCheckOut,
    InvalidLinkError
} from "../../api/PublicLinkService.js";

import useEventTheme from "../../branding/useEventTheme.js";
import ConfirmDialog, { patrolLabel } from "../../components/ConfirmDialog.jsx";

import "./PublicPages.css";

// Matches the internal Arrivals page, so two volunteers at one station see each
// other's work within a reasonable window.
const REFRESH_MS = 20000;

// Keyed by token so two events on one phone do not collide.
function stationStorageKey(token) {
    return `nr.checkin.station.${token}`;
}

function readStoredStation(token) {
    try {
        return localStorage.getItem(stationStorageKey(token));
    } catch {
        // Private browsing, or storage disabled. The volunteer picks again.
        return null;
    }
}

function storeStation(token, stationId) {
    try {
        localStorage.setItem(stationStorageKey(token), stationId);
    } catch {
        // Not worth interrupting a shift over.
    }
}


function formatTime(value) {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}


export default function PublicCheckIn() {

    const { token } = useParams();

    const [loading, setLoading] = useState(true);
    const [invalidLink, setInvalidLink] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [stationId, setStationId] = useState(() => readStoredStation(token));
    const [choosingStation, setChoosingStation] = useState(false);
    // { patrolId, action } awaiting confirmation. Both check-in and check-out
    // ask first, the same as the signed-in page (#234).
    const [pending, setPending] = useState(null);
    const [busyPatrolId, setBusyPatrolId] = useState(null);

    // Match the event's palette, the way EventContext does for signed-in users.
    useEventTheme(data?.event?.theme);

    const load = useCallback(async () => {

        try {

            const response = await getPublicCheckIn(token);
            setData(response);
            setError(null);

            // A link pinned to one station overrides whatever this device
            // remembered.
            if (response.stationId) {
                setStationId(response.stationId);
            }

        } catch (err) {

            if (err instanceof InvalidLinkError) {
                setInvalidLink(true);
            } else {
                setError(err?.message ?? "Unable to load this station.");
            }

        } finally {
            setLoading(false);
        }

    }, [token]);


    useEffect(() => {

        load();

        const timer = setInterval(load, REFRESH_MS);
        return () => clearInterval(timer);

    }, [load]);


    function visitFor(patrolId) {
        return (data?.visits ?? []).filter(
            (v) => v.patrolId === patrolId && v.stationId === stationId
        ).slice(-1)[0];
    }


    async function act(patrolId, action) {

        setBusyPatrolId(patrolId);

        try {

            if (action === "check-in") {
                await publicCheckIn(token, stationId, patrolId);
            } else {
                await publicCheckOut(token, stationId, patrolId);
            }

            await load();

        } catch (err) {
            setError(err?.message ?? "That did not save. Try again.");
        } finally {
            setBusyPatrolId(null);
            setPending(null);
        }

    }


    if (invalidLink) {
        return (
            <div className="public-page">
                <div className="public-card">
                    <h1>This link is no longer valid</h1>
                    <p>Ask the event organiser for a current link.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="public-page">
                <div className="public-card">
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    const stations = data?.stations ?? [];
    const currentStation = stations.find((s) => s.id === stationId);
    const mustChooseStation = choosingStation || !currentStation;

    if (mustChooseStation) {
        return (
            <div className="public-page">
                <div className="public-page-inner">
                    <header className="public-header">
                        <h1>Choose your station</h1>
                        <p>{data?.event?.name}</p>
                    </header>

                    <div className="checkin-station-list">
                        {stations.map((station) => (
                            <button
                                key={station.id}
                                type="button"
                                className="checkin-station-button"
                                onClick={() => {
                                    setStationId(station.id);
                                    storeStation(token, station.id);
                                    setChoosingStation(false);
                                }}
                            >
                                {station.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="public-page">
            <div className="public-page-inner">

                <header className="public-header checkin-header">
                    <div>
                        <h1>{currentStation.name}</h1>
                        <p>{data?.event?.name}</p>
                    </div>
                    {/* A link pinned to one station cannot be repointed. */}
                    {!data?.stationId && (
                        <button
                            type="button"
                            className="checkin-change-station"
                            onClick={() => setChoosingStation(true)}
                        >
                            Change station
                        </button>
                    )}
                </header>

                {error && (
                    <div className="public-error">{error}</div>
                )}

                <ul className="checkin-patrol-list">
                    {(data?.patrols ?? []).map((patrol) => {

                        const visit = visitFor(patrol.id);
                        const checkedInAt = formatTime(visit?.checkedInAt);
                        const checkedOutAt = formatTime(visit?.checkedOutAt);
                        const isCompleted = visit?.status === "completed";
                        const isHere = Boolean(visit?.checkedInAt) && !visit?.checkedOutAt;
                        const isBusy = busyPatrolId === patrol.id;

                        let stateLabel = "Not arrived";
                        if (isCompleted) {
                            stateLabel = "Scoring complete";
                        } else if (checkedOutAt) {
                            stateLabel = `Checked out ${checkedOutAt}`;
                        } else if (checkedInAt) {
                            stateLabel = `Checked in ${checkedInAt}`;
                        }

                        return (
                            <li key={patrol.id} className="checkin-patrol-row">

                                <div className="checkin-patrol-identity">
                                    <span className="checkin-patrol-number">
                                        {patrol.number ?? "—"}
                                    </span>
                                    <span className="checkin-patrol-name">
                                        {patrol.name}
                                    </span>
                                    <span className="checkin-patrol-state">
                                        {stateLabel}
                                    </span>
                                </div>

                                {isCompleted ? (
                                    <span className="checkin-locked">Locked</span>
                                ) : isHere ? (
                                    <button
                                        type="button"
                                        className="checkin-action"
                                        onClick={() => setPending({ patrolId: patrol.id, action: "check-out" })}
                                        disabled={isBusy}
                                    >
                                        {isBusy ? "Saving..." : "Check out"}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="checkin-action"
                                        onClick={() => setPending({ patrolId: patrol.id, action: "check-in" })}
                                        disabled={isBusy}
                                    >
                                        {isBusy ? "Saving..." : "Check in"}
                                    </button>
                                )}

                            </li>
                        );

                    })}
                </ul>

                {(() => {
                    const pendingPatrol = pending
                        ? (data?.patrols ?? []).find((p) => p.id === pending.patrolId)
                        : null;
                    const isCheckIn = pending?.action === "check-in";
                    return (
                        <ConfirmDialog
                            open={Boolean(pendingPatrol)}
                            title={isCheckIn ? "Check In?" : "Check Out?"}
                            confirmLabel={isCheckIn ? "Yes, check in" : "Yes, check out"}
                            busy={Boolean(pending) && busyPatrolId === pending.patrolId}
                            onConfirm={() => act(pending.patrolId, pending.action)}
                            onCancel={() => setPending(null)}
                        >
                            <p>
                                Checking <strong>{patrolLabel(pendingPatrol)}</strong>{" "}
                                <span className="confirm-dialog-direction">{isCheckIn ? "IN" : "OUT"}</span> at{" "}
                                <strong>{currentStation.name}</strong>.
                            </p>
                            {!isCheckIn && (
                                // Check-out ends the scoring window.
                                <p>Checking out ends this patrol's time at the station.</p>
                            )}
                        </ConfirmDialog>
                    );
                })()}

            </div>
        </div>
    );

}
