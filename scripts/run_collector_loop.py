import time
import subprocess
from datetime import datetime

while True:
    print(f"\nRunning collector at {datetime.now()}")

    subprocess.run(["python3", "scripts/collect_current_waits.py"])
    subprocess.run(["python3", "scripts/export_json.py"])

    print("Waiting 15 minutes...")
    time.sleep(15 * 60)