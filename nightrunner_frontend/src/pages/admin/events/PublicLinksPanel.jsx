import {
    useCallback,
    useEffect,
    useRef,
    useState
} from "react";

import QRCode from "qrcode";

import ApiService from "@/api/ApiService.js";

import "./PublicLinksPanel.css";

/**
 * Manage the per-event public links.
 *
 * Two kinds, and the difference matters enough to state on screen: a progress
 * link only reads and is safe to hand out, while a check-in link writes visit
 * records and is a working credential.
 *
 * The plaintext token exists in exactly one response, when it is minted. This
 * panel shows it once, prominently, with a QR code — a printed QR taped up at a
 * station is how these actually get distributed.
 */

const SCOPES = {
    progress: {
        label: "Progress link",
        blurb: "Read-only patrol progress. Safe to share with parents and troop leaders.",
        path: "progress",
        tone: "safe"
    },
    checkin: {
        label: "Station check-in link",
        blurb: "Lets whoever holds it check patrols in and out. Treat it like a password.",
        path: "checkin",
        tone: "sensitive"
    }
};


function linkUrl(scope, token) {
    return `${window.location.origin}/${SCOPES[scope].path}/${token}`;
}


function formatDate(value) {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
}


function MintedLink({ scope, token, onDismiss }) {

    const canvasRef = useRef(null);
    const [copied, setCopied] = useState(false);
    const url = linkUrl(scope, token);

    useEffect(() => {

        if (!canvasRef.current) return;

        QRCode.toCanvas(
            canvasRef.current,
            url,
            { errorCorrectionLevel: "H", width: 320, margin: 2 }
        ).catch(() => {
            // A missing QR is not worth failing the panel over; the URL is
            // still on screen and copyable.
        });

    }, [url]);

    async function copy() {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    }

    return (
        <div className="public-links-minted">

            <h4>Your new {SCOPES[scope].label.toLowerCase()}</h4>

            <p className="public-links-warning">
                Copy this now. It is shown once and cannot be retrieved again —
                if it is lost, revoke it and create another.
            </p>

            <div className="public-links-url-row">
                <input
                    type="text"
                    readOnly
                    value={url}
                    onFocus={(e) => e.target.select()}
                    className="public-links-url"
                />
                <button type="button" className="primary-button" onClick={copy}>
                    {copied ? "Copied" : "Copy"}
                </button>
            </div>

            <canvas ref={canvasRef} className="public-links-qr" />

            <button type="button" className="public-links-dismiss" onClick={onDismiss}>
                Done
            </button>

        </div>
    );

}


export default function PublicLinksPanel({ eventId }) {

    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [minted, setMinted] = useState(null);
    const [label, setLabel] = useState("");
    const [scope, setScope] = useState("progress");
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {

        if (!eventId) return;

        setLoading(true);

        try {
            const response = await ApiService.eventData.getAccessTokens(eventId);
            setTokens(response?.tokens ?? []);
            setError(null);
        } catch (err) {
            setError(err?.message ?? "Could not load the public links.");
        } finally {
            setLoading(false);
        }

    }, [eventId]);


    useEffect(() => {
        load();
    }, [load]);


    async function mint() {

        setBusy(true);

        try {

            const created = await ApiService.eventData.createAccessToken(
                eventId,
                { scope, label: label.trim() || null }
            );

            setMinted({ scope, token: created.token });
            setLabel("");
            setError(null);
            await load();

        } catch (err) {
            setError(err?.message ?? "Could not create the link.");
        } finally {
            setBusy(false);
        }

    }


    async function revoke(tokenId) {

        setBusy(true);

        try {
            await ApiService.eventData.revokeAccessToken(eventId, tokenId);
            await load();
            setError(null);
        } catch (err) {
            setError(err?.message ?? "Could not revoke the link.");
        } finally {
            setBusy(false);
        }

    }


    if (!eventId) {
        return null;
    }

    return (
        <section className="public-links-panel">

            <h3>Public links</h3>
            <p className="public-links-intro">
                Links that work without an account. Each one is tied to this event,
                expires on its own, and can be revoked at any time.
            </p>

            {error && <div className="error-banner">{error}</div>}

            {minted && (
                <MintedLink
                    scope={minted.scope}
                    token={minted.token}
                    onDismiss={() => setMinted(null)}
                />
            )}

            <div className="public-links-create">

                <div className="public-links-scope-choice">
                    {Object.entries(SCOPES).map(([key, config]) => (
                        <label
                            key={key}
                            className={`public-links-scope ${scope === key ? "selected" : ""} ${config.tone}`}
                        >
                            <input
                                type="radio"
                                name="public-link-scope"
                                value={key}
                                checked={scope === key}
                                onChange={() => setScope(key)}
                            />
                            <span className="public-links-scope-label">{config.label}</span>
                            <span className="public-links-scope-blurb">{config.blurb}</span>
                        </label>
                    ))}
                </div>

                <div className="public-links-create-row">
                    <input
                        type="text"
                        placeholder="Label (optional) — e.g. Printed QR, station 4"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        className="public-links-label-input"
                    />
                    <button
                        type="button"
                        className="primary-button"
                        onClick={mint}
                        disabled={busy}
                    >
                        {busy ? "Working..." : "Create link"}
                    </button>
                </div>

            </div>

            {loading ? (
                <p>Loading links...</p>
            ) : tokens.length === 0 ? (
                <p className="public-links-empty">No public links yet.</p>
            ) : (
                <table className="public-links-table">
                    <thead>
                        <tr>
                            <th>Kind</th>
                            <th>Label</th>
                            <th>Expires</th>
                            <th>Last used</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {tokens.map((t) => (
                            <tr key={t.id} className={t.isValid ? "" : "public-links-dead"}>
                                <td>{SCOPES[t.scope]?.label ?? t.scope}</td>
                                <td>{t.label || "—"}</td>
                                <td>{formatDate(t.expiresAt)}</td>
                                <td>{t.lastUsedAt ? formatDate(t.lastUsedAt) : "Never"}</td>
                                <td>
                                    {t.revokedAt
                                        ? "Revoked"
                                        : t.isValid
                                            ? "Active"
                                            : "Expired"}
                                </td>
                                <td>
                                    {!t.revokedAt && (
                                        <button
                                            type="button"
                                            className="public-links-revoke"
                                            onClick={() => revoke(t.id)}
                                            disabled={busy}
                                        >
                                            Revoke
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

        </section>
    );

}
