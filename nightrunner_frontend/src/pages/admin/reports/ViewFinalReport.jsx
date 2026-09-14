import { useEffect, useState } from "react";
import ApiService from "@/api/ApiService.js";
import { useEventContext } from "@/api/helpers/event/EventContext.jsx";
import "./reports.css";

export default function ViewFinalReport() {
    const { eventId, event } = useEventContext();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reportId = new URLSearchParams(window.location.search).get("reportId");

    useEffect(() => {
        if (!eventId) return;
        loadReportData();
    }, [eventId, reportId]);

    async function loadReportData() {
        try {
            setLoading(true);
            setError(null);
            const data = await ApiService.reportData.getEventReport(eventId);
            setReport(data?.report ?? data);
        } catch (err) {
            console.error("Failed to load report view:", err);
            setError(err?.message || "Failed to load report data.");
        } finally {
            setLoading(false);
        }
    }

    const downloadUrl = reportId
        ? ApiService.reportData.getCompiledReportDownloadUrl(reportId)
        : null;

    if (loading) {
        return (
            <div className="reports-page">
                <div className="reports-state">
                    <div className="reports-state-title" style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center" }}>
                        <span className="reports-spinner" />
                        <span>Loading Report Artifact...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="reports-page">
                <div className="reports-state reports-state--error">
                    <div className="reports-state-title">Unable to Load Report</div>
                    <div className="reports-state-text">{error}</div>
                </div>
            </div>
        );
    }

    const patrols = report?.patrols ?? report?.patrolScores ?? [];

    return (
        <div className="reports-page">
            <div className="reports-page-header">
                <div>
                    <div className="reports-page-eyebrow">Report Viewer</div>
                    <h1>{reportId ? `Final Scoring Report (${reportId})` : "Final Scoring Report"}</h1>
                    <p>Event results breakdown and print artifact view.</p>
                </div>
                <div className="reports-page-actions">
                    <button
                        type="button"
                        className="reports-button"
                        onClick={() => window.history.back()}
                    >
                        ← Back to Reports
                    </button>
                    {downloadUrl && (
                        <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="reports-button reports-button--primary"
                            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}
                        >
                            <span>Download PDF</span>
                        </a>
                    )}
                </div>
            </div>

            <main className="report-document">
                <header className="report-document-header">
                    <div className="report-document-heading">
                        <div className="report-document-brand">Night Runner</div>
                        <h1>{event?.name ?? "Event Scoring Report"}</h1>
                        <div className="report-document-title">Final Scoring Results</div>
                    </div>
                </header>

                <div className="report-table-wrapper" style={{ marginTop: "1.5rem" }}>
                    <table className="report-matrix">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Patrol Name</th>
                                <th>Total Weighted Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {patrols.length === 0 ? (
                                <tr>
                                    <td colSpan={3} style={{ textAlign: "center", color: "var(--text-secondary)" }}>
                                        No scores recorded for this event.
                                    </td>
                                </tr>
                            ) : (
                                patrols.map((p, idx) => (
                                    <tr key={p.patrolId || idx}>
                                        <td><strong>#{p.rank ?? idx + 1}</strong></td>
                                        <td>{p.patrolName || `Patrol ${p.patrolId}`}</td>
                                        <td><strong>{Number(p.eventTotal ?? 0).toFixed(2)}</strong></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
