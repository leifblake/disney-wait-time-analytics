DROP TABLE IF EXISTS wait_times;
DROP TABLE IF EXISTS rides;
DROP TABLE IF EXISTS parks;

CREATE TABLE parks (
  park_id TEXT PRIMARY KEY,
  park_name TEXT NOT NULL,
  resort TEXT DEFAULT 'Walt Disney World'
);

CREATE TABLE rides (
  ride_id TEXT PRIMARY KEY,
  park_id TEXT NOT NULL,
  ride_name TEXT NOT NULL,
  land TEXT,
  ride_type TEXT,
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (park_id) REFERENCES parks(park_id)
);

CREATE TABLE wait_times (
  record_id INTEGER PRIMARY KEY AUTOINCREMENT,
  ride_id TEXT NOT NULL,
  park_id TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  wait_minutes INTEGER,
  status TEXT,
  source TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ride_id) REFERENCES rides(ride_id),
  FOREIGN KEY (park_id) REFERENCES parks(park_id)
);

CREATE INDEX idx_wait_times_ride_id ON wait_times(ride_id);
CREATE INDEX idx_wait_times_park_id ON wait_times(park_id);
CREATE INDEX idx_wait_times_observed_at ON wait_times(observed_at);