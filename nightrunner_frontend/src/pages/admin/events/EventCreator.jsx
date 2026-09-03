import { useState } from "react";
import { useNavigate } from "react-router-dom";

import ApiService from "@/api/ApiService";

import "./EventCreator.css";

export default function EventCreator() {

    const navigate = useNavigate();

    const [saving, setSaving] = useState(false);

    const [error, setError] = useState(null);

    const [form, setForm] = useState({
        name: "",
        date: "",
        description: "",
        roundingPrecision: 1000
    });

    function handleChange(event) {

        const {
            name,
            value
        } = event.target;

        setForm(previous => ({
            ...previous,

            [name]:
                name === "roundingPrecision"
                    ? Number(value)
                    : value
        }));

        setError(null);

    }

    async function handleSubmit(event) {

        event.preventDefault();

        setSaving(true);
        setError(null);

        try {

            const name = form.name.trim();

            const description =
                form.description.trim();

            if (!name) {

                throw new Error(
                    "Event name is required."
                );

            }

            if (!form.date) {

                throw new Error(
                    "Event date is required."
                );

            }

            if (
                !Number.isInteger(
                    form.roundingPrecision
                ) ||
                form.roundingPrecision < 1
            ) {

                throw new Error(
                    "Rounding precision must be a positive whole number."
                );

            }

            const createdEvent = await ApiService.eventData.createEvent({
                name,
                date: form.date,
                description,
                roundingPrecision:
                form.roundingPrecision
            });

            /*
             * The backend creates the event ID.
             *
             * After creation, send the administrator
             * to the event management page.
             */
            navigate(
                `/admin/event/${createdEvent.id}`,
                {
                    replace: true
                }
            );

        }
        catch (error) {

            console.error(
                "Failed to create event:",
                error
            );

            setError(
                error.message ??
                "Failed to create event."
            );

        }
        finally {

            setSaving(false);

        }

    }

    return (

        <div className="event-creator">

            <div className="page-header">

                <div>

                    <h1>Create Event</h1>

                    <p>
                        Create a new event for Night Runner.
                    </p>

                </div>

            </div>

            {error && (

                <div className="error-banner">

                    {error}

                </div>

            )}

            <form
                className="event-form"
                onSubmit={handleSubmit}
            >

                <section className="admin-section">

                    <div className="section-header">

                        <div>

                            <h2>Event Details</h2>

                            <p>
                                Enter the basic information
                                for the event.
                            </p>

                        </div>

                    </div>

                    <div className="form-grid">

                        <div className="form-group">

                            <label htmlFor="event-name">
                                Event Name
                            </label>

                            <input
                                id="event-name"
                                name="name"
                                type="text"
                                value={form.name}
                                onChange={handleChange}
                                disabled={saving}
                                placeholder="Night Runner 2026"
                                required
                            />

                        </div>


                        <div className="form-group">

                            <label htmlFor="event-date">
                                Event Date
                            </label>

                            <input
                                id="event-date"
                                name="date"
                                type="date"
                                value={form.date}
                                onChange={handleChange}
                                disabled={saving}
                                required
                            />

                        </div>


                        <div className="form-group form-group-full">

                            <label htmlFor="event-description">
                                Description
                            </label>

                            <textarea
                                id="event-description"
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                disabled={saving}
                                rows={5}
                                placeholder="Information about this event..."
                            />

                        </div>


                        <div className="form-group">

                            <label htmlFor="rounding-precision">
                                Rounding Precision
                            </label>

                            <input
                                id="rounding-precision"
                                name="roundingPrecision"
                                type="number"
                                min="1"
                                step="1"
                                value={form.roundingPrecision}
                                onChange={handleChange}
                                disabled={saving}
                                required
                            />

                            <small>
                                Used when calculating scoring
                                precision.
                            </small>

                        </div>

                    </div>

                </section>


                <section className="admin-section">

                    <div className="section-header">

                        <div>

                            <h2>Event Setup</h2>

                            <p>
                                Stations and patrols can be
                                configured after the event is created.
                            </p>

                        </div>

                    </div>

                    <div className="event-creator-notice">

                        <strong>
                            Stations are not created here.
                        </strong>

                        <p>
                            After creating the event, you can
                            configure its stations and patrols
                            from the event management area.
                        </p>

                    </div>

                </section>


                <div className="form-actions">

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                            navigate("/admin")
                        }
                        disabled={saving}
                    >

                        Cancel

                    </button>

                    <button
                        type="submit"
                        className="primary-button"
                        disabled={saving}
                    >

                        {saving
                            ? "Creating..."
                            : "Create Event"
                        }

                    </button>

                </div>

            </form>

        </div>

    );

}