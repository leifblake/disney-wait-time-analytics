-- Top 20 current waits
SELECT 
  rides.ride_name,
  parks.park_name,
  wait_times.wait_minutes,
  wait_times.status,
  wait_times.observed_at
FROM wait_times
JOIN rides ON wait_times.ride_id = rides.ride_id
JOIN parks ON wait_times.park_id = parks.park_id
WHERE wait_times.wait_minutes IS NOT NULL
ORDER BY wait_times.wait_minutes DESC
LIMIT 20;


-- Average current wait by park
SELECT
  parks.park_name,
  ROUND(AVG(wait_times.wait_minutes), 1) AS avg_wait_minutes,
  COUNT(wait_times.wait_minutes) AS rides_with_waits
FROM wait_times
JOIN parks ON wait_times.park_id = parks.park_id
WHERE wait_times.wait_minutes IS NOT NULL
GROUP BY parks.park_name
ORDER BY avg_wait_minutes DESC;


-- Number of operating rides by park
SELECT
  parks.park_name,
  COUNT(*) AS operating_count
FROM wait_times
JOIN parks ON wait_times.park_id = parks.park_id
WHERE wait_times.status = 'OPERATING'
GROUP BY parks.park_name
ORDER BY operating_count DESC;


-- Current wait data by ride
SELECT
  rides.ride_name,
  parks.park_name,
  wait_times.wait_minutes,
  wait_times.status
FROM wait_times
JOIN rides ON wait_times.ride_id = rides.ride_id
JOIN parks ON wait_times.park_id = parks.park_id
ORDER BY parks.park_name, wait_times.wait_minutes DESC;