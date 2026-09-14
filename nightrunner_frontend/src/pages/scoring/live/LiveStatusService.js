import ApiService from "@/api/ApiService.js";

export async function getLiveScoring(eventId) {
    if (!eventId) {
        throw new Error(
            "An event ID is required."
        );
    }

    const [
        stations,
        patrols,
        visitsResponse
    ] = await Promise.all([
        ApiService.stationData.getStations(eventId),
        ApiService.patrolData.getPatrols(eventId),
        ApiService.checkInData.getVisits(eventId).catch(() => ({ visits: [] }))
    ]);

    return {
        stations: stations ?? [],
        patrols: patrols ?? [],
        visits: visitsResponse?.visits ?? []
    };
}