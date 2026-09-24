import { useEffect, useRef } from "react";

import "./ConfirmDialog.css";

/**
 * "Are you sure?" dialog for one-tap actions that are easy to hit by mistake
 * on a phone: station check-in / check-out today, and the Command Center's
 * "patrol finished" (#237) next.
 *
 * variant:
 *   "neutral" — routine confirmation (check in, check out)
 *   "warning" — the action is unusual or hard to undo; red edge and icon
 *
 * Self-contained styles on theme variables only, because it is used on the
 * public check-in page, which loads none of the signed-in app's stylesheets.
 */
export default function ConfirmDialog({
    open,
    variant = "neutral",
    title,
    children,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    busy = false,
    onConfirm,
    onCancel
}) {
    const confirmRef = useRef(null);
    const cancelRef = useRef(null);

    // Focus the safe choice on a warning, the expected one otherwise, so a
    // stray Enter never confirms something unusual.
    useEffect(() => {
        if (!open) return;
        const target = variant === "warning" ? cancelRef.current : confirmRef.current;
        target?.focus();
    }, [open, variant]);

    useEffect(() => {
        if (!open) return;
        function onKey(event) {
            if (event.key === "Escape" && !busy) {
                onCancel?.();
            }
        }
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, busy, onCancel]);

    if (!open) {
        return null;
    }

    return (
        <div
            className="confirm-dialog-overlay"
            onClick={(event) => {
                // A tap outside the card cancels, unless a save is in flight.
                if (event.target === event.currentTarget && !busy) {
                    onCancel?.();
                }
            }}
        >
            <div
                className={`confirm-dialog confirm-dialog--${variant}`}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
            >
                <h2 id="confirm-dialog-title" className="confirm-dialog-title">
                    {variant === "warning" && (
                        <span className="confirm-dialog-icon" aria-hidden="true">⚠️</span>
                    )}
                    {title}
                </h2>

                <div className="confirm-dialog-body">
                    {children}
                </div>

                <div className="confirm-dialog-actions">
                    <button
                        ref={cancelRef}
                        type="button"
                        className="confirm-dialog-button confirm-dialog-button--cancel"
                        onClick={onCancel}
                        disabled={busy}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmRef}
                        type="button"
                        className="confirm-dialog-button confirm-dialog-button--confirm"
                        onClick={onConfirm}
                        disabled={busy}
                    >
                        {busy ? "Saving..." : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * How a patrol is named in a confirmation: "Patrol 7 — Eagles". The number
 * is what is written on the patrol's badge, so it leads.
 */
export function patrolLabel(patrol) {
    if (!patrol) return "";
    const name = patrol.name || patrol.programName || "Patrol";
    return patrol.number !== undefined && patrol.number !== null && patrol.number !== ""
        ? `Patrol ${patrol.number} — ${name}`
        : name;
}
