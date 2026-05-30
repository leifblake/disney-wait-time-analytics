import sqlite3
import requests

DB_PATH = "data/disney_wait_times.db"

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

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("Fetching Walt Disney World parks...")
    resort_children = get_children(WDW_RESORT_ID)

    parks = [
        child for child in resort_children
        if child.get("name") in PARK_NAME_TO_ID
    ]

    total_inserted = 0

    for park in parks:
        park_name = park["name"]
        park_entity_id = park["id"]
        park_id = PARK_NAME_TO_ID[park_name]

        print(f"Fetching attractions for {park_name}...")

        children = get_children(park_entity_id)
        attraction_count = 0

        for child in children:
            entity_type = child.get("entityType")
            ride_id = child.get("id")
            ride_name = child.get("name")

            if not ride_id or not ride_name:
                continue

            if entity_type not in ["ATTRACTION", "SHOW"]:
                continue

            cursor.execute(
                """
                INSERT OR IGNORE INTO rides
                (ride_id, park_id, ride_name, land, ride_type, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    ride_id,
                    park_id,
                    ride_name,
                    None,
                    entity_type,
                    1
                )
            )

            attraction_count += 1
            total_inserted += 1

        print(f"  Added/found {attraction_count} attractions/shows.")

    conn.commit()
    conn.close()

    print(f"\nImport complete. Processed {total_inserted} attractions/shows.")

if __name__ == "__main__":
    main()