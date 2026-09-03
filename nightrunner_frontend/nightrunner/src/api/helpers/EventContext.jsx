import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import ApiService from "@/api/ApiService";
import EventSelector from "./EventSelector";

const EventContext = createContext(null);

export function EventProvider({ children }) {

    const [event, setEvent] = useState(null);
    const [eventId, setEventId] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showEventSelector, setShowEventSelector] = useState(false);

    useEffect(() => {

        loadEvent();

    }, []);

    async function loadEvent() {

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

            /*
             * Normal users and event administrators use
             * their assigned event.
             */
            if (user.event) {

                await selectEvent(user.event);

                return;

            }

            /*
             * System administrators may choose an event.
             */
            if (ApiService.userData.isSystemAdmin()) {

                setShowEventSelector(true);

                return;

            }

            throw new Error(
                "No event is currently assigned to your account."
            );

        } catch (error) {

            console.error(
                "Failed to load event context:",
                error
            );

            setError(
                error?.message ??
                "Unable to determine the current event."
            );

        } finally {

            setLoading(false);

        }

    }

    async function selectEvent(selectedEvent) {

        const selectedEventId =
            typeof selectedEvent === "object"
                ? selectedEvent?.id
                : selectedEvent;

        if (!selectedEventId) {
            setEvent(null);
            setEventId(null);
            return;
        }

        try {

            setLoading(true);
            setError(null);

            const selectedEventData =
                await ApiService.eventData.getEvent(
                    selectedEventId
                );

            setEvent(selectedEventData);
            setEventId(selectedEventData.id);

            setShowEventSelector(false);

            return selectedEventData;

        } catch (error) {

            console.error(
                "Failed to select event:",
                error
            );

            setError(
                error?.message ??
                "Unable to load the selected event."
            );

            throw error;

        } finally {

            setLoading(false);

        }

    }

    function changeEvent() {

        if (!ApiService.userData.isSystemAdmin()) {
            return;
        }

        setShowEventSelector(true);

    }

    const value = {
        event,
        eventId,

        loading,
        error,

        selectEvent,
        changeEvent,

        isSelected: eventId !== null
    };

    return (

        <EventContext.Provider value={value}>

            {children}

            {showEventSelector && (

                <EventSelector
                    onSelect={selectEvent}
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