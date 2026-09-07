import { useEffect, useState } from "react";

import "./ConfigurationGroupDialog.css";

export default function ConfigurationGroupDialog({
                                                     group = null,
                                                     onSave,
                                                     onClose
                                                 }) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const editing = group !== null;

    useEffect(() => {
        setName(group?.name ?? "");
        setDescription(group?.description ?? "");
        setError(null);
    }, [group]);

    async function handleSubmit(event) {
        event.preventDefault();

        const trimmedName = name.trim();

        if (!trimmedName) {
            setError("A station type name is required.");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            await onSave({
                name: trimmedName,
                description: description.trim() || null
            });
        }
        catch (error) {
            console.error(
                "Failed to save station type:",
                error
            );

            setError(
                error?.message ??
                "Unable to save the station type."
            );
        }
        finally {
            setLoading(false);
        }
    }

    return (
        <div
            className="configuration-group-dialog-overlay"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    if (!loading) {
                        onClose?.();
                    }
                }
            }}
        >
            <div
                className="configuration-group-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="configuration-group-dialog-title"
            >
                <div className="configuration-group-dialog-header">
                    <div>
                        <h2 id="configuration-group-dialog-title">
                            {editing
                                ? "Edit Station Type"
                                : "Create Station Type"}
                        </h2>

                        <p>
                            {editing
                                ? "Update the name and description for this station type."
                                : "Create a station type to organize your configurations."}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="configuration-group-dialog-close"
                        onClick={onClose}
                        disabled={loading}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                {error && (
                    <div className="configuration-group-dialog-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="configuration-group-dialog-field">
                        <label htmlFor="configuration-group-name">
                            Name
                        </label>

                        <input
                            id="configuration-group-name"
                            type="text"
                            value={name}
                            onChange={(event) =>
                                setName(event.target.value)
                            }
                            placeholder="e.g. Ropework"
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    <div className="configuration-group-dialog-field">
                        <label htmlFor="configuration-group-description">
                            Description
                        </label>

                        <textarea
                            id="configuration-group-description"
                            value={description}
                            onChange={(event) =>
                                setDescription(event.target.value)
                            }
                            placeholder="Describe this station type..."
                            rows={4}
                            disabled={loading}
                        />
                    </div>

                    <div className="configuration-group-dialog-actions">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={
                                loading ||
                                !name.trim()
                            }
                        >
                            {loading
                                ? "Saving..."
                                : editing
                                    ? "Save Changes"
                                    : "Create Station Type"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}