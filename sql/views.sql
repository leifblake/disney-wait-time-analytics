DROP VIEW IF EXISTS latest_waits;
DROP VIEW IF EXISTS average_wait_by_park;
DROP VIEW IF EXISTS average_wait_by_ride;
DROP VIEW IF EXISTS current_top_waits;

CREATE VIEW latest_waits AS
SELECT
  wait_times.record_id,
  wait_times.ride_id,
  wait_times.park_id,
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
);

CREATE VIEW current_top_waits AS
SELECT
  ride_name,
  park_name,
  wait_minutes,
  status,
  observed_at
FROM latest_waits
WHERE wait_minutes IS NOT NULL
ORDER BY wait_minutes DESC;

CREATE VIEW average_wait_by_park AS
SELECT
  parks.park_name,
  ROUND(AVG(wait_times.wait_minutes), 1) AS avg_wait_minutes,
  COUNT(wait_times.wait_minutes) AS total_wait_records
FROM wait_times
JOIN parks ON wait_times.park_id = parks.park_id
WHERE wait_times.wait_minutes IS NOT NULL
GROUP BY parks.park_name
ORDER BY avg_wait_minutes DESC;

CREATE VIEW average_wait_by_ride AS
SELECT
  rides.ride_name,
  parks.park_name,
  ROUND(AVG(wait_times.wait_minutes), 1) AS avg_wait_minutes,
  COUNT(wait_times.wait_minutes) AS total_wait_records
FROM wait_times
JOIN rides ON wait_times.ride_id = rides.ride_id
JOIN parks ON wait_times.park_id = parks.park_id
WHERE wait_times.wait_minutes IS NOT NULL
GROUP BY rides.ride_name, parks.park_name
ORDER BY avg_wait_minutes DESC;

DROP VIEW IF EXISTS park_status_counts;

CREATE VIEW park_status_counts AS
SELECT
  parks.park_name,
  wait_times.status,
  COUNT(*) AS status_count
FROM wait_times
JOIN parks ON wait_times.park_id = parks.park_id
WHERE wait_times.observed_at = (
  SELECT MAX(observed_at) FROM wait_times
)
GROUP BY parks.park_name, wait_times.status
ORDER BY parks.park_name, status;

DROP VIEW IF EXISTS average_wait_by_hour;

CREATE VIEW average_wait_by_hour AS
SELECT
  strftime('%H:00', observed_at) AS hour,
  ROUND(AVG(wait_minutes), 1) AS avg_wait_minutes,
  COUNT(wait_minutes) AS total_wait_records
FROM wait_times
WHERE wait_minutes IS NOT NULL
GROUP BY strftime('%H:00', observed_at)
ORDER BY hour;

DROP VIEW IF EXISTS busiest_hours;

CREATE VIEW busiest_hours AS
SELECT
  strftime('%H:00', observed_at) AS hour,
  ROUND(AVG(wait_minutes), 1) AS avg_wait_minutes,
  COUNT(wait_minutes) AS total_wait_records
FROM wait_times
WHERE wait_minutes IS NOT NULL
GROUP BY strftime('%H:00', observed_at)
ORDER BY avg_wait_minutes DESC;

DROP VIEW IF EXISTS average_wait_by_ride_hour;

CREATE VIEW average_wait_by_ride_hour AS
SELECT
  rides.ride_name,
  parks.park_name,
  strftime('%H:00', wait_times.observed_at) AS hour,
  ROUND(AVG(wait_times.wait_minutes), 1) AS avg_wait_minutes,
  COUNT(wait_times.wait_minutes) AS total_wait_records
FROM wait_times
JOIN rides ON wait_times.ride_id = rides.ride_id
JOIN parks ON wait_times.park_id = parks.park_id
WHERE wait_times.wait_minutes IS NOT NULL
GROUP BY rides.ride_name, parks.park_name, strftime('%H:00', wait_times.observed_at)
ORDER BY rides.ride_name, avg_wait_minutes ASC;

DROP VIEW IF EXISTS average_wait_by_park_hour;

CREATE VIEW average_wait_by_park_hour AS
SELECT
  parks.park_name,
  strftime('%H:00', wait_times.observed_at) AS hour,
  ROUND(AVG(wait_times.wait_minutes), 1) AS avg_wait_minutes,
  COUNT(wait_times.wait_minutes) AS total_wait_records
FROM wait_times
JOIN parks ON wait_times.park_id = parks.park_id
WHERE wait_times.wait_minutes IS NOT NULL
GROUP BY parks.park_name, strftime('%H:00', wait_times.observed_at)
ORDER BY parks.park_name, hour;

DROP VIEW IF EXISTS crowd_forecast_by_hour;

CREATE VIEW crowd_forecast_by_hour AS
SELECT
  strftime('%H:00', observed_at) AS hour,
  ROUND(AVG(wait_minutes), 1) AS expected_wait_minutes,
  COUNT(wait_minutes) AS total_wait_records
FROM wait_times
WHERE wait_minutes IS NOT NULL
GROUP BY strftime('%H:00', observed_at)
ORDER BY hour;

DROP VIEW IF EXISTS current_attraction_value;

CREATE VIEW current_attraction_value AS
SELECT
  latest_waits.ride_name,
  latest_waits.park_name,
  latest_waits.wait_minutes AS current_wait_minutes,
  average_wait_by_ride.avg_wait_minutes AS typical_wait_minutes,
  attraction_scores.priority_score,
  ROUND(
    attraction_scores.priority_score *
    (average_wait_by_ride.avg_wait_minutes / MAX(latest_waits.wait_minutes, 5)),
    2
  ) AS value_score,
  ROUND(
    ((average_wait_by_ride.avg_wait_minutes - latest_waits.wait_minutes) /
    average_wait_by_ride.avg_wait_minutes) * 100,
    1
  ) AS percent_better_than_typical
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

DROP VIEW IF EXISTS weighted_park_crowd_index;

CREATE VIEW weighted_park_crowd_index AS
SELECT
  latest_waits.park_name,
  ROUND(AVG(latest_waits.wait_minutes), 1) AS weighted_avg_wait_minutes,
  COUNT(latest_waits.wait_minutes) AS tracked_headliner_count,
  ROUND(
    AVG(latest_waits.wait_minutes * attraction_scores.priority_score) /
    AVG(attraction_scores.priority_score),
    1
  ) AS priority_weighted_wait
FROM latest_waits
JOIN attraction_scores
  ON latest_waits.ride_name = attraction_scores.ride_name
 AND latest_waits.park_name = attraction_scores.park_name
WHERE latest_waits.wait_minutes IS NOT NULL
  AND latest_waits.status = 'OPERATING'
  AND attraction_scores.priority_score >= 3
GROUP BY latest_waits.park_name
ORDER BY priority_weighted_wait DESC;