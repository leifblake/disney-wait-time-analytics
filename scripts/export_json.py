import sqlite3
import json
from pathlib import Path

DB_PATH = "data/disney_wait_times.db"

OUTPUTS = {
    "current_top_waits": "dashboard/public/data/current_top_waits.json",
    "average_wait_by_park": "dashboard/public/data/average_wait_by_park.json",
    "park_status_counts": "dashboard/public/data/park_status_counts.json",
    "average_wait_by_hour": "dashboard/public/data/average_wait_by_hour.json",
    "busiest_hours": "dashboard/public/data/busiest_hours.json",
    "average_wait_by_ride": "dashboard/public/data/average_wait_by_ride.json",
    "average_wait_by_ride_hour": "dashboard/public/data/average_wait_by_ride_hour.json",
    "average_wait_by_park_hour": "dashboard/public/data/average_wait_by_park_hour.json",
    "crowd_forecast_by_hour": "dashboard/public/data/crowd_forecast_by_hour.json",
    "current_attraction_value": "dashboard/public/data/current_attraction_value.json",
    "weighted_park_crowd_index": "dashboard/public/data/weighted_park_crowd_index.json",
}

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row

for view_name, output_path in OUTPUTS.items():
    rows = conn.execute(
        f"SELECT * FROM {view_name}"
    ).fetchall()

    data = [dict(row) for row in rows]

    Path(output_path).parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)

    print(f"Exported {view_name}")

conn.close()