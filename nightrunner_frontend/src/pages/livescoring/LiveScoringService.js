import ApiService from "@/api/ApiService.js";

export async function getLiveScoring(eventId) {
    if (!eventId) {
        throw new Error(
            "An event ID is required."
        );
    }

    const [
        stations,
        patrols
    ] = await Promise.all([
        ApiService.stationData.getStations(eventId),
        ApiService.patrolData.getPatrols(eventId)
    ]);

    return {
        stations: stations ?? [],
        patrols: patrols ?? []
    };
}