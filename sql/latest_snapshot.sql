SELECT 
  rides.ride_name,
  parks.park_name,
  wait_times.wait_minutes,
  wait_times.status,
  wait_times.observed_at
FROM wait_times
JOIN rides ON wait_times.ride_id = rides.ride_id
JOIN parks ON wait_times.park_id = parks.park_id
WHERE wait_times.observed_at = (
  SELECT MAX(observed_at) FROM wait_times
)
AND wait_times.wait_minutes IS NOT NULL
ORDER BY wait_times.wait_minutes DESC
LIMIT 20;