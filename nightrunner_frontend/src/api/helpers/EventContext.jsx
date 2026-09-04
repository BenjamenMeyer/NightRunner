import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import EventSelector from "./EventSelector.jsx";
import ApiService from "../ApiService.js";

const EventContext = createContext(null);

export function EventProvider({ children }) {

    const [event, setEvent] = useState(null)
    const [eventId, setEventId] = useState(null);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState(null);

    const [showEventSelector, setShowEventSelector] = useState(false);

    const [selectableEvents, setSelectableEvents] = useState([]);


    //
    // Determine the initial event
    //

    useEffect(() => {
        initializeEvent();
    }, []);


    async function initializeEvent() {
        try {
            setLoading(true);
            setError(null);

            const user =
                await ApiService.userData.get();

            if (!user) {
                throw new Error(
                    "Unable to determine the current user."
                );
            }

            const isSystemAdmin = user.isAdmin === true;

            const roles = user.roles ?? {};

            const eventIds = Object.keys(roles);


            //
            // Root administrators may select any event.
            //

            if (isSystemAdmin) {
                await loadSelectableEvents();

                setShowEventSelector(true);

                return;
            }


            //
            // User has no event assignments.
            //

            if (eventIds.length === 0) {
                throw new Error(
                    "No event is currently assigned to your account."
                );
            }

            //
            // User has exactly one event.
            //

            if (eventIds.length === 1) {
                await selectEvent(
                    eventIds[0]
                );

                return;
            }


            //
            // User has multiple events.
            //

            await loadSelectableEvents(
                eventIds
            );

            setShowEventSelector(true);

        }
        catch (error) {
            console.error(
                "Failed to initialize event context:",
                error
            );

            setError(
                error?.message ??
                "Unable to determine the current event."
            );
        }
        finally {
            setLoading(false);
        }
    }

    //
    // Load selectable events
    //

    async function loadSelectableEvents(
        allowedEventIds = null
    ) {

        const response =
            await ApiService.eventData.getEvents();

        const events =
            Array.isArray(response)
                ? response
                : response?.events ?? [];


        /*
         * Root administrators can select any event.
         */
        if (!allowedEventIds) {

            setSelectableEvents(
                events
            );

            return events;

        }


        /*
         * Non-root users may only select events that
         * appear in their roles map.
         */
        const allowedIds =
            new Set(
                allowedEventIds.map(
                    id => String(id)
                )
            );

        const filteredEvents =
            events.filter(
                event =>
                    allowedIds.has(
                        String(event.id)
                    )
            );

        setSelectableEvents(
            filteredEvents
        );

        return filteredEvents;

    }


    //
    // Get the currently selected event
    //

    function getCurrentEvent() {

        /*
         * Event is already selected.
         */
        if (event) {

            return event;

        }


        /*
         * No event is selected.
         *
         * Open the selector so the user can choose one.
         */
        openEventSelector();

        return null;

    }


    //
    // Select an event
    //

    async function selectEvent(
        selectedEvent
    ) {

        /*
         * Accept either an event ID or an event object.
         */
        const selectedEventId =
            typeof selectedEvent === "object"
                ? selectedEvent?.id
                : selectedEvent;


        if (!selectedEventId) {

            return null;

        }


        /*
         * Non-root users can only select events
         * assigned to them.
         */
        if (
            !ApiService.userData.isSystemAdmin() &&
            !ApiService.userData.hasEventAccess(
                selectedEventId
            )
        ) {

            const accessError =
                new Error(
                    "You do not have access to the selected event."
                );

            setError(
                accessError.message
            );

            throw accessError;

        }


        try {

            setLoading(true);
            setError(null);

            const selectedEventData =
                await ApiService.eventData.getEvent(
                    selectedEventId
                );

            setEvent(
                selectedEventData
            );

            setEventId(
                selectedEventData.id
            );

            setShowEventSelector(
                false
            );

            return selectedEventData;

        }
        catch (error) {

            console.error(
                "Failed to select event:",
                error
            );

            setError(
                error?.message ??
                "Unable to load the selected event."
            );

            throw error;

        }
        finally {

            setLoading(false);

        }

    }


    //
    // Open event selector
    //

    async function openEventSelector() {

        const user =
            ApiService.userData.getCached();

        if (!user) {
            return;
        }

        const isSystemAdmin =
            user.isAdmin === true;

        const eventIds =
            Object.keys(
                user.roles ?? {}
            );


        /*
         * A non-root user with zero or one event
         * has nothing to select.
         */
        if (
            !isSystemAdmin &&
            eventIds.length <= 1
        ) {

            return;

        }


        try {

            setError(null);

            if (isSystemAdmin) {

                await loadSelectableEvents();

            }
            else {

                await loadSelectableEvents(
                    eventIds
                );

            }

            setShowEventSelector(
                true
            );

        }
        catch (error) {

            console.error(
                "Failed to load selectable events:",
                error
            );

            setError(
                error?.message ??
                "Unable to load available events."
            );

        }

    }


    //
    // Change event
    //
    // Public alias for opening the selector.
    //

    function changeEvent() {

        return openEventSelector();

    }


    //
    // Close selector
    //

    function closeEventSelector() {

        /*
         * Do not allow the selector to be closed when
         * there is no current event.
         */
        if (!eventId) {

            return;

        }

        setShowEventSelector(
            false
        );

    }


    //
    // Determine whether the user can change events
    //

    const user =
        ApiService.userData.getCached();

    const isSystemAdmin =
        user?.isAdmin === true;

    const eventCount =
        Object.keys(
            user?.roles ?? {}
        ).length;

    const canChangeEvent =
        isSystemAdmin ||
        eventCount > 1;


    //
    // Context value
    //

    const value = {

        /*
         * Current event
         */
        event,
        eventId,

        /*
         * Event state
         */
        loading,
        error,
        isSelected:
            eventId !== null,

        /*
         * Event operations
         */
        getCurrentEvent,
        selectEvent,
        changeEvent,

        /*
         * Selector operations
         */
        openEventSelector,
        closeEventSelector,

        /*
         * Permissions
         */
        canChangeEvent

    };


    return (

        <EventContext.Provider value={value}>

            {children}

            {showEventSelector && (

                <EventSelector
                    events={selectableEvents}
                    selectedEventId={eventId}
                    onSelect={selectEvent}
                    onClose={closeEventSelector}
                />

            )}

        </EventContext.Provider>

    );

}

export function useEventContext() {

    const context =
        useContext(EventContext);

    if (!context) {

        throw new Error(
            "useEventContext must be used inside an EventProvider."
        );

    }

    return context;

}