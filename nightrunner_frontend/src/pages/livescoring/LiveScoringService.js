import ApiService from "@/api/ApiService.js";

export async function getLiveScoring() {
    // Await both promises simultaneously for efficient parallel fetching
    const [stations, patrols] = await Promise.all([
        ApiService.stationData.getStations(),
        ApiService.patrolData.getPatrols()
    ]);

    return {
        stations: stations,
        patrols: patrols
    };
}