import os
import psycopg2

DATABASE_URL = os.environ["SUPABASE_DB_URL"]

parks = [
    ("mk", "Magic Kingdom"),
    ("epcot", "EPCOT"),
    ("hs", "Hollywood Studios"),
    ("ak", "Animal Kingdom")
]

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

cursor.executemany(
    """
    INSERT INTO parks (park_id, park_name)
    VALUES (%s, %s)
    ON CONFLICT (park_id) DO NOTHING
    """,
    parks
)

conn.commit()
cursor.close()
conn.close()

print("Parks inserted successfully.")