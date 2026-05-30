import sqlite3
import re

DB_PATH = "data/disney_wait_times.db"
SCORES_PATH = "data/manual/attraction_scores.txt"


def parse_line(line):
    line = line.strip()

    if not line or "|" not in line:
        return None

    park_name, ride_score = line.split("|", 1)

    match = re.match(r"(.+)\s+([1-5])$", ride_score.strip())

    if not match:
        return None

    ride_name = match.group(1).strip()
    score = int(match.group(2))

    return park_name.strip(), ride_name, score


def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("DROP TABLE IF EXISTS attraction_scores")

    cursor.execute("""
        CREATE TABLE attraction_scores (
            ride_id TEXT PRIMARY KEY,
            park_id TEXT NOT NULL,
            ride_name TEXT NOT NULL,
            park_name TEXT NOT NULL,
            priority_score INTEGER NOT NULL CHECK(priority_score BETWEEN 1 AND 5),
            FOREIGN KEY (ride_id) REFERENCES rides(ride_id),
            FOREIGN KEY (park_id) REFERENCES parks(park_id)
        )
    """)

    inserted = 0
    skipped = 0

    with open(SCORES_PATH, "r", encoding="utf-8") as file:
        for line in file:
            parsed = parse_line(line)

            if not parsed:
                skipped += 1
                continue

            park_name, ride_name, score = parsed

            cursor.execute(
                """
                SELECT rides.ride_id, rides.park_id
                FROM rides
                JOIN parks ON rides.park_id = parks.park_id
                WHERE rides.ride_name = ?
                  AND parks.park_name = ?
                """,
                (ride_name, park_name)
            )

            match = cursor.fetchone()

            if not match:
                print(f"Skipped unmatched attraction: {park_name} | {ride_name}")
                skipped += 1
                continue

            ride_id, park_id = match

            cursor.execute(
                """
                INSERT OR REPLACE INTO attraction_scores
                (ride_id, park_id, ride_name, park_name, priority_score)
                VALUES (?, ?, ?, ?, ?)
                """,
                (ride_id, park_id, ride_name, park_name, score)
            )

            inserted += 1

    conn.commit()
    conn.close()

    print("Attraction scores imported.")
    print(f"Inserted: {inserted}")
    print(f"Skipped: {skipped}")


if __name__ == "__main__":
    main()