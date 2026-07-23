# Night Runner API Protocol

This document outlines the proposed JSON-based RESTful API protocol for the Night Runner application, designed for interaction between a ReactJS frontend and a backend service.

### General Principles

*   **RESTful:** The API follows REST principles, using standard HTTP methods (`GET`, `POST`, `PUT`, `DELETE`) and resource-based URLs.
*   **JSON:** All data is exchanged in JSON format. The `Content-Type` header should be `application/json`.
*   **Authentication:** API endpoints should be secured. An API key or token-based authentication (e.g., OAuth 2.0 Bearer Token) passed in the `Authorization` header is recommended.
*   **Versioning:** The API should be versioned to allow for future changes (e.g., `/api/v1/...`).
*   **Error Handling:** Use standard HTTP status codes to indicate success or failure (e.g., `200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`). Error responses should include a descriptive message in the JSON body.

```json
{
  "error": {
    "message": "A descriptive error message."
  }
}
```

---
### Authentication

**URL:** `/api/v1/auth`

#### Endpoints

*   **`POST /auth/login`**: Authenticates a user and returns a session token.

#### `Login` Request Body
```json
{
  "username": "john.doe",
  "password": "a-strong-password"
}
```

#### `Login` Response Body
```json
{
    "token": "a-jwt-token",
    "expiresIn": 3600,
    "user": {
        "id": "uuid-string-user-1",
        "username": "john.doe",
        "displayName": "John Doe",
        "roles": ["station_leader"]
    }
}
```

---

### Resource: Users & Registration

Represents system users and their roles.

**URL:** `/api/v1/users`

#### User Roles
*   **`admin`**: Full administrative access to the entire system.
*   **`organizer`**: Can create and manage events, including assigning stations and registering patrols.
*   **`station_leader`**: Can manage a specific station they are assigned to and enter scores.
*   **`station_member`**: Can assist a station leader with scoring at an assigned station.
*   **`volunteer`**: General access, can view event information.

#### Endpoints

*   **`POST /users` (User Registration)**: Creates a new user.
*   **`GET /users`**: Retrieves a list of all users. (Requires `admin` role).
*   **`GET /users/{userId}`**: Retrieves a specific user.
*   **`PUT /users/{userId}`**: Updates a user's details or roles.
*   **`DELETE /users/{userId}`**: Deletes a user. (Requires `admin` role).

#### JSON Object: `User`
*Note: The password is only used for creation/update and is not exposed in responses.*
```json
{
  "id": "uuid-string-user-1",
  "username": "john.doe",
  "email": "john.doe@example.com",
  "displayName": "John Doe",
  "roles": ["station_leader"]
}
```

#### JSON Object: `UserRegistration` (Request Body for `POST /users`)
```json
{
  "username": "jane.doe",
  "email": "jane.doe@example.com",
  "password": "another-strong-password",
  "displayName": "Jane Doe"
}
```

---

### Permissions & Access Control

Permissions are role-based. A user's role determines their access level to different resources and the actions they can perform.

#### `admin`
*   **Full System Access**: Can perform any action on any endpoint (`GET`, `POST`, `PUT`, `DELETE`). This includes managing users, all events, and system settings.

#### `organizer`
*   **Events**:
    *   `POST /events`: Can create new events.
    *   `GET, PUT, DELETE /events/{eventId}`: Full control over events they are listed as an organizer for.
*   **Stations & Patrols**:
    *   Full `GET, POST, PUT, DELETE` access to stations, configurations, and patrols within their managed events.
*   **Users**:
    *   `GET /users`: Can view users.
    *   `PUT /users/{userId}`: Can approve and assign roles of `station_leader`, `station_member`, and `volunteer` for their events.
*   **Scoring & Reports**:
    *   Full access to scoring (`POST /scores`) and reports (`GET /reports/event/{eventId}`) for their events.

#### `station_leader`
*   **Read Access**: `GET` access to their assigned event, station(s), and patrols.
*   **Station Management**:
    *   `PUT /stations/{stationId}`: Can update their assigned station to add or remove `station_member`s from the `members` array.
*   **Scoring**:
    *   `POST /scores`: Can submit scores for patrols at their assigned station.
*   **Reports**:
    *   `GET /reports/event/{eventId}`: Can view reports for events they are part of.

#### `station_member`
*   **Read Access**: `GET` access to their assigned event, station(s), and patrols.
*   **Scoring**:
    *   `POST /scores`: Can submit scores for patrols at their assigned station.
*   **Reports**:
    *   `GET /reports/event/{eventId}`: Can view reports for events they are part of.

#### `volunteer`
*   **Read-Only Access**: Has `GET` access to all primary resources (`/events`, `/stations`, `/patrols`).
*   **Reports**:
    *   `GET /reports/event/{eventId}`: Can view reports for any event.

---

### Resource: Events

Represents a top-level event that ties together stations, patrols, and scoring.

**URL:** `/api/v1/events`

#### Endpoints

*   **`GET /events`**: Retrieves a list of all events.
*   **`POST /events`**: Creates a new event.
*   **`GET /events/{eventId}`**: Retrieves a specific event.
*   **`PUT /events/{eventId}`**: Updates a specific event, including registering/unregistering patrols and stations.
*   **`DELETE /events/{eventId}`**: Deletes a specific event.

#### Patrol & Station Registration

To register a patrol or a station for an event, you update the `patrols` or `stations` array in the `Event` object and issue a `PUT` request to the `/events/{eventId}` endpoint.

#### JSON Object: `Event`

```json
{
  "id": "uuid-string-event-2026",
  "name": "Night Ops 2026",
  "date": "2026-09-15",
  "description": "The 2026 annual Night Ops event.",
  "roundingPrecision": 1000,
  "organizers": [
    "uuid-string-user-organizer-1"
  ],
  "stations": [
    "uuid-string-station-1",
    "uuid-string-station-2"
  ],
  "patrols": [
    "uuid-string-patrol-1"
  ]
}
```

---

### Resource: Patrols

Represents a patrol participating in the event.

**URL:** `/api/v1/patrols`

#### Endpoints

*   **`GET /patrols`**: Retrieves a list of all patrols.
*   **`POST /patrols`**: Creates a new patrol.
*   **`GET /patrols/{patrolId}`**: Retrieves a specific patrol.
*   **`PUT /patrols/{patrolId}`**: Updates a specific patrol.
*   **`DELETE /patrols/{patrolId}`**: Deletes a specific patrol.

#### JSON Object: `Patrol`

```json
{
  "id": "uuid-string-patrol-1",
  "programName": "TL Troop GA-0594",
  "members": [
    {
      "id": "uuid-string-member-1",
      "name": "John Doe",
      "rank": "Navigator",
      "troop": "500"
    },
    {
      "id": "uuid-string-member-2",
      "name": "Jane Smith",
      "rank": "Adventurer",
      "troop": "500"
    }
  ]
}
```

---

### Resource: Stations

Represents a station at the event where patrols are scored.

**URL:** `/api/v1/stations`

#### Endpoints

*   **`GET /stations`**: Retrieves a list of all stations.
*   **`POST /stations`**: Creates a new station.
*   **`GET /stations/{stationId}`**: Retrieves a specific station.
*   **`PUT /stations/{stationId}`**: Updates a specific station (e.g., to set the active configuration or members).
*   **`DELETE /stations/{stationId}`**: Deletes a specific station.

#### Endpoints for Station Configurations

*   **`GET /stations/{stationId}/configurations`**: Retrieves all configurations for a station.
*   **`POST /stations/{stationId}/configurations`**: Creates a new configuration for a station.
*   **`GET /stations/{stationId}/configurations/{configId}`**: Retrieves a specific configuration.
*   **`PUT /stations/{stationId}/configurations/{configId}`**: Updates a specific configuration.
*   **`DELETE /stations/{stationId}/configurations/{configId}`**: Deletes a specific configuration.

#### JSON Object: `Station`

```json
{
  "id": "uuid-string-station-1",
  "name": "Ropes Challenge",
  "description": "A station focused on knot-tying and lashing skills.",
  "activeConfigurationId": "uuid-string-config-2",
  "members": [
      {
          "userId": "uuid-string-user-1",
          "role": "station_leader"
      },
      {
          "userId": "uuid-string-user-2",
          "role": "station_member"
      }
  ]
}
```

#### JSON Object: `StationConfiguration`

```json
{
  "id": "uuid-string-config-2",
  "name": "2026 Night Ops - Advanced Knots",
  "description": "Advanced knot-tying scenario for the 2026 event.",
  "scenario": "The patrol must construct a tripod lashing capable of supporting a 5-gallon water jug.",
  "notes": "Materials provided: 3 staves, 1 rope (15ft).",
  "scoringMethod": "WeightedSum"
}
```

---

### Resource: Station Tasks

Represents a single scoring item within a `StationConfiguration`.

**URL:** `/api/v1/stations/{stationId}/configurations/{configId}/tasks`

#### Endpoints

*   **`GET /tasks`**: Retrieves all tasks for a configuration.
*   **`POST /tasks`**: Creates a new task.
*   **`GET /tasks/{taskId}`**: Retrieves a specific task.
*   **`PUT /tasks/{taskId}`**: Updates a specific task.
*   **`DELETE /tasks/{taskId}`**: Deletes a specific task.

#### JSON Object: `StationTask`

The `scoreValue` object changes based on the `type`.

**Example for `RangeRated`:**
```json
{
  "id": "uuid-string-task-1",
  "description": "Tripod lashing is secure and stable.",
  "scoreValue": {
    "type": "RangeRated",
    "min": 0,
    "max": 10
  },
  "scoreWeight": 5.0,
  "isActive": true
}
```

**Example for `DeltaTime`:**
```json
{
  "id": "uuid-string-task-delta",
  "description": "Time to complete puzzle.",
  "scoreValue": {
    "type": "DeltaTime",
    "scalar": 100 
  },
  "scoreWeight": 1.0,
  "isActive": true
}
```

**`scoreValue.type`** can be one of:
*   **`Completed`**: A boolean yes/no.
*   **`DeltaTime`**: Represents a duration. The submitted `value` is an integer that is divided by a `scalar` to get the total time in seconds (i.e., `seconds = value / scalar`). The `scalar` is an integer and defaults to `100` if not provided.
*   **`MultiChoice`**: A selection from predefined options. The `value` for each option must be an integer.
*   **`RangeRated`**: A numeric value with up to one decimal place. The submitted score `value` must be an integer (actual score multiplied by 10). For example, a score of `7.5` is submitted as `75`.
*   **`Stopwatch`**: Records a start and end time in UTC using ISO 8601 format (e.g., `2026-09-15T20:30:00.123Z`). Used for timing activities or total time at a station.

---

### Resource: Scoring

Represents the submission of scores for a patrol at a specific station.

**URL:** `/api/v1/scores`

#### Endpoints

*   **`POST /scores`**: Submits a set of scores for a patrol's performance at a station.

#### JSON Object: `ScoreSubmission` (Request Body)

```json
{
  "eventId": "uuid-string-event-2026",
  "patrolId": "uuid-string-patrol-1",
  "stationId": "uuid-string-station-1",
  "configurationId": "uuid-string-config-2",
  "timestamp": "2026-09-15T20:45:10.456Z",
  "scores": [
    {
      "taskId": "uuid-string-task-1",
      "value": 75
    },
    {
      "taskId": "uuid-string-task-stopwatch",
      "value": {
        "startTime": "2026-09-15T20:30:00.123Z",
        "endTime": "2026-09-15T20:45:10.456Z"
      }
    },
    {
      "taskId": "uuid-string-task-delta",
      "value": 12575
    }
  ]
}
```

---

### Resource: Reports

Represents generated reports for the event.

**URL:** `/api/v1/reports`

#### Endpoints

*   **`GET /reports/event/{eventId}`**: Retrieves the final scoring report for a given event.

#### JSON Object: `EventReport` (Response Body)

*Note: The `totalScore` and `stationBreakdown.score` values in the report are rounded based on the `roundingPrecision` set on the `Event` object.*
```json
{
  "eventId": "uuid-string-event-2026",
  "eventName": "Night Ops 2026",
  "generatedAt": "2026-09-16T02:00:00Z",
  "summary": {
    "totalPatrols": 15,
    "totalStations": 8
  },
  "patrolScores": [
    {
      "patrolId": "uuid-string-patrol-1",
      "patrolName": "TL Troop GA-0594",
      "totalScore": 850.5,
      "rank": 1,
      "stationBreakdown": [
        {
          "stationId": "uuid-string-station-1",
          "stationName": "Ropes Challenge",
          "score": 120.0
        }
      ]
    }
  ]
}
```
```