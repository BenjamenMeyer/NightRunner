// LiveScoringService.js

// Later this will call:
// ApiService.get("/live-scoring")

export async function getLiveScoring() {

    // TODO:
    // ApiService.get("reports/live")

    return {

        stations: [

            {
                id: "fire",
                name: "Fire"
            },
            {
                id: "knots",
                name: "Knots"
            },
            {
                id: "firstaid",
                name: "First Aid"
            },
            {
                id: "map",
                name: "Map"
            },
            {
                id: "shelter",
                name: "Shelter"
            }

        ],

        patrols: [
            { "id": "alpha", "name": "Alpha Patrol", "completed": { "fire": 1, "knots": 2 }, "currentStation": "firstaid" },
            { "id": "bravo", "name": "Bravo Patrol", "completed": { "knots": 1, "fire": 2, "firstaid": 3 }, "currentStation": "map" },
            { "id": "charlie", "name": "Charlie Patrol", "completed": {}, "currentStation": null },
            { "id": "delta", "name": "Delta Patrol", "completed": { "fire": 1 }, "currentStation": "knots" },
            { "id": "echo", "name": "Echo Patrol", "completed": { "firstaid": 2 }, "currentStation": "fire" },
            { "id": "foxtrot", "name": "Foxtrot Patrol", "completed": { "knots": 3 }, "currentStation": "compass" },
            { "id": "golf", "name": "Golf Patrol", "completed": { "fire": 2, "map": 1 }, "currentStation": "knots" },
            { "id": "hotel", "name": "Hotel Patrol", "completed": { "firstaid": 1 }, "currentStation": "fire" },
            { "id": "india", "name": "India Patrol", "completed": { "knots": 2, "firstaid": 1 }, "currentStation": "map" },
            { "id": "juliet", "name": "Juliet Patrol", "completed": { "fire": 3 }, "currentStation": null },
            { "id": "kilo", "name": "Kilo Patrol", "completed": { "map": 2 }, "currentStation": "firstaid" },
            { "id": "lima", "name": "Lima Patrol", "completed": { "knots": 1 }, "currentStation": "fire" },
            { "id": "mike", "name": "Mike Patrol", "completed": { "firstaid": 2, "fire": 1 }, "currentStation": "knots" },
            { "id": "november", "name": "November Patrol", "completed": { "fire": 1 }, "currentStation": "map" },
            { "id": "oscar", "name": "Oscar Patrol", "completed": { "knots": 3, "map": 2 }, "currentStation": "firstaid" },
            { "id": "papa", "name": "Papa Patrol", "completed": { "firstaid": 1 }, "currentStation": null },
            { "id": "quebec", "name": "Quebec Patrol", "completed": { "fire": 2 }, "currentStation": "knots" },
            { "id": "romeo", "name": "Romeo Patrol", "completed": { "map": 1 }, "currentStation": "fire" },
            { "id": "sierra", "name": "Sierra Patrol", "completed": { "knots": 2, "firstaid": 3 }, "currentStation": "map" },
            { "id": "tango", "name": "Tango Patrol", "completed": { "fire": 1, "knots": 1 }, "currentStation": "firstaid" }
        ]


    };

}