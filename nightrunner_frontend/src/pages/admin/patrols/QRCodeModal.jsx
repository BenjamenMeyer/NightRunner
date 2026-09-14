import {
    useEffect,
    useRef,
    useState
} from "react";

import { createPortal } from "react-dom";
import QRCode from "qrcode";

import { useEventContext } from "@/api/helpers/event/EventContext.jsx";
import { buildPatrolQRPayload } from "@/api/helpers/qr/qrUtils.js";

import "./QRCodeModal.css";

export default function QRCodeModal({
                                        patrol,
                                        onClose
                                    }) {

    const { event } = useEventContext();

    const canvasRef =
        useRef(null);

    const [error, setError] =
        useState(null);

    const patrolName =
        patrol?.name?.trim() ||
        "Unnamed Patrol";

    useEffect(() => {

        if (!patrol?.id) {
            return;
        }

        async function generateQRCode() {

            try {

                setError(null);

                const payload =
                    buildPatrolQRPayload(
                        patrol.id,
                        event?.name
                    );

                if (!canvasRef.current) {
                    return;
                }

                await QRCode.toCanvas(
                    canvasRef.current,
                    payload,
                    {
                        errorCorrectionLevel: "H",
                        width: 1200,
                        margin: 4,
                        color: {
                            dark: "#000000",
                            light: "#FFFFFF"
                        }
                    }
                );

            } catch (error) {

                console.error(
                    "Failed to generate patrol QR code:",
                    error
                );

                setError(
                    "Failed to generate QR code."
                );

            }

        }

        generateQRCode();

    }, [patrol]);

    function handlePrint() {
        window.print();
    }

    if (!patrol) {
        return null;
    }

    return createPortal(

        <div
            className="qr-code-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-code-title"
        >

            <div className="qr-code-modal">

                <div className="qr-code-header">

                    <div>
                        <span className="page-eyebrow">
                            Patrol
                        </span>

                        <h2 id="qr-code-title">
                            {patrolName}
                        </h2>

                        <p>
                            Patrol QR Code
                        </p>
                    </div>

                    <button
                        type="button"
                        className="qr-close-button no-print"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>

                </div>

                {error ? (

                    <div className="qr-code-error">
                        {error}
                    </div>

                ) : (

                    <div className="qr-code-content">

                        <div className="qr-code-container">

                            <canvas
                                ref={canvasRef}
                                className="qr-code-canvas"
                            />

                            <div className="qr-code-logo-wrapper">

                                <img
                                    src="/no-background.png"
                                    alt=""
                                    className="qr-code-logo"
                                />

                            </div>

                        </div>

                        <div className="qr-code-information">

                            <div className="qr-print-event-header">
                                {(event?.name ?? "Event Patrol Badges").toUpperCase()}
                            </div>

                            <h2>
                                {patrolName}
                            </h2>

                            <div className="qr-print-patrol-number">
                                Patrol #{patrol?.number ?? "____"}
                            </div>

                            <p className="qr-code-description no-print">
                                Scan this code to identify this patrol.
                            </p>

                            <code className="no-print">
                                {patrol.id}
                            </code>

                        </div>

                        <div className="qr-members-table-wrapper">

                            <table className="qr-members-table">

                                <thead>

                                    <tr>
                                        <th>Member Name</th>
                                        <th>Rank</th>
                                        <th>Troop / Identifier</th>
                                    </tr>

                                </thead>

                                <tbody>

                                    {patrol?.members && patrol.members.length > 0 ? (

                                        patrol.members.map((m, idx) => (

                                            <tr key={m.id || idx}>
                                                <td>{m.name || "—"}</td>
                                                <td>{m.rank || "—"}</td>
                                                <td>{m.troop || "—"}</td>
                                            </tr>

                                        ))

                                    ) : (

                                        [1, 2, 3, 4, 5, 6, 7, 8].map(num => (

                                            <tr key={num}>
                                                <td>Member #{num}: __________________</td>
                                                <td>___________</td>
                                                <td>___________</td>
                                            </tr>

                                        ))

                                    )}

                                </tbody>

                            </table>

                        </div>

                    </div>

                )}

                <div className="qr-code-actions no-print">

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={onClose}
                    >
                        Close
                    </button>

                    <button
                        type="button"
                        className="primary-button"
                        onClick={handlePrint}
                        disabled={!!error}
                    >
                        Print QR Code
                    </button>

                </div>

            </div>

        </div>,

        document.body

    );
}