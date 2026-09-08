import {
    useEffect,
    useMemo,
    useState
} from "react";

import ApiService from "@/api/ApiService.js";

import "./print-report.css";

export default function PrintReport() {

    const [report, setReport] = useState(null);
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);


    const eventId =
        new URLSearchParams(
            window.location.search
        ).get("eventId");


    useEffect(() => {

        if (!eventId) {

            setError(
                "No event ID was provided."
            );

            setLoading(false);

            return;
        }

        loadReport();

    }, [eventId]);


    async function loadReport() {

        try {

            setLoading(true);
            setError(null);

            const [
                reportResponse,
                eventResponse
            ] = await Promise.all([
                ApiService.reportData
                    .getEventReport(eventId),

                ApiService.eventData
                    .getEvent(eventId)
            ]);


            const loadedReport =
                reportResponse?.report ??
                reportResponse;


            setReport(
                loadedReport
            );

            setEvent(
                eventResponse
            );

        }
        catch (error) {

            console.error(
                "Failed to load printable report:",
                error
            );

            setError(
                error?.message ??
                "Unable to load the report."
            );

        }
        finally {

            setLoading(false);

        }

    }


    useEffect(() => {

        if (
            !loading &&
            report &&
            !error
        ) {

            const timeout =
                window.setTimeout(
                    () => {
                        window.print();
                    },
                    300
                );

            return () => {
                window.clearTimeout(
                    timeout
                );
            };

        }

    }, [
        loading,
        report,
        error
    ]);


    function formatDate(date) {

        if (!date) {
            return "—";
        }

        const parsed =
            new Date(date);

        if (
            Number.isNaN(
                parsed.getTime()
            )
        ) {
            return "—";
        }

        return parsed.toLocaleDateString(
            undefined,
            {
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );

    }


    function formatDateTime(date) {

        if (!date) {
            return "—";
        }

        const parsed =
            new Date(date);

        if (
            Number.isNaN(
                parsed.getTime()
            )
        ) {
            return "—";
        }

        return parsed.toLocaleString(
            undefined,
            {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit"
            }
        );

    }


    const stations = useMemo(() => {

        const stationMap =
            new Map();

        for (
            const patrol
            of report?.patrolScores ?? []
            ) {

            for (
                const station
                of patrol.stationBreakdown ?? []
                ) {

                if (!station?.stationId) {
                    continue;
                }

                if (
                    !stationMap.has(
                        station.stationId
                    )
                ) {

                    stationMap.set(
                        station.stationId,
                        {
                            stationId:
                            station.stationId,

                            stationName:
                                station.stationName ??
                                "Unnamed Station"
                        }
                    );

                }

            }

        }

        return Array.from(
            stationMap.values()
        );

    }, [report]);


    const patrols = useMemo(() => {

        return [
            ...(report?.patrolScores ?? [])
        ].sort(
            (a, b) => {

                const rankA =
                    Number.isFinite(
                        Number(a.rank)
                    )
                        ? Number(a.rank)
                        : Number.MAX_SAFE_INTEGER;

                const rankB =
                    Number.isFinite(
                        Number(b.rank)
                    )
                        ? Number(b.rank)
                        : Number.MAX_SAFE_INTEGER;

                if (rankA !== rankB) {
                    return rankA - rankB;
                }

                return String(
                    a.patrolName ?? ""
                ).localeCompare(
                    String(
                        b.patrolName ?? ""
                    )
                );

            }
        );

    }, [report]);


    if (loading) {

        return (
            <div className="print-report-loading">
                Preparing report...
            </div>
        );

    }


    if (error) {

        return (
            <div className="print-report-error">

                <h1>
                    Unable to Print Report
                </h1>

                <p>
                    {error}
                </p>

            </div>
        );

    }


    if (!report) {
        return null;
    }


    const winner =
        patrols[0] ?? null;


    return (
        <div className="print-report">

            <header className="print-report-header">

                <div>

                    <div className="print-report-brand">
                        Night Runner
                    </div>

                    <h1>
                        {report.eventName ??
                            event?.name ??
                            "Event Report"
                        }
                    </h1>

                    <div className="print-report-subtitle">
                        Final Scoring Report
                    </div>

                </div>


                <div className="print-report-meta">

                    <div>
                        <span>
                            Event Date
                        </span>

                        <strong>
                            {formatDate(
                                event?.date
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>
                            Generated
                        </span>

                        <strong>
                            {formatDateTime(
                                report.generatedAt
                            )}
                        </strong>
                    </div>

                </div>

            </header>


            <section className="print-report-summary">

                <div>

                    <span>
                        Patrols
                    </span>

                    <strong>
                        {report.summary
                                ?.totalPatrols ??
                            patrols.length
                        }
                    </strong>

                </div>


                <div>

                    <span>
                        Stations
                    </span>

                    <strong>
                        {report.summary
                                ?.totalStations ??
                            stations.length
                        }
                    </strong>

                </div>


                <div>

                    <span>
                        First Place
                    </span>

                    <strong>
                        {winner?.patrolName ??
                            "—"
                        }
                    </strong>

                </div>


                <div>

                    <span>
                        Final Score
                    </span>

                    <strong>
                        {winner?.totalScore ??
                            0
                        }
                    </strong>

                </div>

            </section>


            <table className="print-report-table">

                <thead>

                <tr>

                    <th className="print-place">
                        Place
                    </th>

                    <th className="print-patrol">
                        Patrol
                    </th>

                    {stations.map(
                        station => (

                            <th
                                key={
                                    station.stationId
                                }
                                className="print-station"
                            >
                                {station.stationName}
                            </th>

                        )
                    )}

                    <th className="print-final">
                        Final Score
                    </th>

                </tr>

                </thead>


                <tbody>

                {patrols.map(
                    patrol => {

                        const scores =
                            new Map(
                                (
                                    patrol.stationBreakdown ??
                                    []
                                ).map(
                                    station => [
                                        station.stationId,
                                        station.score
                                    ]
                                )
                            );


                        const isWinner =
                            Number(
                                patrol.rank
                            ) === 1;


                        return (

                            <tr
                                key={
                                    patrol.patrolId
                                }
                                className={
                                    isWinner
                                        ? "print-winner"
                                        : ""
                                }
                            >

                                <td className="print-place">

                                    {patrol.rank ??
                                        "—"
                                    }

                                </td>


                                <td className="print-patrol">

                                    {patrol.patrolName ??
                                        "Unnamed Patrol"
                                    }

                                </td>


                                {stations.map(
                                    station => {

                                        const score =
                                            scores.get(
                                                station.stationId
                                            );

                                        return (

                                            <td
                                                key={
                                                    station.stationId
                                                }
                                                className="print-score"
                                            >
                                                {score ??
                                                    0
                                                }
                                            </td>

                                        );

                                    }
                                )}


                                <td className="print-final">

                                    {patrol.totalScore ??
                                        0
                                    }

                                </td>

                            </tr>

                        );

                    }
                )}

                </tbody>

            </table>


            <footer className="print-report-footer">

                <span>
                    Night Runner
                </span>

                <span>
                    {report.eventName ??
                        event?.name ??
                        "Event Report"
                    }
                </span>

                <span>
                    Generated{" "}
                    {formatDateTime(
                        report.generatedAt
                    )}
                </span>

            </footer>

        </div>
    );

}