import os
import re
import psycopg2

DATABASE_URL = os.environ["SUPABASE_DB_URL"]
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
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

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
                SELECT rides.ride_name, parks.park_name
                FROM rides
                JOIN parks ON rides.park_id = parks.park_id
                WHERE rides.ride_name = %s
                  AND parks.park_name = %s
                """,
                (ride_name, park_name)
            )

            match = cursor.fetchone()

            if not match:
                print(f"Skipped unmatched attraction: {park_name} | {ride_name}")
                skipped += 1
                continue

            cursor.execute(
                """
                INSERT INTO attraction_scores
                (park_name, ride_name, priority_score)
                VALUES (%s, %s, %s)
                ON CONFLICT (park_name, ride_name)
                DO UPDATE SET priority_score = EXCLUDED.priority_score
                """,
                (park_name, ride_name, score)
            )

            inserted += 1

    conn.commit()
    cursor.close()
    conn.close()

    print("Attraction scores imported.")
    print(f"Inserted/updated: {inserted}")
    print(f"Skipped: {skipped}")


if __name__ == "__main__":
    main()