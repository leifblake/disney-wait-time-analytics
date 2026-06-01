import os
import json
from pathlib import Path
from datetime import date, datetime
import psycopg2
import psycopg2.extras

DATABASE_URL = os.environ["SUPABASE_DB_URL"]

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


QUERIES = {
    "current_top_waits": """
        WITH latest AS (
            SELECT MAX(observed_at) AS latest_observed_at
            FROM wait_times
        )
        SELECT
            rides.ride_name,
            parks.park_name,
            wait_times.wait_minutes,
            wait_times.status,
            wait_times.observed_at
        FROM wait_times
        JOIN latest ON wait_times.observed_at = latest.latest_observed_at
        JOIN rides ON wait_times.ride_id = rides.ride_id
        JOIN parks ON wait_times.park_id = parks.park_id
        WHERE wait_times.wait_minutes IS NOT NULL
        ORDER BY wait_times.wait_minutes DESC;
    """,

    "average_wait_by_park": """
        SELECT
            parks.park_name,
            ROUND(AVG(wait_times.wait_minutes)::numeric, 1)::float AS avg_wait_minutes,
            COUNT(wait_times.wait_minutes)::int AS total_wait_records
        FROM wait_times
        JOIN parks ON wait_times.park_id = parks.park_id
        WHERE wait_times.wait_minutes IS NOT NULL
        GROUP BY parks.park_name
        ORDER BY avg_wait_minutes DESC;
    """,

    "park_status_counts": """
        WITH latest AS (
            SELECT MAX(observed_at) AS latest_observed_at
            FROM wait_times
        )
        SELECT
            parks.park_name,
            wait_times.status,
            COUNT(*)::int AS status_count
        FROM wait_times
        JOIN latest ON wait_times.observed_at = latest.latest_observed_at
        JOIN parks ON wait_times.park_id = parks.park_id
        GROUP BY parks.park_name, wait_times.status
        ORDER BY parks.park_name, wait_times.status;
    """,

    "average_wait_by_hour": """
        SELECT
            TO_CHAR(observed_at AT TIME ZONE 'UTC', 'HH24:00') AS hour,
            ROUND(AVG(wait_minutes)::numeric, 1)::float AS avg_wait_minutes,
            COUNT(wait_minutes)::int AS total_wait_records
        FROM wait_times
        WHERE wait_minutes IS NOT NULL
        GROUP BY TO_CHAR(observed_at AT TIME ZONE 'UTC', 'HH24:00')
        ORDER BY hour;
    """,

    "busiest_hours": """
        SELECT
            TO_CHAR(observed_at AT TIME ZONE 'UTC', 'HH24:00') AS hour,
            ROUND(AVG(wait_minutes)::numeric, 1)::float AS avg_wait_minutes,
            COUNT(wait_minutes)::int AS total_wait_records
        FROM wait_times
        WHERE wait_minutes IS NOT NULL
        GROUP BY TO_CHAR(observed_at AT TIME ZONE 'UTC', 'HH24:00')
        ORDER BY avg_wait_minutes DESC;
    """,

    "average_wait_by_ride": """
        SELECT
            rides.ride_name,
            parks.park_name,
            ROUND(AVG(wait_times.wait_minutes)::numeric, 1)::float AS avg_wait_minutes,
            COUNT(wait_times.wait_minutes)::int AS total_wait_records
        FROM wait_times
        JOIN rides ON wait_times.ride_id = rides.ride_id
        JOIN parks ON wait_times.park_id = parks.park_id
        WHERE wait_times.wait_minutes IS NOT NULL
        GROUP BY rides.ride_name, parks.park_name
        ORDER BY avg_wait_minutes DESC;
    """,

    "average_wait_by_ride_hour": """
        SELECT
            rides.ride_name,
            parks.park_name,
            TO_CHAR(wait_times.observed_at AT TIME ZONE 'UTC', 'HH24:00') AS hour,
            ROUND(AVG(wait_times.wait_minutes)::numeric, 1)::float AS avg_wait_minutes,
            COUNT(wait_times.wait_minutes)::int AS total_wait_records
        FROM wait_times
        JOIN rides ON wait_times.ride_id = rides.ride_id
        JOIN parks ON wait_times.park_id = parks.park_id
        WHERE wait_times.wait_minutes IS NOT NULL
        GROUP BY
            rides.ride_name,
            parks.park_name,
            TO_CHAR(wait_times.observed_at AT TIME ZONE 'UTC', 'HH24:00')
        ORDER BY rides.ride_name, avg_wait_minutes ASC;
    """,

    "average_wait_by_park_hour": """
        SELECT
            parks.park_name,
            TO_CHAR(wait_times.observed_at AT TIME ZONE 'UTC', 'HH24:00') AS hour,
            ROUND(AVG(wait_times.wait_minutes)::numeric, 1)::float AS avg_wait_minutes,
            COUNT(wait_times.wait_minutes)::int AS total_wait_records
        FROM wait_times
        JOIN parks ON wait_times.park_id = parks.park_id
        WHERE wait_times.wait_minutes IS NOT NULL
        GROUP BY
            parks.park_name,
            TO_CHAR(wait_times.observed_at AT TIME ZONE 'UTC', 'HH24:00')
        ORDER BY parks.park_name, hour;
    """,

    "crowd_forecast_by_hour": """
        SELECT
            TO_CHAR(observed_at AT TIME ZONE 'UTC', 'HH24:00') AS hour,
            ROUND(AVG(wait_minutes)::numeric, 1)::float AS expected_wait_minutes,
            COUNT(wait_minutes)::int AS total_wait_records
        FROM wait_times
        WHERE wait_minutes IS NOT NULL
        GROUP BY TO_CHAR(observed_at AT TIME ZONE 'UTC', 'HH24:00')
        ORDER BY hour;
    """,

    "current_attraction_value": """
        WITH latest AS (
            SELECT MAX(observed_at) AS latest_observed_at
            FROM wait_times
        ),
        latest_waits AS (
            SELECT
                rides.ride_name,
                parks.park_name,
                wait_times.wait_minutes,
                wait_times.status
            FROM wait_times
            JOIN latest ON wait_times.observed_at = latest.latest_observed_at
            JOIN rides ON wait_times.ride_id = rides.ride_id
            JOIN parks ON wait_times.park_id = parks.park_id
        ),
        average_wait_by_ride AS (
            SELECT
                rides.ride_name,
                parks.park_name,
                AVG(wait_times.wait_minutes) AS avg_wait_minutes
            FROM wait_times
            JOIN rides ON wait_times.ride_id = rides.ride_id
            JOIN parks ON wait_times.park_id = parks.park_id
            WHERE wait_times.wait_minutes IS NOT NULL
            GROUP BY rides.ride_name, parks.park_name
        )
        SELECT
            latest_waits.ride_name,
            latest_waits.park_name,
            latest_waits.wait_minutes AS current_wait_minutes,
            ROUND(average_wait_by_ride.avg_wait_minutes::numeric, 1)::float AS typical_wait_minutes,
            attraction_scores.priority_score,
            ROUND(
                (
                    attraction_scores.priority_score *
                    (
                        average_wait_by_ride.avg_wait_minutes /
                        GREATEST(latest_waits.wait_minutes, 5)
                    )
                )::numeric,
                2
            )::float AS value_score,
            ROUND(
                (
                    (
                        (average_wait_by_ride.avg_wait_minutes - latest_waits.wait_minutes) /
                        average_wait_by_ride.avg_wait_minutes
                    ) * 100
                )::numeric,
                1
            )::float AS percent_better_than_typical
        FROM latest_waits
        JOIN attraction_scores
          ON latest_waits.ride_name = attraction_scores.ride_name
         AND latest_waits.park_name = attraction_scores.park_name
        JOIN average_wait_by_ride
          ON latest_waits.ride_name = average_wait_by_ride.ride_name
         AND latest_waits.park_name = average_wait_by_ride.park_name
        WHERE latest_waits.wait_minutes IS NOT NULL
          AND latest_waits.status = 'OPERATING'
          AND attraction_scores.priority_score >= 3
          AND average_wait_by_ride.avg_wait_minutes >= 10
        ORDER BY value_score DESC;
    """,

    "weighted_park_crowd_index": """
        WITH latest AS (
            SELECT MAX(observed_at) AS latest_observed_at
            FROM wait_times
        ),
        latest_waits AS (
            SELECT
                rides.ride_name,
                parks.park_name,
                wait_times.wait_minutes,
                wait_times.status
            FROM wait_times
            JOIN latest ON wait_times.observed_at = latest.latest_observed_at
            JOIN rides ON wait_times.ride_id = rides.ride_id
            JOIN parks ON wait_times.park_id = parks.park_id
        )
        SELECT
            latest_waits.park_name,
            ROUND(AVG(latest_waits.wait_minutes)::numeric, 1)::float AS weighted_avg_wait_minutes,
            COUNT(latest_waits.wait_minutes)::int AS tracked_headliner_count,
            ROUND(
                (
                    AVG(latest_waits.wait_minutes * attraction_scores.priority_score) /
                    AVG(attraction_scores.priority_score)
                )::numeric,
                1
            )::float AS priority_weighted_wait
        FROM latest_waits
        JOIN attraction_scores
          ON latest_waits.ride_name = attraction_scores.ride_name
         AND latest_waits.park_name = attraction_scores.park_name
        WHERE latest_waits.wait_minutes IS NOT NULL
          AND latest_waits.status = 'OPERATING'
          AND attraction_scores.priority_score >= 3
        GROUP BY latest_waits.park_name
        ORDER BY priority_weighted_wait DESC;
    """,
}


def json_serializer(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()

    raise TypeError(f"Type {type(value)} is not JSON serializable")


def write_json(name, data):
    output_path = OUTPUTS[name]

    Path(output_path).parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with open(output_path, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=2, default=json_serializer)

    print(f"Exported {name}")


def main():
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    for name, query in QUERIES.items():
        cursor.execute(query)
        rows = cursor.fetchall()

        data = [dict(row) for row in rows]

        write_json(name, data)

    cursor.close()
    conn.close()


if __name__ == "__main__":
    main()