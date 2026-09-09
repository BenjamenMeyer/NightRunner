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
        scoresReport
    ] = await Promise.all([
        ApiService.stationData.getStations(eventId),
        ApiService.patrolData.getPatrols(eventId),
        ApiService.reportData.getEventReport(eventId).catch(() => ({ patrols: [] }))
    ]);

    return {
        stations: stations ?? [],
        patrols: patrols ?? [],
        scoresReport: scoresReport ?? { patrols: [] }
    };
}