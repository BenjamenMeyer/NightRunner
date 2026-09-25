import { useState, useMemo, useRef, useEffect } from "react";
import QRScanner from "./QRScanner.jsx";
import { formatPatrolLabel } from "@/utils/patrolUtils.js";
import "./DataSelector.css";

export default function DataSelector({
    title,
    description,
    label,
    items = [],
    selected,
    onSelect,
    displayField = "name",
    allowScan = false
}) {
    const [showScanner, setShowScanner] = useState(false);
    const [scanError, setScanError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Determine item display label helper
    const getItemLabel = (item) => {
        if (!item) return "";
        if (displayField === "name" && (item.number !== undefined || item.members !== undefined || item.troop !== undefined)) {
            return formatPatrolLabel(item);
        }
        return item[displayField] || "";
    };

    // Synchronize search term with selected item label when not focused/open
    useEffect(() => {
        if (selected && !isOpen) {
            setSearchTerm(getItemLabel(selected));
        }
    }, [selected, isOpen]);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                if (selected) {
                    setSearchTerm(getItemLabel(selected));
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [selected]);

    // Filter items based on query
    const filteredItems = useMemo(() => {
        if (!searchTerm.trim() || (selected && searchTerm === getItemLabel(selected))) {
            return items;
        }
        const term = searchTerm.toLowerCase().trim();
        return items.filter((item) => {
            const labelStr = getItemLabel(item).toLowerCase();
            const nameStr = (item.name || "").toLowerCase();
            const numStr = item.number !== null && item.number !== undefined ? String(item.number) : "";
            const troopStr = (item.troop || item.members?.[0]?.troop || "").toLowerCase();

            return (
                labelStr.includes(term) ||
                nameStr.includes(term) ||
                numStr.includes(term) ||
                troopStr.includes(term)
            );
        });
    }, [items, searchTerm, selected, displayField]);

    function handleScan(scannedData) {
        setScanError(null);
        const scannedId = scannedData?.id?.trim();

        if (!scannedId) {
            setScanError("The scanned QR code does not contain a patrol ID.");
            return;
        }

        const selectedItem = items.find(
            item => String(item.id) === String(scannedId)
        );

        if (!selectedItem) {
            setScanError("The scanned patrol could not be found in this event.");
            return;
        }

        onSelect(selectedItem);
        setSearchTerm(getItemLabel(selectedItem));
        setShowScanner(false);
    }

    function openScanner() {
        setScanError(null);
        setShowScanner(true);
    }

    function closeScanner() {
        setScanError(null);
        setShowScanner(false);
    }

    function handleOptionSelect(item) {
        onSelect(item);
        setSearchTerm(getItemLabel(item));
        setIsOpen(false);
    }

    function handleClear() {
        onSelect(null);
        setSearchTerm("");
        setIsOpen(true);
    }

    const renderCombobox = () => (
        <div className="manual-selection" ref={containerRef}>
            <label htmlFor={`combobox-input-${label}`}>{label}</label>

            <div className="combobox-wrapper">
                <input
                    id={`combobox-input-${label}`}
                    type="text"
                    className="combobox-input"
                    placeholder={`Type to search ${label} by name, troop, or #...`}
                    value={searchTerm}
                    onFocus={() => setIsOpen(true)}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                />

                <div className="combobox-actions">
                    {searchTerm && (
                        <button
                            type="button"
                            className="combobox-clear-btn"
                            onClick={handleClear}
                            title="Clear selection"
                        >
                            ✕
                        </button>
                    )}
                    <button
                        type="button"
                        className="combobox-toggle-btn"
                        onClick={() => setIsOpen(!isOpen)}
                        title="Toggle options dropdown"
                    >
                        ▼
                    </button>
                </div>

                {isOpen && (
                    <ul className="combobox-dropdown" role="listbox">
                        {filteredItems.length === 0 ? (
                            <li className="combobox-no-options">
                                No matching {label.toLowerCase()} found
                            </li>
                        ) : (
                            filteredItems.map((item) => {
                                const isSelected = selected && String(selected.id) === String(item.id);
                                return (
                                    <li
                                        key={item.id}
                                        className={`combobox-option ${isSelected ? "selected" : ""}`}
                                        onClick={() => handleOptionSelect(item)}
                                        role="option"
                                        aria-selected={isSelected}
                                    >
                                        {getItemLabel(item)}
                                    </li>
                                );
                            })
                        )}
                    </ul>
                )}
            </div>
        </div>
    );

    return (
        <>
            <div className="score-selection-card">
                <div className="data-selector-header">
                    <h2>{title}</h2>
                    {description && <p>{description}</p>}
                </div>

                {allowScan ? (
                    <div className="data-selector-options">
                        <button
                            type="button"
                            className="scan-card"
                            onClick={openScanner}
                        >
                            <span className="scan-icon">📷</span>
                            <span>Scan QR Code</span>
                        </button>

                        <div className="selection-divider">OR</div>

                        {renderCombobox()}
                    </div>
                ) : (
                    renderCombobox()
                )}

                {scanError && (
                    <div className="qr-scanner-error">
                        {scanError}
                    </div>
                )}

                {selected && (
                    <div className="selected-data">
                        <span>✓</span>
                        <div>
                            <small>Selected {label}</small>
                            <div>{getItemLabel(selected)}</div>
                        </div>
                    </div>
                )}
            </div>

            {showScanner && (
                <QRScanner
                    onScan={handleScan}
                    onCancel={closeScanner}
                />
            )}
        </>
    );
}