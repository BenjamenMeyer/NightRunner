import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import { useAuth } from "react-oidc-context";

import EventSelector from "./EventSelector.jsx";
import ApiService from "../ApiService.js";

const EventContext = createContext(null);

export function EventProvider({ children }) {

    const auth = useAuth();

    const [event, setEvent] = useState(null);
    const [eventId, setEventId] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showEventSelector, setShowEventSelector] = useState(false);
    const [selectableEvents, setSelectableEvents] = useState([]);


    //
    // Initialize event context when authentication changes.
    //

    useEffect(() => {

        if (auth.isLoading) {
            return;
        }

        /*
         * Logged out:
         *
         * EventContext has nothing to do.
         */
        if (!auth.isAuthenticated) {

            setEvent(null);
            setEventId(null);
            setSelectableEvents([]);
            setShowEventSelector(false);
            setError(null);
            setLoading(false);

            return;
        }

        initializeEvent();

    }, [
        auth.isLoading,
        auth.isAuthenticated
    ]);


    //
    // Determine initial event state.
    //

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

            const isSystemAdmin = ApiService.userData.isSystemAdmin();

            const roles =
                user.roles ?? {};

            const eventIds =
                Object.keys(roles);


            //
            // SYSTEM ADMIN
            //
            // System admins do NOT need an event assignment.
            //
            // They are allowed to select any event.
            //

            if (isSystemAdmin) {

                const events =
                    await loadSelectableEvents();

                /*
                 * There is no error if there are no events.
                 *
                 * The administrator simply has no event
                 * selected yet.
                 */
                setEvent(null);
                setEventId(null);

                /*
                 * If events exist, let the administrator
                 * choose one.
                 */
                setShowEventSelector(
                    events.length > 0
                );

                return;
            }


            //
            // NORMAL USER
            //
            // Normal users must have at least one
            // event assignment.
            //

            if (eventIds.length === 0) {

                throw new Error(
                    "No event is currently assigned to your account."
                );

            }


            //
            // Exactly one event.
            //
            // Select it automatically.
            //

            if (eventIds.length === 1) {

                await selectEvent(
                    eventIds[0]
                );

                return;
            }


            //
            // Multiple events.
            //
            // Let the user choose.
            //

            const events =
                await loadSelectableEvents(
                    eventIds
                );

            setShowEventSelector(
                events.length > 0
            );

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
    // Load selectable events.
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


        //
        // System admins can see every event.
        //

        if (!allowedEventIds) {

            setSelectableEvents(
                events
            );

            return events;

        }


        //
        // Normal users can only see assigned events.
        //

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
    // Get the currently selected event.
    //

    function getCurrentEvent() {

        if (event) {
            return event;
        }

        /*
         * This is particularly useful for system admins:
         * they may be logged in without having selected
         * an event yet.
         */
        openEventSelector();

        return null;

    }


    //
    // Select an event.
    //

    async function selectEvent(
        selectedEvent
    ) {

        const selectedEventId =
            typeof selectedEvent === "object"
                ? selectedEvent?.id
                : selectedEvent;


        if (!selectedEventId) {
            return null;
        }


        //
        // Verify access.
        //
        // System admins automatically have access to
        // every event.
        //
        const isSystemAdmin = ApiService.userData.isSystemAdmin();

        if (
            !isSystemAdmin &&
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
    // Open event selector.
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


        //
        // Normal users with zero or one event
        // cannot change events.
        //
        // System admins are exempt because they can
        // select any event, even with zero assignments.
        //

        if (
            !isSystemAdmin &&
            eventIds.length <= 1
        ) {

            return;

        }


        try {

            setError(null);

            let events;

            if (isSystemAdmin) {
                events =
                    await loadSelectableEvents();

            }
            else {
                events =
                    await loadSelectableEvents(
                        eventIds
                    );

            }

            /*
             * Do not show an empty selector.
             */
            if (events.length === 0) {

                setShowEventSelector(false);

                return;

            }

            setShowEventSelector(true);

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
    // Change event.
    //

    function changeEvent() {
        return openEventSelector();
    }


    //
    // Close selector.
    //

    function closeEventSelector() {

        /*
         * A system admin is allowed to have no selected
         * event, so they can close the selector even
         * when eventId is null.
         */
        setShowEventSelector(false);

    }


    //
    // Current user permissions.
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
    // Context value.
    //

    const value = {

        //
        // Current event
        //

        event,
        eventId,

        //
        // State
        //

        loading,
        error,

        isSelected:
            eventId !== null,

        //
        // Operations
        //

        getCurrentEvent,
        selectEvent,
        changeEvent,

        //
        // Selector
        //

        openEventSelector,
        closeEventSelector,

        //
        // Permissions
        //

        canChangeEvent,

        //
        // Useful to consumers
        //

        isSystemAdmin

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