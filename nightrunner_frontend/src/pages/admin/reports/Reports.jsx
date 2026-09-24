import { useEffect, useState } from "react";
import ApiService from "@/api/ApiService.js";
import { useEventContext } from "@/api/helpers/event/EventContext.jsx";
import "./reports.css";

export default function Reports() {
    const {
        event,
        eventId,
        loading: eventLoading,
        error: eventError,
        isSystemAdmin
    } = useEventContext();

    const [compiledReports, setCompiledReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [generatingReport, setGeneratingReport] = useState(false);

    useEffect(() => {
        if (!eventId) {
            setCompiledReports([]);
            setLoading(false);
            return;
        }

        loadCompiledReports();
    }, [eventId]);

    // Polling interval for compiled report status updates when any report is generating
    useEffect(() => {
        if (!eventId) return;

        const hasGenerating = compiledReports.some(r => r.status === "generating");
        if (!hasGenerating) return;

        const timer = setInterval(() => {
            loadCompiledReports();
        }, 2500);

        return () => clearInterval(timer);
    }, [eventId, compiledReports]);

    async function loadCompiledReports() {
        if (!eventId) return;
        try {
            setError(null);
            const res = await ApiService.reportData.listCompiledReports(eventId);
            setCompiledReports(res?.reports ?? []);
        } catch (err) {
            console.error("Failed loading compiled reports list:", err);
            setError(err?.message || "Failed loading compiled reports registry.");
        } finally {
            setLoading(false);
        }
    }

    async function handleGenerateCompiledReport(reportType = "patrols-pdf") {
        if (!eventId) return;
        try {
            setGeneratingReport(true);
            await ApiService.reportData.generateReportJob(eventId, reportType);
            await loadCompiledReports();
        } catch (err) {
            console.error("Failed initiating report generation job:", err);
        } finally {
            setGeneratingReport(false);
        }
    }

    async function handleDeleteCompiledReport(reportId) {
        if (!reportId) return;
        try {
            await ApiService.reportData.deleteCompiledReport(reportId);
            await loadCompiledReports();
        } catch (err) {
            console.error("Failed deleting compiled report:", err);
        }
    }

    function formatDateTime(date) {
        if (!date) return "—";
        const parsed = new Date(date);
        if (Number.isNaN(parsed.getTime())) return "—";
        return parsed.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        });
    }

    if (eventLoading) {
        return (
            <div className="reports-page">
                <div className="reports-state">
                    <div className="reports-state-title" style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center" }}>
                        <span className="reports-spinner" />
                        <span>Loading event details...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (eventError) {
        return (
            <div className="reports-page">
                <div className="reports-state reports-state--error">
                    <div className="reports-state-title">Unable to load event</div>
                    <div className="reports-state-text">{eventError}</div>
                </div>
            </div>
        );
    }

    if (!eventId) {
        return (
            <div className="reports-page">
                <div className="reports-state">
                    <div className="reports-state-title">No Event Selected</div>
                    <div className="reports-state-text">
                        {isSystemAdmin
                            ? "Select an event to view its report registry."
                            : "There is no event currently selected."
                        }
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="reports-page">
            <div className="reports-page-header">
                <div>
                    <div className="reports-page-eyebrow">Administration</div>
                    <h1>Event Reports</h1>
                    <p>
                        Compiled report archive registry. View, download, or generate report artifacts for {event?.name || "this event"}.
                    </p>
                </div>

                <div className="reports-page-actions">
                    <button
                        type="button"
                        className="reports-button"
                        onClick={loadCompiledReports}
                        disabled={loading}
                    >
                        {loading ? "Refreshing..." : "Refresh Registry"}
                    </button>

                    <button
                        type="button"
                        className="reports-button reports-button--primary"
                        onClick={() => handleGenerateCompiledReport("patrols-pdf")}
                        disabled={generatingReport}
                    >
                        {generatingReport ? "Queueing..." : "Generate Patrol QR PDF"}
                    </button>
                </div>
            </div>

            <div className="reports-notice-banner" style={{ background: "var(--card-bg)", border: "1px solid var(--border)", padding: "12px 16px", borderRadius: "8px", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Need to finalize scores or generate a new Final Scoring Report?</span>
                <a href="/admin/finalizer" className="reports-button" style={{ textDecoration: "none" }}>
                    Go to Score Finalizer →
                </a>
            </div>

            {error && (
                <div className="reports-alert" style={{ marginBottom: "1.5rem" }}>
                    <strong>Registry Error</strong>
                    <span>{error}</span>
                </div>
            )}

            <section className="compiled-reports-section">
                <div className="report-section-heading">
                    <div>
                        <div className="report-section-eyebrow">Registry</div>
                        <h2>Compiled Report Entries</h2>
                        <p>Listed by creation order (newest first).</p>
                    </div>
                </div>

                <div className="report-table-wrapper">
                    <table className="report-matrix">
                        <thead>
                            <tr>
                                <th>Report Name & ID</th>
                                <th>Report Type</th>
                                <th>Status</th>
                                <th>Created At</th>
                                <th>Size</th>
                                <th style={{ textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && compiledReports.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center" }}>
                                            <span className="reports-spinner" />
                                            <span>Loading compiled reports...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : compiledReports.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                                        No compiled reports generated yet for this event. Click <strong>Generate Patrol QR PDF</strong> or visit the <strong>Score Finalizer</strong> page to generate report artifacts.
                                    </td>
                                </tr>
                            ) : (
                                compiledReports.map((item) => {
                                    const isScoringReport = item.report_type === "event-scoring";
                                    const isGenerating = item.status === "generating";

                                    return (
                                        <tr key={item.id}>
                                            <td>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                    {isGenerating && <span className="reports-spinner" />}
                                                    <strong>{item.name || "Compiled Report"}</strong>
                                                </div>
                                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>ID: {item.id}</div>
                                            </td>
                                            <td>
                                                <span className="badge" style={{ background: "var(--input-bg)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.8rem" }}>
                                                    {item.report_type === "event-scoring-draft" ? "Draft Scoring" : (item.report_type === "event-scoring" ? "Final Scoring" : (item.report_type === "event-scoring-ods" ? "Scoring ODS" : "Patrol QR Badges"))}
                                                </span>
                                            </td>
                                            <td>
                                                {isGenerating && (
                                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--button-bg)", fontWeight: "600", fontSize: "0.85rem" }}>
                                                        <span className="reports-spinner" />
                                                        <span>Generating...</span>
                                                    </div>
                                                )}
                                                {item.status === "ready" && (
                                                    <span className="badge badge-success" style={{ background: "#38a169", color: "#fff", padding: "2px 8px", borderRadius: "4px", fontSize: "0.8rem" }}>
                                                        Ready
                                                    </span>
                                                )}
                                                {item.status === "failed" && (
                                                    <span className="badge badge-danger" style={{ background: "#e53e3e", color: "#fff", padding: "2px 8px", borderRadius: "4px", fontSize: "0.8rem" }} title={item.error_message}>
                                                        Failed
                                                    </span>
                                                )}
                                            </td>
                                            <td>{formatDateTime(item.created_at)}</td>
                                            <td>{item.size_bytes ? `${(item.size_bytes / 1024).toFixed(1)} KB` : "—"}</td>
                                            <td style={{ textAlign: "right" }}>
                                                {item.status === "ready" && item.report_type?.startsWith("event-scoring") && (
                                                    <a
                                                        href={`/admin/reports/view?reportId=${item.id}&eventId=${eventId}`}
                                                        className="reports-button"
                                                        style={{ textDecoration: "none", marginRight: "8px", display: "inline-block" }}
                                                    >
                                                        View Report
                                                    </a>
                                                )}
                                                {item.status === "ready" && (() => {
                                                    const isSpreadsheet =
                                                        item.report_type?.endsWith("-ods") ||
                                                        item.file_key?.endsWith(".ods") ||
                                                        item.content_type?.includes("spreadsheet");
                                                    const ext = isSpreadsheet ? "ods" : "pdf";
                                                    const label = isSpreadsheet ? "Download Spreadsheet" : "Download PDF";
                                                    const filename = `${item.name || "report"}.${ext}`;

                                                    return (
                                                        <button
                                                            type="button"
                                                            className="reports-button"
                                                            style={{ marginRight: "8px" }}
                                                            onClick={() => {
                                                                ApiService.reportData.downloadCompiledReport(item.id, filename).catch((err) => {
                                                                    console.error("Failed to download report:", err);
                                                                    setError(err?.message || "Failed downloading report artifact.");
                                                                });
                                                            }}
                                                        >
                                                            {label}
                                                        </button>
                                                    );
                                                })()}
                                                <button
                                                    type="button"
                                                    className="reports-button"
                                                    style={{ color: "#e53e3e", borderColor: "#e53e3e" }}
                                                    onClick={() => handleDeleteCompiledReport(item.id)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}