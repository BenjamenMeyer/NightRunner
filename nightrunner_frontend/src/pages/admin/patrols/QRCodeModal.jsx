import {
    useEffect,
    useRef,
    useState
} from "react";

import { createPortal } from "react-dom";
import QRCode from "qrcode";

import "./QRCodeModal.css";

export default function QRCodeModal({
                                        patrol,
                                        onClose
                                    }) {

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
                    JSON.stringify({
                        id: patrol.id
                    });

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

                            <h3>
                                {patrolName}
                            </h3>

                            <p className="qr-code-description">
                                Scan this code to identify
                                this patrol.
                            </p>

                            <code>
                                {patrol.id}
                            </code>

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