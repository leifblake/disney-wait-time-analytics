import sqlite3
from datetime import datetime, timezone
import requests
import subprocess

DB_PATH = "data/disney_wait_times.db"
VIEWS_PATH = "sql/views.sql"

WDW_RESORT_ID = "e957da41-3552-4cf6-b636-5babc5cbc4e5"

PARK_NAME_TO_ID = {
    "Magic Kingdom Park": "mk",
    "EPCOT": "epcot",
    "Disney's Hollywood Studios": "hs",
    "Disney's Animal Kingdom Theme Park": "ak"
}


def get_children(entity_id):
    url = f"https://api.themeparks.wiki/v1/entity/{entity_id}/children"
    response = requests.get(url, timeout=20)
    response.raise_for_status()
    return response.json()["children"]


def get_live_data(entity_id):
    url = f"https://api.themeparks.wiki/v1/entity/{entity_id}/live"
    response = requests.get(url, timeout=20)
    response.raise_for_status()
    return response.json()["liveData"]


def rebuild_views():
    with sqlite3.connect(DB_PATH) as conn:
        with open(VIEWS_PATH, "r") as file:
            conn.executescript(file.read())

    print("SQL views rebuilt.")


def export_json():
    subprocess.run(["python3", "scripts/export_json.py"], check=True)
    print("JSON files exported.")


def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    observed_at = datetime.now(timezone.utc).isoformat()
    inserted = 0
    skipped = 0

    print("Finding Walt Disney World parks...")
    resort_children = get_children(WDW_RESORT_ID)

    parks = [
        child for child in resort_children
        if child.get("name") in PARK_NAME_TO_ID
    ]

    for park in parks:
        park_name = park["name"]
        park_entity_id = park["id"]
        park_id = PARK_NAME_TO_ID[park_name]

        print(f"Fetching live wait times for {park_name}...")

        live_data = get_live_data(park_entity_id)

        for item in live_data:
            ride_id = item.get("id")
            status = item.get("status")
            queue = item.get("queue", {})

            standby = queue.get("STANDBY", {})
            wait_minutes = standby.get("waitTime")

            if not ride_id:
                skipped += 1
                continue

            cursor.execute(
                "SELECT ride_id FROM rides WHERE ride_id = ?",
                (ride_id,)
            )

            exists = cursor.fetchone()

            if not exists:
                skipped += 1
                continue

            cursor.execute(
                """
                INSERT INTO wait_times
                (ride_id, park_id, observed_at, wait_minutes, status, source)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    ride_id,
                    park_id,
                    observed_at,
                    wait_minutes,
                    status,
                    "themeparks.wiki"
                )
            )

            inserted += 1

    conn.commit()
    conn.close()

    print("\nCollection complete.")
    print(f"Inserted rows: {inserted}")
    print(f"Skipped rows: {skipped}")
    print(f"Observed at: {observed_at}")

    rebuild_views()
    export_json()


if __name__ == "__main__":
    main()