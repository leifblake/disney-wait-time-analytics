import sqlite3

conn = sqlite3.connect("data/disney_wait_times.db")
cursor = conn.cursor()

parks = [
    ("mk", "Magic Kingdom"),
    ("epcot", "EPCOT"),
    ("hs", "Hollywood Studios"),
    ("ak", "Animal Kingdom")
]

cursor.executemany(
    """
    INSERT OR IGNORE INTO parks
    (park_id, park_name)
    VALUES (?, ?)
    """,
    parks
)

conn.commit()
conn.close()

print("Parks inserted successfully.")