import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import "./Scoring.css";

export default function QRScanner({ onScan, onCancel }) {

    const scannerRef = useRef(null);
    const [error, setError] = useState(null);

    useEffect(() => {

        const scanner = new Html5Qrcode("qr-reader");

        scannerRef.current = scanner;

        let mounted = true;
        let started = false;

        async function startScanner() {

            try {

                setError(null);

                await scanner.start(
                    {
                        facingMode: "environment"
                    },
                    {
                        fps: 10,
                        qrbox: {
                            width: 250,
                            height: 250
                        }
                    },
                    (decodedText) => {

                        if (!mounted) {
                            return;
                        }

                        try {

                            const patrolId = JSON.parse(decodedText);

                            if (!patrolId) {
                                throw new Error("Empty QR code");
                            }

                            // The QR code contains the patrol UUID.
                            onScan?.({
                                id: patrolId
                            });

                        } catch (error) {

                            console.error(
                                "Invalid patrol QR code:",
                                error
                            );

                            setError(
                                "This is not a valid patrol QR code."
                            );

                        }

                    },
                    () => {
                        // Ignore normal QR decode failures.
                    }
                );

                started = true;

            } catch (error) {

                console.error(
                    "Failed to start QR scanner:",
                    error
                );

                if (!mounted) {
                    return;
                }

                if (error?.name === "NotFoundError") {

                    setError(
                        "No camera was found on this device."
                    );

                } else if (error?.name === "NotAllowedError") {

                    setError(
                        "Camera permission was denied. Please allow camera access and try again."
                    );

                } else {

                    setError(
                        "Unable to start the QR scanner."
                    );

                }

            }

        }

        startScanner();

        return () => {

            mounted = false;

            // Only attempt to stop the scanner if it
            // actually started successfully.
            if (!started) {
                return;
            }

            scanner.stop()
                .catch(error => {

                    // The scanner may already have stopped.
                    // Do not let cleanup throw into React.
                    console.debug(
                        "QR scanner cleanup:",
                        error
                    );

                });

        };

    }, [onScan]);

    function handleCancel() {

        onCancel?.();

    }

    return (

        <div className="modal-backdrop">

            <div className="modal qr-modal">

                <h2>
                    Scan Patrol QR Code
                </h2>

                <p>
                    Scan the QR code assigned to the patrol.
                </p>

                <div
                    id="qr-reader"
                    className="qr-reader"
                />

                {error && (

                    <div className="qr-error">

                        {error}

                    </div>

                )}

                <div className="modal-buttons">

                    <button
                        className="secondary-button"
                        onClick={handleCancel}
                    >
                        Cancel
                    </button>

                </div>

            </div>

        </div>

    );

}
