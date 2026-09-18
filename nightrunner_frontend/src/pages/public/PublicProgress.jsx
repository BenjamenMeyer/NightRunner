import {
    useEffect,
    useRef,
    useState
} from "react";

import { useParams } from "react-router-dom";

import {
    getPublicProgress,
    InvalidLinkError
} from "../../api/PublicLinkService.js";

import ProgressGrid, {
    PUBLIC_IDENTITY_COLUMNS
} from "../scoring/live/ProgressGrid.jsx";

import useEventTheme from "../../branding/useEventTheme.js";

import "./PublicPages.css";

// Spectators are not making operational decisions and this endpoint is open, so
// it polls at half the rate of the internal board.
const REFRESH_MS = 30000;


export default function PublicProgress() {

    const { token } = useParams();

    const [loading, setLoading] = useState(true);
    const [invalidLink, setInvalidLink] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const tableWrapperRef = useRef(null);

    // Match the event's palette, the way EventContext does for signed-in users.
    useEventTheme(data?.event?.theme);

    useEffect(() => {

        let cancelled = false;

        async function load() {

            try {

                const response = await getPublicProgress(token);

                if (cancelled) return;

                setData(response);
                setError(null);
                setLastUpdated(new Date());

            } catch (err) {

                if (cancelled) return;

                if (err instanceof InvalidLinkError) {
                    // Terminal: stop polling rather than hammering a dead link.
                    setInvalidLink(true);
                } else {
                    setError(err?.message ?? "Unable to load patrol progress.");
                }

            } finally {
                if (!cancelled) setLoading(false);
            }

        }

        load();

        const timer = setInterval(load, REFRESH_MS);

        return () => {
            cancelled = true;
            clearInterval(timer);
        };

    }, [token]);


    if (invalidLink) {
        return (
            <div className="public-page">
                <div className="public-card">
                    <h1>This link is no longer valid</h1>
                    <p>
                        Ask the event organiser for a current link.
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="public-page">
                <div className="public-card">
                    <p>Loading patrol progress...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="public-page">
            <div className="public-page-inner">

                <header className="public-header">
                    <h1>Patrol Progress</h1>
                    <p>
                        {data?.event?.name ? `${data.event.name} — ` : ""}
                        Which patrols have reached which stations. Scores are not shown here.
                    </p>
                    {lastUpdated && (
                        <p className="public-updated">
                            Updated {lastUpdated.toLocaleTimeString()} — refreshes automatically
                        </p>
                    )}
                </header>

                {error && (
                    <div className="public-error">{error}</div>
                )}

                <ProgressGrid
                    stations={data?.stations ?? []}
                    patrols={data?.patrols ?? []}
                    visits={data?.visits ?? []}
                    displayMode="fit"
                    identityColumns={PUBLIC_IDENTITY_COLUMNS}
                    tableWrapperRef={tableWrapperRef}
                    verboseLegend
                />

            </div>
        </div>
    );

}
