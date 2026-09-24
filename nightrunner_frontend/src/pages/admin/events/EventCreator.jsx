import { useState } from "react";
import { useNavigate } from "react-router-dom";

import ApiService from "../../../api/ApiService.js";

import "./EventCreator.css";
import brandings from "@/branding/index.js";

export default function EventCreator() {

    const navigate = useNavigate();

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const [form, setForm] = useState({
        name: "",
        date: "",
        description: "",
        roundingPrecision: 1000,
        theme: "night-ops",
        scoringMode: "absolute"
    });


    //
    // Form changes
    //

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


    //
    // Create event
    //

    async function handleSubmit(event) {

        event.preventDefault();

        setSaving(true);
        setError(null);

        try {

            const name =
                form.name.trim();

            const description =
                form.description.trim();


            //
            // Validate name
            //

            if (!name) {

                throw new Error(
                    "Event name is required."
                );

            }


            //
            // Validate date
            //

            if (!form.date) {

                throw new Error(
                    "Event date is required."
                );

            }


            //
            // Validate rounding precision
            //

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


            //
            // Create event
            //

            await ApiService.eventData.createEvent({

                name,

                date:
                form.date,

                description,

                roundingPrecision:
                form.roundingPrecision,

                theme:
                form.theme,

                scoringMode:
                form.scoringMode

            });


            //
            // Return to the event manager.
            //
            // Event selection is handled by EventContext,
            // so we do not navigate to an event-specific URL.
            //

            navigate(
                "/admin/events",
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
                error?.message ??
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

                            <label htmlFor="event-theme">
                                Branding Theme
                            </label>

                            <select
                                id="event-theme"
                                name="theme"
                                value={form.theme}
                                onChange={handleChange}
                                disabled={saving}
                            >

                                {Object.entries(brandings).map(
                                    ([id, theme]) => (

                                        <option
                                            key={id}
                                            value={id}
                                        >
                                            {theme.organizationName}
                                        </option>

                                    )
                                )}

                            </select>

                            <small>
                                Visual color theme applied to
                                the user interface for this event.
                            </small>

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
                                Used when calculating scoring.
                            </small>

                        </div>

                        <div className="form-group">

                            <label htmlFor="event-scoring-mode">
                                Default Scoring Mode
                            </label>

                            <select
                                id="event-scoring-mode"
                                name="scoringMode"
                                value={form.scoringMode}
                                onChange={handleChange}
                                disabled={saving}
                            >
                                <option value="absolute">
                                    Absolute Score (Weighted Sum)
                                </option>
                                <option value="relative">
                                    Relative to Max Patrol (10pt Scale)
                                </option>
                            </select>

                            <small>
                                Initial scoring calculation mode for finalizer reports.
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
                            navigate("admin/events")
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