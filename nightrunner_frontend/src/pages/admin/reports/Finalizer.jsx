import { useEffect, useMemo, useState } from "react";
import ApiService from "@/api/ApiService.js";
import { useEventContext } from "@/api/helpers/event/EventContext.jsx";
import "./Finalizer.css";

export default function Finalizer() {
    const { event, eventId, loading: eventLoading, error: eventError } = useEventContext();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [saveMessage, setSaveMessage] = useState(null);

    const [stations, setStations] = useState([]);
    const [patrols, setPatrols] = useState([]);
    const [configurations, setConfigurations] = useState([]);
    const [stationReports, setStationReports] = useState({});

    const [stationStates, setStationStates] = useState({});
    const [summaryCollapsed, setSummaryCollapsed] = useState(false);

    const [isAuthorized, setIsAuthorized] = useState(true);

    useEffect(() => {
        if (eventLoading) return;
        if (eventError) {
            setError(eventError);
            setLoading(false);
            return;
        }
        if (!eventId) {
            setError("No event is currently selected.");
            setLoading(false);
            return;
        }

        const user = ApiService.userData.getCached();
        if (user) {
            const isSysAdmin = ApiService.userData.isSystemAdmin();
            const isEvtAdmin = ApiService.userData.isEventAdmin(eventId);
            const eventRole = ApiService.userData.getEventRole(eventId);
            const rolesList = Array.isArray(eventRole) ? eventRole : [eventRole, ...(user.roles ? Object.values(user.roles) : [])];
            const isStationLead = rolesList.some(r => r === "station_leader" || r === "station_member" || r === "scorer" || r === "scoring-center" || r === "event-admin" || r === "admin");
            
            if (!isSysAdmin && !isEvtAdmin && !isStationLead) {
                setIsAuthorized(false);
                setError("Access Denied: The Event Score Finalizer is restricted to System Administrators, Event Administrators, and Scoring Station Lead roles.");
                setLoading(false);
                return;
            }
        }

        loadData();
    }, [eventId, eventLoading, eventError]);

    const [mismatchWarnings, setMismatchWarnings] = useState([]);
    const [storedResultsMap, setStoredResultsMap] = useState(null);

    async function loadData() {
        try {
            setLoading(true);
            setError(null);
            setSaveMessage(null);

            const [fetchedStations, fetchedPatrols, fetchedConfigs, fetchedStoredResults] = await Promise.all([
                ApiService.stationData.getStations(eventId),
                ApiService.patrolData.getPatrols(eventId),
                ApiService.configurationData.getConfigurations(),
                ApiService.backendTransport.get(`/scores/finalized?eventId=${encodeURIComponent(eventId)}`).catch(() => [])
            ]);

            const loadedStations = fetchedStations || [];
            const loadedPatrols = fetchedPatrols || [];
            const loadedConfigs = fetchedConfigs || [];
            const storedList = Array.isArray(fetchedStoredResults) ? fetchedStoredResults : [];

            setStations(loadedStations);
            setPatrols(loadedPatrols);
            setConfigurations(loadedConfigs);

            // Map stored results: { [`${patrolId}_${stationId || 'final'}`]: { scoreValue, scoringMode } }
            const resultMap = {};
            storedList.forEach((r) => {
                const key = r.stationId ? `${r.patrolId}_${r.stationId}` : `${r.patrolId}_final`;
                resultMap[key] = r;
            });
            setStoredResultsMap(resultMap);

            const reports = {};
            await Promise.all(
                loadedStations.map(async (st) => {
                    try {
                        const rep = await ApiService.reportData.getStationReport(st.id, eventId);
                        reports[st.id] = rep;
                    } catch (e) {
                        console.error(`Failed to load report for station ${st.id}`, e);
                        reports[st.id] = { stationId: st.id, patrols: [] };
                    }
                })
            );
            setStationReports(reports);

            const initialStates = {};
            loadedStations.forEach((st) => {
                const configTasks = st.tasks || [];
                const enabledTasks = {};
                const taskWeights = {};

                configTasks.forEach((t) => {
                    const taskId = t.id || t._id;
                    enabledTasks[taskId] = t.active !== false;
                    taskWeights[taskId] = t.scoreWeight !== undefined ? Number(t.scoreWeight) : 1.0;
                });

                initialStates[st.id] = {
                    mode: "absolute",
                    enabledTasks,
                    taskWeights,
                    stationWeight: st.station_weight !== undefined ? Number(st.station_weight) : 1.0,
                    collapsed: false
                };
            });
            setStationStates(initialStates);

        } catch (err) {
            console.error("Failed to load finalizer data:", err);
            setError(err?.message || "Failed to load event score finalizer data.");
        } finally {
            setLoading(false);
        }
    }

    function handleTaskEnabledChange(stationId, taskId, checked) {
        setStationStates((prev) => ({
            ...prev,
            [stationId]: {
                ...prev[stationId],
                enabledTasks: {
                    ...prev[stationId].enabledTasks,
                    [taskId]: checked
                }
            }
        }));
    }

    function handleTaskWeightChange(stationId, taskId, val) {
        const numVal = parseFloat(val);
        const weight = Number.isNaN(numVal) ? 0 : numVal;
        setStationStates((prev) => ({
            ...prev,
            [stationId]: {
                ...prev[stationId],
                taskWeights: {
                    ...prev[stationId].taskWeights,
                    [taskId]: weight
                }
            }
        }));
    }

    function handleModeChange(stationId, mode) {
        setStationStates((prev) => ({
            ...prev,
            [stationId]: {
                ...prev[stationId],
                mode
            }
        }));
    }

    function handleStationWeightChange(stationId, val) {
        const numVal = parseFloat(val);
        const weight = Number.isNaN(numVal) ? 0 : numVal;
        setStationStates((prev) => ({
            ...prev,
            [stationId]: {
                ...prev[stationId],
                stationWeight: weight
            }
        }));
    }

    function toggleCollapse(stationId) {
        setStationStates((prev) => ({
            ...prev,
            [stationId]: {
                ...prev[stationId],
                collapsed: !prev[stationId]?.collapsed
            }
        }));
    }

    async function saveStationConfiguration(stationId) {
        const stationObj = stations.find((s) => String(s.id) === String(stationId));
        if (!stationObj) return;

        const stState = stationStates[stationId];
        if (!stState) return;

        try {
            setSaving(true);
            setSaveMessage(null);
            setError(null);

            const updatedTasks = (stationObj.tasks || []).map((t) => {
                const taskId = t.id || t._id;
                return {
                    ...t,
                    active: stState.enabledTasks[taskId] !== false,
                    scoreWeight: stState.taskWeights[taskId] !== undefined ? stState.taskWeights[taskId] : 1.0
                };
            });

            const updatePayload = {
                ...stationObj,
                station_weight: stState.stationWeight,
                tasks: updatedTasks
            };

            await ApiService.stationData.updateStation(stationId, updatePayload);

            setSaveMessage(`Successfully saved weights and configuration for "${stationObj.name}".`);

            setStations((prev) =>
                prev.map((s) => (String(s.id) === String(stationId) ? { ...s, ...updatePayload } : s))
            );
        } catch (err) {
            console.error("Failed to save station configuration:", err);
            setError(err?.message || "Failed to save station configuration.");
        } finally {
            setSaving(false);
        }
    }

    const stationCalculations = useMemo(() => {
        const calcs = {};

        stations.forEach((st) => {
            const stState = stationStates[st.id] || { enabledTasks: {}, taskWeights: {}, mode: "absolute" };
            const tasks = st.tasks || [];
            const stReport = stationReports[st.id] || { patrols: [] };

            const patrolBreakdownMap = {};
            (stReport.patrols || []).forEach((p) => {
                const taskMap = {};
                (p.breakdown || []).forEach((b) => {
                    taskMap[b.taskId] = b.rawScore;
                });
                patrolBreakdownMap[p.patrolId] = taskMap;
            });

            let maxAbsoluteAchieved = 0;
            const patrolTotals = {};

            patrols.forEach((p) => {
                const pTaskMap = patrolBreakdownMap[p.id] || {};
                let sum = 0;

                tasks.forEach((t) => {
                    const taskId = t.id || t._id;
                    const isEnabled = stState.enabledTasks[taskId] !== false;
                    if (isEnabled) {
                        const weight = stState.taskWeights[taskId] !== undefined ? stState.taskWeights[taskId] : 1.0;
                        const rawScore = pTaskMap[taskId] !== undefined ? Number(pTaskMap[taskId]) : 0;
                        sum += rawScore * weight;
                    }
                });

                patrolTotals[p.id] = { total: sum };
                if (sum > maxAbsoluteAchieved) {
                    maxAbsoluteAchieved = sum;
                }
            });

            patrols.forEach((p) => {
                const rawTotal = patrolTotals[p.id].total;
                let relScore = 0;
                if (stState.mode === "relative") {
                    relScore = maxAbsoluteAchieved > 0 ? (rawTotal / maxAbsoluteAchieved) * 10 : 0;
                } else {
                    relScore = rawTotal;
                }
                patrolTotals[p.id].relativeScore = relScore;
            });

            calcs[st.id] = {
                patrolTotals,
                maxAbsoluteAchieved
            };
        });

        return calcs;
    }, [stations, patrols, stationReports, stationStates]);

    const summaryCalculations = useMemo(() => {
        const summary = {};

        patrols.forEach((p) => {
            let grandTotal = 0;
            const stationBreakdown = {};

            stations.forEach((st) => {
                const stState = stationStates[st.id] || { mode: "absolute", stationWeight: 1.0 };
                const stCalc = stationCalculations[st.id]?.patrolTotals?.[p.id];
                const baseScore = stCalc ? stCalc.relativeScore : 0;
                const stationWeight = stState.stationWeight !== undefined ? stState.stationWeight : 1.0;

                const weightedStationScore = baseScore * stationWeight;
                stationBreakdown[st.id] = weightedStationScore;
                grandTotal += weightedStationScore;
            });

            summary[p.id] = {
                stationBreakdown,
                finalScore: grandTotal
            };
        });

        return summary;
    }, [stations, patrols, stationCalculations, stationStates]);

    // Validate calculated results against stored database results
    useEffect(() => {
        if (!storedResultsMap || Object.keys(storedResultsMap).length === 0) {
            setMismatchWarnings([]);
            return;
        }

        const warnings = [];

        patrols.forEach((p) => {
            const pName = p.name || p.programName || `Patrol ${p.id}`;

            // Check overall final score
            const calcFinal = summaryCalculations[p.id]?.finalScore;
            const storedFinalRecord = storedResultsMap[`${p.id}_final`];
            if (storedFinalRecord && calcFinal !== undefined) {
                const diff = Math.abs(calcFinal - Number(storedFinalRecord.scoreValue));
                if (diff > 0.01) {
                    warnings.push(`Final score mismatch for "${pName}": Stored=${Number(storedFinalRecord.scoreValue).toFixed(2)}, Calculated=${calcFinal.toFixed(2)}.`);
                }
            }

            // Check station scores
            stations.forEach((st) => {
                const stName = st.name || `Station ${st.id}`;
                const calcStation = stationCalculations[st.id]?.patrolTotals?.[p.id]?.relativeScore;
                const storedStationRecord = storedResultsMap[`${p.id}_${st.id}`];
                if (storedStationRecord && calcStation !== undefined) {
                    const diff = Math.abs(calcStation - Number(storedStationRecord.scoreValue));
                    if (diff > 0.01) {
                        warnings.push(`Station "${stName}" score mismatch for "${pName}": Stored=${Number(storedStationRecord.scoreValue).toFixed(2)}, Calculated=${calcStation.toFixed(2)}.`);
                    }
                }
            });
        });

        setMismatchWarnings(warnings);
    }, [storedResultsMap, summaryCalculations, stationCalculations, patrols, stations]);

    async function saveFinalizedResults() {
        if (!eventId) return;

        try {
            setSaving(true);
            setSaveMessage(null);
            setError(null);

            const payloadResults = [];

            // Add station scores for each patrol
            stations.forEach((st) => {
                const stMode = stationStates[st.id]?.mode || "absolute";
                patrols.forEach((p) => {
                    const val = stationCalculations[st.id]?.patrolTotals?.[p.id]?.relativeScore || 0;
                    payloadResults.push({
                        patrolId: p.id,
                        stationId: st.id,
                        scoreType: "station",
                        scoreValue: val,
                        scoringMode: stMode
                    });
                });
            });

            // Add final overall score for each patrol
            patrols.forEach((p) => {
                const val = summaryCalculations[p.id]?.finalScore || 0;
                payloadResults.push({
                    patrolId: p.id,
                    stationId: null,
                    scoreType: "final",
                    scoreValue: val,
                    scoringMode: "overall"
                });
            });

            await ApiService.backendTransport.post("/scores/finalized", {
                eventId,
                results: payloadResults
            });

            setSaveMessage("Successfully finalized and stored event scores into database.");
            setMismatchWarnings([]);

            // Refresh stored results map
            const newMap = {};
            payloadResults.forEach((r) => {
                const key = r.stationId ? `${r.patrolId}_${r.stationId}` : `${r.patrolId}_final`;
                newMap[key] = r;
            });
            setStoredResultsMap(newMap);

        } catch (err) {
            console.error("Failed to save finalized results:", err);
            setError(err?.message || "Failed to store finalized scores.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="finalizer-page">
            <div className="finalizer-header">
                <div>
                    <h1>Event Score Finalizer</h1>
                    <p>Adjust task inclusion, task weights, scoring mode (Absolute vs Relative), and calculate final standings.</p>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button type="button" className="primary-button" onClick={saveFinalizedResults} disabled={saving || loading}>
                        {saving ? "Saving..." : "💾 Save & Finalize Scores to DB"}
                    </button>
                    <button type="button" className="secondary-button" onClick={loadData} disabled={loading}>
                        🔄 Refresh Data
                    </button>
                </div>
            </div>

            {error && (
                <div className="finalizer-alert finalizer-alert--error">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {mismatchWarnings.length > 0 && (
                <div className="finalizer-alert finalizer-alert--warning" style={{
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.5)",
                    color: "#fcd34d",
                    borderRadius: "8px",
                    padding: "1rem"
                }}>
                    <strong style={{ fontSize: "1.05rem" }}>⚠️ Stored Calculation Mismatch Warning:</strong>
                    <p style={{ margin: "0.25rem 0 0.5rem 0", fontSize: "0.9rem" }}>
                        The calculated scores based on current station settings do not match the finalized scores currently stored in the database.
                    </p>
                    <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.85rem" }}>
                        {mismatchWarnings.map((warn, i) => (
                            <li key={i}>{warn}</li>
                        ))}
                    </ul>
                </div>
            )}

            {saveMessage && (
                <div className="finalizer-alert finalizer-alert--success">
                    <strong>Success:</strong> {saveMessage}
                </div>
            )}

            {stations.map((st) => {
                const stState = stationStates[st.id] || {
                    mode: "absolute",
                    enabledTasks: {},
                    taskWeights: {},
                    stationWeight: 1.0,
                    collapsed: false
                };
                const tasks = st.tasks || [];
                const stCalc = stationCalculations[st.id] || { patrolTotals: {}, maxAbsoluteAchieved: 0 };
                const stReport = stationReports[st.id] || { patrols: [] };

                const patrolBreakdownMap = {};
                (stReport.patrols || []).forEach((p) => {
                    const taskMap = {};
                    (p.breakdown || []).forEach((b) => {
                        taskMap[b.taskId] = b.rawScore;
                    });
                    patrolBreakdownMap[p.patrolId] = taskMap;
                });

                return (
                    <div key={st.id} className="station-bubble-card">
                        <div className="station-bubble-header">
                            <div className="station-bubble-title">
                                <h2>{st.name}</h2>
                                <span className="station-task-count">({tasks.length} tasks)</span>
                            </div>

                            <div className="station-bubble-controls">
                                <div className="mode-selector">
                                    <label>Scoring Mode:</label>
                                    <select
                                        value={stState.mode}
                                        onChange={(e) => handleModeChange(st.id, e.target.value)}
                                        className="finalizer-select"
                                    >
                                        <option value="absolute">Absolute Score</option>
                                        <option value="relative">Relative to Max Patrol (10pt Scale)</option>
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    className="secondary-button save-station-btn"
                                    onClick={() => saveStationConfiguration(st.id)}
                                    disabled={saving}
                                    title="Save task active flags and weights to station configuration"
                                >
                                    💾 Save Weights
                                </button>

                                <button
                                    type="button"
                                    className="collapse-toggle-btn"
                                    onClick={() => toggleCollapse(st.id)}
                                >
                                    {stState.collapsed ? "Show Table" : "Hide Table"}
                                </button>
                            </div>
                        </div>

                        {!stState.collapsed && (
                            <div className="table-responsive">
                                <table className="finalizer-table">
                                    <thead>
                                        <tr className="header-row-names">
                                            <th className="col-patrol">Patrol</th>
                                            {tasks.map((t) => (
                                                <th key={t.id || t._id} className="col-task">
                                                    {t.name || t.description || "Task"}
                                                </th>
                                            ))}
                                            <th className="col-total">
                                                {stState.mode === "relative" ? "Total Score (10pt Relative)" : "Total Score (Weighted Sum)"}
                                            </th>
                                        </tr>

                                        <tr className="header-row-checkboxes">
                                            <td className="col-patrol-label">Used for Scoring?</td>
                                            {tasks.map((t) => {
                                                const taskId = t.id || t._id;
                                                const checked = stState.enabledTasks[taskId] !== false;
                                                return (
                                                    <td key={taskId} className="col-task-center">
                                                        <label className="checkbox-label">
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={(e) =>
                                                                    handleTaskEnabledChange(st.id, taskId, e.target.checked)
                                                                }
                                                            />
                                                            Include
                                                        </label>
                                                    </td>
                                                );
                                            })}
                                            <td className="col-total-label">
                                                {stState.mode === "relative" ? `Max Patrol Raw: ${stCalc.maxAbsoluteAchieved.toFixed(1)}` : "Sum"}
                                            </td>
                                        </tr>

                                        <tr className="header-row-weights">
                                            <td className="col-patrol-label">Task Weight Multiplier</td>
                                            {tasks.map((t) => {
                                                const taskId = t.id || t._id;
                                                const weight = stState.taskWeights[taskId] !== undefined ? stState.taskWeights[taskId] : 1.0;
                                                return (
                                                    <td key={taskId} className="col-task-center">
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            min="0"
                                                            className="weight-input"
                                                            value={weight}
                                                            onChange={(e) =>
                                                                handleTaskWeightChange(st.id, taskId, e.target.value)
                                                            }
                                                        />
                                                    </td>
                                                );
                                            })}
                                            <td className="col-total-label">Subtotal</td>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {patrols.map((p) => {
                                            const pTaskMap = patrolBreakdownMap[p.id] || {};
                                            const pCalc = stCalc.patrolTotals[p.id] || { total: 0, relativeScore: 0 };
                                            const displayTotal = stState.mode === "relative" ? pCalc.relativeScore : pCalc.total;

                                            return (
                                                <tr key={p.id}>
                                                    <td className="col-patrol-name">
                                                        <strong>{p.name || p.programName || "Patrol"}</strong>
                                                        {p.patrolNumber && (
                                                            <span className="patrol-subtext"> (#{p.patrolNumber})</span>
                                                        )}
                                                    </td>

                                                    {tasks.map((t) => {
                                                        const taskId = t.id || t._id;
                                                        const isEnabled = stState.enabledTasks[taskId] !== false;
                                                        const rawScore = pTaskMap[taskId];
                                                        const weight = stState.taskWeights[taskId] !== undefined ? stState.taskWeights[taskId] : 1.0;

                                                        return (
                                                            <td
                                                                key={taskId}
                                                                className={`col-task-score ${!isEnabled ? "task-disabled" : ""}`}
                                                            >
                                                                {rawScore !== undefined ? (
                                                                    <span>
                                                                        {Number(rawScore).toFixed(1)}
                                                                        {weight !== 1.0 && isEnabled && (
                                                                            <small className="score-weighted-hint">
                                                                                {" "}
                                                                                ({(Number(rawScore) * weight).toFixed(1)})
                                                                            </small>
                                                                        )}
                                                                    </span>
                                                                ) : (
                                                                    <span className="score-missing">—</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}

                                                    <td className="col-total-val">
                                                        <strong>{displayTotal.toFixed(2)}</strong>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            })}

            <div className="finalizer-break-bar">
                <hr />
                <span>🏆 Overall Event Final Standings & Station Weights</span>
                <hr />
            </div>

            <div className="station-bubble-card summary-bubble-card">
                <div className="station-bubble-header">
                    <div className="station-bubble-title">
                        <h2>Event Overall Score Summary</h2>
                        <span className="station-task-count">({stations.length} stations combined)</span>
                    </div>

                    <button
                        type="button"
                        className="collapse-toggle-btn"
                        onClick={() => setSummaryCollapsed(!summaryCollapsed)}
                    >
                        {summaryCollapsed ? "Show Table" : "Hide Table"}
                    </button>
                </div>

                {!summaryCollapsed && (
                    <div className="table-responsive">
                        <table className="finalizer-table summary-table">
                            <thead>
                                <tr className="header-row-names">
                                    <th className="col-patrol">Patrol</th>
                                    {stations.map((st) => (
                                        <th key={st.id} className="col-task">
                                            {st.name}
                                        </th>
                                    ))}
                                    <th className="col-total col-final-score">Final Score</th>
                                </tr>

                                <tr className="header-row-checkboxes">
                                    <td className="col-patrol-label">Scoring Mode</td>
                                    {stations.map((st) => {
                                        const stState = stationStates[st.id] || { mode: "absolute" };
                                        return (
                                            <td key={st.id} className="col-task-center font-sm">
                                                {stState.mode === "relative" ? "Relative (10pt)" : "Absolute Sum"}
                                            </td>
                                        );
                                    })}
                                    <td className="col-total-label">Final Weighted Sum</td>
                                </tr>

                                <tr className="header-row-weights">
                                    <td className="col-patrol-label">Station Weight Multiplier</td>
                                    {stations.map((st) => {
                                        const stState = stationStates[st.id] || { stationWeight: 1.0 };
                                        const weight = stState.stationWeight !== undefined ? stState.stationWeight : 1.0;
                                        return (
                                            <td key={st.id} className="col-task-center">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    className="weight-input"
                                                    value={weight}
                                                    onChange={(e) => handleStationWeightChange(st.id, e.target.value)}
                                                />
                                            </td>
                                        );
                                    })}
                                    <td className="col-total-label">Grand Total</td>
                                </tr>
                            </thead>

                            <tbody>
                                {[...patrols]
                                    .sort((a, b) => {
                                        const scoreA = summaryCalculations[a.id]?.finalScore || 0;
                                        const scoreB = summaryCalculations[b.id]?.finalScore || 0;
                                        return scoreB - scoreA;
                                    })
                                    .map((p, idx) => {
                                        const pSummary = summaryCalculations[p.id] || { stationBreakdown: {}, finalScore: 0 };
                                        const rank = idx + 1;

                                        return (
                                            <tr key={p.id} className={rank === 1 ? "row-winner" : ""}>
                                                <td className="col-patrol-name">
                                                    <span className="rank-badge">#{rank}</span>
                                                    <strong>{p.name || p.programName || "Patrol"}</strong>
                                                </td>

                                                {stations.map((st) => {
                                                    const stationScore = pSummary.stationBreakdown[st.id] || 0;
                                                    return (
                                                        <td key={st.id} className="col-task-score">
                                                            {stationScore.toFixed(2)}
                                                        </td>
                                                    );
                                                })}

                                                <td className="col-total-val col-final-score-val">
                                                    <strong>{pSummary.finalScore.toFixed(2)}</strong>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
