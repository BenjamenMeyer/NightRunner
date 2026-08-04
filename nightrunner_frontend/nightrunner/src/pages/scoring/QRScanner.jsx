import "./Scoring.css";

export default function QRScanner({

                                      onScan,

                                      onCancel

                                  }) {

    function simulateScan() {

        // Placeholder until QR scanning is implemented.
        // Eventually this will launch the camera and decode
        // a patrol QR code.

        if (onScan) {

            onScan({
                id: "",
                programName: ""
            });

        }

    }

    return (

        <div className="modal-backdrop">

            <div className="modal qr-modal">

                <h2>

                    Scan Patrol QR Code

                </h2>

                <p>

                    QR scanning has not yet been implemented.

                    <br/>

                    For now this dialog only demonstrates the
                    future workflow.

                </p>

                <div className="qr-placeholder">

                    📷

                </div>

                <div className="modal-buttons">

                    <button
                        className="secondary-button"
                        onClick={onCancel}
                    >

                        Cancel

                    </button>

                    <button
                        className="primary-button"
                        onClick={simulateScan}
                    >

                        Simulate Scan

                    </button>

                </div>

            </div>

        </div>

    );

}