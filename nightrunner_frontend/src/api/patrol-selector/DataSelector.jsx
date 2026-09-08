import { useState } from "react";

import QRScanner from "./QRScanner.jsx";

import "./DataSelector.css";

export default function DataSelector({
                                         title,
                                         description,
                                         label,
                                         items,
                                         selected,
                                         onSelect,
                                         displayField = "name",
                                         allowScan = false
                                     }) {
    const [showScanner, setShowScanner] = useState(false);

    function handleManualSelection(event) {
        const selectedItem =
            items.find(
                item =>
                    String(item.id) ===
                    String(event.target.value)
            );

        onSelect(selectedItem ?? null);
    }

    function handleScan(item) {
        onSelect(item);
        setShowScanner(false);
    }

    return (
        <>
            <div className="score-selection-card">

                <div className="data-selector-header">

                    <h2>
                        {title}
                    </h2>

                    {description && (
                        <p>
                            {description}
                        </p>
                    )}

                </div>

                {allowScan ? (
                    <div className="data-selector-options">

                        <button
                            type="button"
                            className="scan-card"
                            onClick={() =>
                                setShowScanner(true)
                            }
                        >
                            <span className="scan-icon">
                                📷
                            </span>

                            <span>
                                Scan QR Code
                            </span>
                        </button>

                        <div className="selection-divider">
                            OR
                        </div>

                        <div className="manual-selection">

                            <label>
                                {label}
                            </label>

                            <select
                                value={
                                    selected?.id ?? ""
                                }
                                onChange={
                                    handleManualSelection
                                }
                            >
                                <option value="">
                                    Select {label}...
                                </option>

                                {items.map(item => (
                                    <option
                                        key={item.id}
                                        value={item.id}
                                    >
                                        {item[displayField]}
                                    </option>
                                ))}
                            </select>

                        </div>

                    </div>
                ) : (
                    <div className="manual-selection">

                        <label>
                            {label}
                        </label>

                        <select
                            value={
                                selected?.id ?? ""
                            }
                            onChange={
                                handleManualSelection
                            }
                        >
                            <option value="">
                                Select {label}...
                            </option>

                            {items.map(item => (
                                <option
                                    key={item.id}
                                    value={item.id}
                                >
                                    {item[displayField]}
                                </option>
                            ))}
                        </select>

                    </div>
                )}

                {selected && (
                    <div className="selected-data">

                        <span>
                            ✓
                        </span>

                        <div>
                            <small>
                                Selected {label}
                            </small>

                            <div>
                                {selected[displayField]}
                            </div>
                        </div>

                    </div>
                )}

            </div>

            {showScanner && (
                <QRScanner
                    onScan={handleScan}
                    onCancel={() =>
                        setShowScanner(false)
                    }
                />
            )}
        </>
    );
}