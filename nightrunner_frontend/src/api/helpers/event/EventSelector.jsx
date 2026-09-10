import {
    useEffect,
    useState
} from "react";

import "./EventSelector.css";

export default function EventSelector({
    events = [],
    selectedEventId = null,
    onSelect,
    onClear,
    onClose
}) {
    const [selectedEvent, setSelectedEvent] =
        useState(
            selectedEventId
                ? String(selectedEventId)
                : ""
        );

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState(null);

    useEffect(() => {
        setSelectedEvent(
            selectedEventId
                ? String(selectedEventId)
                : ""
        );
    }, [selectedEventId]);

    async function handleSubmit(event) {
        event.preventDefault();

        if (!selectedEvent) {
            return;
        }

        const selected =
            events.find(
                event =>
                    String(event.id) ===
                    String(selectedEvent)
            );

        if (!selected) {
            setError(
                "The selected event could not be found."
            );

            return;
        }

        try {
            setLoading(true);
            setError(null);

            await onSelect(selected.id);
        }
        catch (error) {
            console.error(
                "Failed to select event:",
                error
            );

            setError(
                error?.message ??
                "Unable to select the event."
            );
        }
        finally {
            setLoading(false);
        }
    }

    async function handleClear() {
        if (!onClear || loading) {
            return;
        }

        try {
            setLoading(true);
            setError(null);

            await onClear();

            setSelectedEvent("");
        }
        catch (error) {
            console.error(
                "Failed to clear event:",
                error
            );

            setError(
                error?.message ??
                "Unable to clear the event."
            );
        }
        finally {
            setLoading(false);
        }
    }

    return (
        <div
            className="event-selector-overlay"
            onMouseDown={event => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    onClose?.();
                }
            }}
        >
            <div
                className="event-selector"
                role="dialog"
                aria-modal="true"
                aria-labelledby="event-selector-title"
            >
                <div className="event-selector-header">
                    <div>
                        <h2 id="event-selector-title">
                            Select an Event
                        </h2>

                        <p>
                            Select the event you want to work with.
                        </p>
                    </div>

                    {onClose && (
                        <button
                            type="button"
                            className="event-selector-close"
                            onClick={onClose}
                            aria-label="Close event selector"
                            disabled={loading}
                        >
                            <span aria-hidden="true">
                                ×
                            </span>
                        </button>
                    )}
                </div>

                {error && (
                    <div className="event-selector-error">
                        {error}
                    </div>
                )}

                {!error && events.length === 0 && (
                    <div className="event-selector-error">
                        No events are available.
                    </div>
                )}

                {events.length > 0 && (
                    <form onSubmit={handleSubmit}>
                        <div className="event-selector-field">
                            <label htmlFor="event-selector">
                                Event
                            </label>

                            <select
                                id="event-selector"
                                value={selectedEvent}
                                onChange={event =>
                                    setSelectedEvent(
                                        event.target.value
                                    )
                                }
                                disabled={loading}
                            >
                                <option value="">
                                    Select an event...
                                </option>

                                {events.map(event => (
                                    <option
                                        key={event.id}
                                        value={event.id}
                                    >
                                        {event.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="event-selector-actions">
                            {onClear && selectedEventId && (
                                <button
                                    type="button"
                                    className="event-selector-clear"
                                    onClick={handleClear}
                                    disabled={loading}
                                >
                                    Clear Event
                                </button>
                            )}

                            <button
                                type="submit"
                                className="event-selector-submit"
                                disabled={
                                    !selectedEvent ||
                                    loading
                                }
                            >
                                {loading
                                    ? "Loading..."
                                    : "Continue"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
