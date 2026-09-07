# Night Runner
Track Patrols at each station, calculator scores, and generate reports.

## Overview

NightRunner is meant to be a web-based application that is dedicated to helping
Night Ops Adventurers organizers to run the event and ease the burden of scoring
by enabling the following:

1. Provide a central registration system for Patrols.
2. Provide a method of building out scoring for Stations.
3. Provide a method to calculate the scoring for the whole event.
4. Provide a method to generate reports for the event.

## Community Contributions

We would like to encourage the community to help support development and
usage of the Night Runner system and therefore are utilizing the
GNU AFFERO GENERAL PUBLIC LICENSE.

The core of this license is:
1. You may setup your own instance of the software however you like.
2. Any changes you make must be made available to your users.
3. While we would appreciate changes be provided back to us it is not required that you do so only that you make them available to any users you have.
4. This does not apply to runtime data such as your specific event settings.

To help with license compliance we recommend that you use a public code sharing
system like GitHub, SourceForge, BitBucket, GitLab, GNU Savannah, or any other
service which will enable you to simply provide a link to us and to where you
are hosting your own changes.

## Patrols

In order to be able able to manage scoring the system will need a method of
knowing who to score. This is will be done through registering the Patrols
into the system.

A Patrol consists of:
- A Program Name
- A group of patrol members

Each patrol member will be identified by name, rank, and troop they belong to.

## Stations

A Night Ops event consists of a series of stations. The Event Organizer will be
in charge of defining the available stations and selecting which ones to use for
the event and which configuration to use for the event.

Each station consists of:
- A Station Name
- A Station Description
- A list of Station Configurations
- An Active Station Configurations

For example, a Ropes Station may exist. It can have multiple configurations available
to allow for multiple variations of the Station so scoring configurations can be
remembered between events, year to year, etc. For a given event the Event Organizer
will want to select one of the configurations to be the active configuration to be
used for scoring for that event.

### Station Description

The Station Description provides a means of conveying what the Station does at a high level.
The details of the station for a given event will be stored with the Station Configuration.

### Station Configuration

The Station Configuration provides the details for a specific variation of Station.

The Station Configuration consists of:
- Station Configuration Name
- Station Configuration Description
- Station Scenario
- Station Notes
- Station Score Configuration

#### Station Score Configuration

The Station Score Configuration is the core component to scoring at the event.

Each Station Score Configuration consists of:
- A list of Station Tasks
- A Scoring Method

##### Scoring Method

The Scoring Method determines how 

##### Station Tasks

Station Tasks define each line item on a scoring sheet that Patrols will be judged against.

Each Station Task consists of:
- Task Description
- Task Score Value
- Task Score Weight
- Task Score Active

###### Task Score Weight

The Task Score Weight provides a means of taking the basic score value and determining its
importance in the final score calculation.

For instance, a task that is of low importance might have a weight of 0.5 where as a task
with high importance might have a weight of 10; as a result a Patrol that score 1 on the task
would get either a 0.5 or 10 respectively.

| Task | Importance | Weight | Patrol | Patrol Score | Patrol Weighted Score |
|-|-|-|-|-|-|
|Task 1 | low | 0.5 | Patrol A | 1.0 |  0.50 |
|Task 1 | low | 0.5 | Patrol B | 2.0 |  1.00 |
|Task 1 | low | 0.5 | Patrol C | 0.5 |  0.25 |
|Task 1 | low | 0.5 | Patrol D | 3.0 |  1.50 |
|Task 2 | medium | 1.0 | Patrol A | 1.0 |  1.0 |
|Task 2 | medium | 1.0 | Patrol B | 2.0 |  2.0 |
|Task 2 | medium | 1.0 | Patrol C | 0.5 |  0.5 |
|Task 2 | medium | 1.0 | Patrol D | 3.0 |  3.0 |
|Task 3 | high | 5.0 | Patrol A | 1.0 |  5.0 |
|Task 3 | high | 5.0 | Patrol B | 2.0 | 10.0 |
|Task 3 | high | 5.0 | Patrol C | 0.5 |  2.5 |
|Task 3 | high | 5.0 | Patrol D | 3.0 | 25.0 |

###### Task Score Active

Task Score Active can be active (true) or inactive (false).

Inactive scoring means that the task is listed and the event organizer wants to know whether
or not Patrols completed the task but they are not using the task in the final scoring calculation.

Active scoring means that the task counts towards the calcuated score.

This is useful to configure a task, configure its weight, but then be able to turn the scoring
on or off for a given task. It is essentially like setting the Task Score Weight to zero (0)
but allows the system to keep track of a weight and just skip the task when calculating the score.

###### Task Score Value

A Task Score Value tracks how a given task is to be score.

Task Score Values can be one of the following:
- Completed: Yes/No
- Delta Time: Start Time, End Time
- Multi-Choice (descriptions with pre-selected values)
- Range Rated (f.e 0-10)

Task Score Values underpin how the system performs.

## Deliverables

The long term goal is to have:
- An online service that performs the core functionality
- A mobile application Station Volunteers can use to input information during the event.
- Live displays of what Patrols are at which stations
- Patrol Management (check-in, check-out, etc).

However we realize this goal is ambitious and not something that can be easily delivered
in a single year. Therefore in order to support Night Ops Adventures Events the following
deliverables are being targetted:

| Deliverable | Description | Target Delivery |
|-|-|-|
| Milestone 1 | Online service with scoring support | September 2026 |
| Milestone 2 | Full online services for scoring + mobile application for station volunteers | September 2027 |
| Milestone 3 | Patrol Management + Live Display | September 2028 |

This delivery cycle allows for the team to get feedback on deliverables,
incorporate the feedback into the next deliverable, and add new features.

### Night Ops Adventures Night Runner Services

The Night Ops Adventures team will be hosting our own services for our own events.
That said, we will set it up in a way that we can offer it as a service to others
running their own Night Ops Events should they wish to utilize the system without
having to figure out how to run it on their own.

## Backend Development

### Local Setup (Virtualenv)

1. Install dependencies:
   ```bash
   pip install -e ".[test]"
   ```

2. Run the server:
   ```bash
   uvicorn nightrunner_backend.main:app --reload
   ```

3. Run tests:
   ```bash
   pytest
   ```

### Local Setup (Docker / Podman Compose)

For a full-stack local development environment containing the Python ASGI app, PostgreSQL database, and a mock OIDC server, you can use Docker Compose (or Podman Compose):

1. **Start the environment (Default Mock OIDC):**
   ```bash
   docker compose up --build
   ```
   *(For Podman, run `podman-compose up --build`)*

   This boots up:
   - **API Server** on `http://localhost:8000`
   - **Postgres Database** on port `5432` (with migrations auto-applied)
   - **Mock OIDC Server** on `http://localhost:4000`
   - **Seed Service** (automatically populates local database with default events and testing OIDC users)

2. **Testing Against Live Firebase OIDC Locally**:
   You can easily toggle Docker Compose between the local Mock OIDC server and live Firebase Auth. See [README.Firebase.md](README.Firebase.md) for step-by-step instructions on setting up `.env.local` and configuring authorized callback URIs.

3. **Stop the environment:**
   ```bash
   docker compose down
   ```

### API & Playground Testing

- `GET /health`: Health check endpoint (public).
- **Interactive Playground (Bruno):** 
  An organized API collection is available under [`api/bruno/`](api/bruno/). You can import this folder into the [Bruno API Client](https://www.usebruno.com/) to interact with all versioned endpoints (`/v1/events`, `/v1/patrols`, `/v1/stations`, etc.).
  
  Refer to the [`api/README.md`](api/README.md) for instructions on environment configuration, local authentication tokens acquisition, and automatic OpenAPI contract synchronization settings.
