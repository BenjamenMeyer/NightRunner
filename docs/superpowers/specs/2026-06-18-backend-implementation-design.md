# Night Runner Backend Design

## Overview
This document outlines the design for the Night Runner backend service, an ASGI application built with the Falcon Framework. It provides a robust, maintainable, and non-developer friendly architecture for managing events, patrols, stations, and scoring.

## Architecture: Layered Repository Pattern (Feature-Organized)
The application is organized into three distinct layers to ensure separation of concerns while grouping related logic by feature.

### 1. Transport Layer (`transport/`)
- **Framework:** Falcon (ASGI).
- **Responsibility:** Handling HTTP requests/responses, routing, and input validation.
- **Organization:** Broken down by feature (e.g., `events.py`, `patrols.py`).
- **Middleware:** Handles JWT validation and cross-cutting concerns.

### 2. Model Layer (`models/`)
- **Technology:** Python `dataclasses` or `pydantic` (V2).
- **Responsibility:** Defining the "shape" of the data. These models are the source of truth for both the transport and driver layers.

### 3. Driver/Storage Layer (`drivers/`)
- **Technology:** Raw SQL with prepared statements.
- **Responsibility:** Database interaction, connection pooling, and migration management.
- **Organization:** Broken down by feature (e.g., `events_store.py`, `patrols_store.py`).
- **SQL Management:** SQL strings are defined as constants at the top of each store file for easy reading and editing by non-developers.

## Directory Structure
```text
nightrunner_backend/
├── config/             # App configuration, env vars, OAuth/JWT settings
├── transport/          # Falcon View Layer
│   ├── middleware/     # Auth/JWT validation & Role Sync
│   ├── events.py       # Falcon Resources for Events
│   ├── patrols.py      # Falcon Resources for Patrols
│   └── ...             # Other resources
├── drivers/            # Storage Layer (Repository)
│   ├── base.py         # Database engine (SQLite/Postgres) & Pooling
│   ├── migrations/     # Numeric SQL migration scripts (001_..., 002_...)
│   ├── events_store.py # SQL strings & Repository methods for Events
│   ├── patrols_store.py# SQL strings & Repository methods for Patrols
│   └── ...             # Other stores
├── models/             # Shared Data Models
│   ├── event.py
│   ├── patrol.py
│   └── ...
└── main.py             # Entry point & Startup Migration Runner
```

## Database & Persistence
- **Engines:** Support for SQLite (development/local) and PostgreSQL (production).
- **Migrations:**
  - Tracked in a `_migrations` table.
  - Executed at startup from `drivers/migrations/`.
  - Scripts follow `XXX_description.sql` naming convention.
- **Raw SQL:**
  - Uses prepared statements to prevent SQL injection.
  - Portable SQL syntax (avoiding DB-specific extensions).
  - Placeholders handled by the base driver (e.g., mapping `:id` to `?` or `%s`).
- **Primary Keys:** **UUIDv7** (generated in-app) for time-ordered sorting and performance.

## Authentication & Authorization
- **Provider:** Integration with Auth0 or Frontegg via JWT.
- **JWT Validation:** Middleware validates signatures using JWKS (Public Keys).
- **Local Sync:** 
  - On successful auth, the `sub` (Subject ID) is looked up in the local `users` table.
  - User roles and permissions are fetched from the local DB.
  - Identity context is attached to `req.context` for the Transport layer.
- **Permissions:** Standard roles (Admin, Organizer, Station Leader, etc.) control access to specific endpoints.

## Tech Stack
- **Language:** Python 3.12+
- **Web Framework:** Falcon (ASGI)
- **ASGI Server:** Uvicorn
- **Database Drivers:** `aiosqlite` (SQLite), `psycopg` (PostgreSQL)
- **JWT Handling:** `PyJWT` with `cryptography`
- **UUID:** `uuid6` (for UUIDv7 support)

## Dockerization
- **Base Image:** Alpine Linux (or similar minimal distro) to keep the footprint small and security high.
- **Image Construction:**
  - Multi-stage builds to separate build dependencies from the runtime environment.
  - Non-root user execution for security.
  - Inclusion of necessary tooling (e.g., PostgreSQL client for troubleshooting).
- **Distribution:** Planned Docker Hub repository for pre-built images, allowing users to `docker pull` and run with minimal configuration.

## Deployment & Infrastructure (IaC)
- **Tooling:** Terraform for Infrastructure as Code.
- **Provider Support:**
  - **DigitalOcean:** Simple Droplet + Managed DB (optional).
  - **AWS:** Lightsail or EC2 + RDS (optional).
  - **Google Cloud:** Cloud Run or Compute Engine.
- **Architecture:** Single-server "All-in-One" or "App + Managed DB" configurations.
- **Simplicity:** Focus on "One-Click" or "Minimal Command" deployments. Variable-driven configuration for easy customization by low-technical users.

## Configuration & Operations
- **Method:** Environment variables (`.env` file support) for all sensitive and operational settings.
- **User Experience:**
  - Detailed `README.md` for deployment.
  - Example configuration files with clear comments.
  - Automated database migrations on startup to minimize manual steps.
  - Simple CLI flags for common operations (e.g., initial user creation).
