CREATE TABLE scores (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    station_id TEXT NOT NULL,
    patrol_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    score_value REAL NOT NULL,
    score_weight REAL NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id)   REFERENCES events(id),
    FOREIGN KEY (station_id) REFERENCES stations(id),
    FOREIGN KEY (patrol_id)  REFERENCES patrols(id),
    FOREIGN KEY (task_id)    REFERENCES station_tasks(id)
);
