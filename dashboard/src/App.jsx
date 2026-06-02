import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LineChart,
  Line
} from "recharts";

const DATA_BASE = `${import.meta.env.BASE_URL}data/`;

const PARK_COLORS = {
  "Magic Kingdom": "#7b61ff",
  EPCOT: "#00a6d6",
  "Hollywood Studios": "#d94f70",
  "Animal Kingdom": "#4f8f5f"
};

const STATUS_COLORS = {
  OPERATING: "#55c27a",
  DOWN: "#f2b84b",
  CLOSED: "#d85c5c",
  REFURBISHMENT: "#8b8fa3"
};

const PARK_ORDER = [
  "Magic Kingdom",
  "EPCOT",
  "Hollywood Studios",
  "Animal Kingdom"
];

function getHeatmapColor(value, maxValue) {
  if (value === null || value === undefined) {
    return "rgba(255, 255, 255, 0.045)";
  }

  const intensity = maxValue > 0 ? value / maxValue : 0;
  const hue = 120 - intensity * 120;

  return `hsl(${hue}, 72%, 48%)`;
}

function getHourOffset(hourString, offset) {
  const hour = Number(hourString.split(":")[0]);
  const nextHour = (hour + offset + 24) % 24;

  return `${String(nextHour).padStart(2, "0")}:00`;
}

function App() {
  const [topWaits, setTopWaits] = useState([]);
  const [parkAverages, setParkAverages] = useState([]);
  const [rideAverages, setRideAverages] = useState([]);
  const [rideHourAverages, setRideHourAverages] = useState([]);
  const [parkHourAverages, setParkHourAverages] = useState([]);
  const [statusCounts, setStatusCounts] = useState([]);
  const [hourlyAverages, setHourlyAverages] = useState([]);
  const [crowdForecast, setCrowdForecast] = useState([]);
  const [attractionValues, setAttractionValues] = useState([]);
  const [weightedParkCrowds, setWeightedParkCrowds] = useState([]);
  const [selectedPark, setSelectedPark] = useState("All Parks");
  const [selectedRide, setSelectedRide] = useState("All Rides");

  useEffect(() => {
    supabase
      .from("current_top_waits")
      .select("*")
      .then(({ data, error }) => {
        if (error) {
          console.error("Supabase current_top_waits error:", error);
          return;
        }

        setTopWaits(data || []);
      });

    fetch(`${DATA_BASE}average_wait_by_park.json`)
      .then((res) => res.json())
      .then(setParkAverages);

    fetch(`${DATA_BASE}average_wait_by_ride.json`)
      .then((res) => res.json())
      .then(setRideAverages);

    fetch(`${DATA_BASE}average_wait_by_ride_hour.json`)
      .then((res) => res.json())
      .then(setRideHourAverages);

    fetch(`${DATA_BASE}average_wait_by_park_hour.json`)
      .then((res) => res.json())
      .then(setParkHourAverages);

    fetch(`${DATA_BASE}park_status_counts.json`)
      .then((res) => res.json())
      .then(setStatusCounts);

    fetch(`${DATA_BASE}average_wait_by_hour.json`)
      .then((res) => res.json())
      .then(setHourlyAverages);

    fetch(`${DATA_BASE}crowd_forecast_by_hour.json`)
      .then((res) => res.json())
      .then(setCrowdForecast);

    fetch(`${DATA_BASE}current_attraction_value.json`)
      .then((res) => res.json())
      .then(setAttractionValues);

    fetch(`${DATA_BASE}weighted_park_crowd_index.json`)
      .then((res) => res.json())
      .then(setWeightedParkCrowds);
  }, []);

  const availableRides = useMemo(() => {
    const rides =
      selectedPark === "All Parks"
        ? rideAverages
        : rideAverages.filter((ride) => ride.park_name === selectedPark);

    return [...new Set(rides.map((ride) => ride.ride_name))].sort();
  }, [rideAverages, selectedPark]);

  const filteredTopWaits = topWaits.filter((ride) => {
    const parkMatch =
      selectedPark === "All Parks" || ride.park_name === selectedPark;

    const rideMatch =
      selectedRide === "All Rides" || ride.ride_name === selectedRide;

    return parkMatch && rideMatch;
  });

  const filteredRideAverages = rideAverages.filter((ride) => {
    const parkMatch =
      selectedPark === "All Parks" || ride.park_name === selectedPark;

    const rideMatch =
      selectedRide === "All Rides" || ride.ride_name === selectedRide;

    return parkMatch && rideMatch;
  });

  const filteredStatusCounts =
    selectedPark === "All Parks"
      ? statusCounts
      : statusCounts.filter((item) => item.park_name === selectedPark);

  const filteredParkAverages =
    selectedPark === "All Parks"
      ? parkAverages
      : parkAverages.filter((park) => park.park_name === selectedPark);

  const highestWait = filteredTopWaits[0];

  const avgWait =
    filteredTopWaits.length > 0
      ? Math.round(
          filteredTopWaits.reduce((sum, ride) => sum + ride.wait_minutes, 0) /
            filteredTopWaits.length
        )
      : 0;

  const totalOperating = filteredStatusCounts
    .filter((item) => item.status === "OPERATING")
    .reduce((sum, item) => sum + item.status_count, 0);

  const totalDown = filteredStatusCounts
    .filter((item) => item.status === "DOWN")
    .reduce((sum, item) => sum + item.status_count, 0);

  const lastUpdated = topWaits[0]
    ? new Date(topWaits[0].observed_at).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      })
    : "Loading...";

  const forecastData = useMemo(() => {
    if (crowdForecast.length === 0) {
      return {
        currentHour: null,
        now: null,
        plusOne: null,
        plusTwo: null,
        trendLabel: "Collecting data",
        trendSymbol: "→"
      };
    }

    const currentHour = new Date().getHours();
    const currentHourLabel = `${String(currentHour).padStart(2, "0")}:00`;
    const plusOneHourLabel = getHourOffset(currentHourLabel, 1);
    const plusTwoHourLabel = getHourOffset(currentHourLabel, 2);

    const getForecastForHour = (hour) =>
      crowdForecast.find((item) => item.hour === hour) || null;

    const now = getForecastForHour(currentHourLabel);
    const plusOne = getForecastForHour(plusOneHourLabel);
    const plusTwo = getForecastForHour(plusTwoHourLabel);

    let trendLabel = "Not enough data";
    let trendSymbol = "→";

    if (now && plusTwo) {
      const difference =
        plusTwo.expected_wait_minutes - now.expected_wait_minutes;

      if (difference >= 5) {
        trendLabel = "Getting Busier";
        trendSymbol = "↑";
      } else if (difference <= -5) {
        trendLabel = "Getting Lighter";
        trendSymbol = "↓";
      } else {
        trendLabel = "Holding Steady";
        trendSymbol = "→";
      }
    }

    return {
      currentHour: currentHourLabel,
      now,
      plusOne,
      plusTwo,
      trendLabel,
      trendSymbol
    };
  }, [crowdForecast]);

  const statusByPark = useMemo(() => {
    const grouped = {};

    filteredStatusCounts.forEach((item) => {
      if (!grouped[item.park_name]) {
        grouped[item.park_name] = {
          park_name: item.park_name,
          OPERATING: 0,
          DOWN: 0,
          CLOSED: 0,
          REFURBISHMENT: 0
        };
      }

      grouped[item.park_name][item.status] = item.status_count;
    });

    return Object.values(grouped);
  }, [filteredStatusCounts]);

  const bestTimeToRide = useMemo(() => {
    if (selectedRide === "All Rides") {
      return null;
    }

    const rideRows = rideHourAverages
      .filter((item) => item.ride_name === selectedRide)
      .filter((item) =>
        selectedPark === "All Parks" ? true : item.park_name === selectedPark
      )
      .filter((item) => item.avg_wait_minutes !== null)
      .sort((a, b) => a.avg_wait_minutes - b.avg_wait_minutes);

    return rideRows[0] || null;
  }, [rideHourAverages, selectedRide, selectedPark]);

  const keyInsights = useMemo(() => {
    const highestAverageRide =
      rideAverages.length > 0
        ? [...rideAverages].sort(
            (a, b) => b.avg_wait_minutes - a.avg_wait_minutes
          )[0]
        : null;

    const mostCrowdedPark =
      weightedParkCrowds.length > 0
        ? [...weightedParkCrowds].sort(
            (a, b) => b.priority_weighted_wait - a.priority_weighted_wait
          )[0]
        : null;

    const leastCrowdedPark =
      weightedParkCrowds.length > 0
        ? [...weightedParkCrowds].sort(
            (a, b) => a.priority_weighted_wait - b.priority_weighted_wait
          )[0]
        : null;

    const bestCurrentValue =
      attractionValues.length > 0
        ? [...attractionValues].sort((a, b) => b.value_score - a.value_score)[0]
        : null;

    const mostReliablePark =
      statusByPark.length > 0
        ? [...statusByPark].sort((a, b) => b.OPERATING - a.OPERATING)[0]
        : null;

    return {
      highestAverageRide,
      mostCrowdedPark,
      leastCrowdedPark,
      bestCurrentValue,
      mostReliablePark
    };
  }, [rideAverages, weightedParkCrowds, attractionValues, statusByPark]);

  const selectedRideHourlyData = useMemo(() => {
    if (selectedRide === "All Rides") {
      return [];
    }

    return rideHourAverages
      .filter((item) => item.ride_name === selectedRide)
      .filter((item) =>
        selectedPark === "All Parks" ? true : item.park_name === selectedPark
      )
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }, [rideHourAverages, selectedRide, selectedPark]);

  const heatmapHours = useMemo(() => {
    return [...new Set(parkHourAverages.map((item) => item.hour))].sort();
  }, [parkHourAverages]);

  const heatmapParks =
    selectedPark === "All Parks" ? PARK_ORDER : [selectedPark];

  const maxHeatmapWait = useMemo(() => {
    const values = parkHourAverages
      .filter((item) =>
        selectedPark === "All Parks" ? true : item.park_name === selectedPark
      )
      .map((item) => item.avg_wait_minutes)
      .filter((value) => value !== null && value !== undefined);

    return values.length ? Math.max(...values) : 0;
  }, [parkHourAverages, selectedPark]);

  function getHeatmapValue(parkName, hour) {
    const match = parkHourAverages.find(
      (item) => item.park_name === parkName && item.hour === hour
    );

    return match ? match.avg_wait_minutes : null;
  }

  function handleParkChange(event) {
    setSelectedPark(event.target.value);
    setSelectedRide("All Rides");
  }

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <p className="eyebrow">Walt Disney World Data Dashboard</p>
        <h1>Disney Wait Time Analytics</h1>
        <p>
          A live analytics dashboard tracking attraction wait times and operating
          status across Magic Kingdom, EPCOT, Hollywood Studios, and Animal
          Kingdom.
        </p>
      </header>

      <section className="filter-bar">
        <div className="filter-group">
          <label htmlFor="park-filter">Park Filter</label>

          <select
            id="park-filter"
            value={selectedPark}
            onChange={handleParkChange}
          >
            <option>All Parks</option>
            <option>Magic Kingdom</option>
            <option>EPCOT</option>
            <option>Hollywood Studios</option>
            <option>Animal Kingdom</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="ride-filter">Ride Filter</label>

          <select
            id="ride-filter"
            value={selectedRide}
            onChange={(event) => setSelectedRide(event.target.value)}
          >
            <option>All Rides</option>

            {availableRides.map((rideName) => (
              <option key={rideName}>{rideName}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card featured">
          <h3>Highest Current Wait</h3>
          <p>{highestWait ? `${highestWait.wait_minutes} min` : "—"}</p>
          <span>{highestWait?.ride_name || "No wait data available"}</span>
        </article>

        <article className="stat-card">
          <h3>Average Current Wait</h3>
          <p>{avgWait} min</p>
          <span>Across selected attractions with posted waits</span>
        </article>

        <article className="stat-card">
          <h3>Best Time to Ride</h3>
          <p>{bestTimeToRide ? bestTimeToRide.hour : "—"}</p>
          <span>
            {bestTimeToRide
              ? `${selectedRide}: ${bestTimeToRide.avg_wait_minutes} min avg`
              : "Select a ride to calculate"}
          </span>
        </article>

        <article className="stat-card">
          <h3>Operating Attractions</h3>
          <p>{totalOperating}</p>
          <span>Currently listed as operating</span>
        </article>

        <article className="stat-card">
          <h3>Down Attractions</h3>
          <p>{totalDown}</p>
          <span>Currently listed as down</span>
        </article>

        <article className="stat-card">
          <h3>Last Updated</h3>
          <p>{lastUpdated}</p>
          <span>Latest ThemeParks.wiki snapshot</span>
        </article>
      </section>

      <section className="forecast-card">
        <div className="chart-header">
          <div>
            <p className="chart-kicker">Crowd Forecast</p>
            <h2>Expected Crowd Trend</h2>
          </div>
        </div>

        <div className="forecast-grid">
          <article className="forecast-item">
            <h3>Expected Wait Now</h3>
            <p>
              {forecastData.now
                ? `${forecastData.now.expected_wait_minutes} min`
                : "—"}
            </p>
            <span>{forecastData.currentHour || "Current hour"}</span>
          </article>

          <article className="forecast-item">
            <h3>Expected Wait +1 Hour</h3>
            <p>
              {forecastData.plusOne
                ? `${forecastData.plusOne.expected_wait_minutes} min`
                : "—"}
            </p>
            <span>
              {forecastData.currentHour
                ? getHourOffset(forecastData.currentHour, 1)
                : "Next hour"}
            </span>
          </article>

          <article className="forecast-item">
            <h3>Expected Wait +2 Hours</h3>
            <p>
              {forecastData.plusTwo
                ? `${forecastData.plusTwo.expected_wait_minutes} min`
                : "—"}
            </p>
            <span>
              {forecastData.currentHour
                ? getHourOffset(forecastData.currentHour, 2)
                : "Two hours ahead"}
            </span>
          </article>

          <article className="forecast-item featured-forecast">
            <h3>Crowd Trend</h3>
            <p>
              {forecastData.trendSymbol} {forecastData.trendLabel}
            </p>
            <span>Based on historical hourly averages</span>
          </article>
        </div>
      </section>

      <section className="charts-grid">
        <article className="chart-card large-chart">
          <div className="chart-header">
            <div>
              <p className="chart-kicker">Live Demand</p>
              <h2>Top Current Wait Times</h2>
            </div>
          </div>

          <div className="chart-container">
            <ResponsiveContainer>
              <BarChart
                data={filteredTopWaits.slice(0, 10)}
                margin={{ top: 16, right: 20, left: 0, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="4 4" stroke="#26364f" />
                <XAxis
                  dataKey="ride_name"
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  height={90}
                  tick={{ fill: "#b8c3d9", fontSize: 11 }}
                />
                <YAxis tick={{ fill: "#b8c3d9", fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="wait_minutes" radius={[10, 10, 0, 0]}>
                  {filteredTopWaits.slice(0, 10).map((entry) => (
                    <Cell
                      key={entry.ride_name}
                      fill={PARK_COLORS[entry.park_name] || "#7b61ff"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="chart-card">
          <div className="chart-header">
            <div>
              <p className="chart-kicker">Park Comparison</p>
              <h2>Average Wait by Park</h2>
            </div>
          </div>

          <div className="chart-container">
            <ResponsiveContainer>
              <BarChart data={filteredParkAverages}>
                <CartesianGrid strokeDasharray="4 4" stroke="#26364f" />
                <XAxis
                  dataKey="park_name"
                  tick={{ fill: "#b8c3d9", fontSize: 11 }}
                />
                <YAxis tick={{ fill: "#b8c3d9", fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="avg_wait_minutes" radius={[10, 10, 0, 0]}>
                  {filteredParkAverages.map((entry) => (
                    <Cell
                      key={entry.park_name}
                      fill={PARK_COLORS[entry.park_name] || "#00a6d6"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="chart-card">
          <div className="chart-header">
            <div>
              <p className="chart-kicker">Operations</p>
              <h2>Status Counts by Park</h2>
            </div>
          </div>

          <div className="chart-container">
            <ResponsiveContainer>
              <BarChart data={statusByPark}>
                <CartesianGrid strokeDasharray="4 4" stroke="#26364f" />
                <XAxis
                  dataKey="park_name"
                  tick={{ fill: "#b8c3d9", fontSize: 11 }}
                />
                <YAxis tick={{ fill: "#b8c3d9", fontSize: 12 }} />
                <Tooltip />
                <Bar
                  dataKey="OPERATING"
                  stackId="status"
                  fill={STATUS_COLORS.OPERATING}
                />
                <Bar
                  dataKey="DOWN"
                  stackId="status"
                  fill={STATUS_COLORS.DOWN}
                />
                <Bar
                  dataKey="CLOSED"
                  stackId="status"
                  fill={STATUS_COLORS.CLOSED}
                />
                <Bar
                  dataKey="REFURBISHMENT"
                  stackId="status"
                  fill={STATUS_COLORS.REFURBISHMENT}
                  radius={[10, 10, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="chart-card wide-chart heatmap-card">
          <div className="chart-header">
            <div>
              <p className="chart-kicker">Hourly Pattern</p>
              <h2>Park Wait Heatmap</h2>
            </div>
          </div>

          <div className="heatmap-wrapper">
            <div
              className="heatmap-grid"
              style={{ "--hour-count": heatmapHours.length }}
            >
              <div className="heatmap-row">
                <div className="heatmap-label">Park</div>

                {heatmapHours.map((hour) => (
                  <div className="heatmap-hour" key={hour}>
                    {hour}
                  </div>
                ))}
              </div>

              {heatmapParks.map((parkName) => (
                <div className="heatmap-row" key={parkName}>
                  <div className="heatmap-label">{parkName}</div>

                  {heatmapHours.map((hour) => {
                    const value = getHeatmapValue(parkName, hour);

                    return (
                      <div
                        className="heatmap-cell"
                        key={`${parkName}-${hour}`}
                        style={{
                          backgroundColor: getHeatmapColor(
                            value,
                            maxHeatmapWait
                          )
                        }}
                        title={`${parkName} ${hour}: ${
                          value === null ? "No data" : `${value} min`
                        }`}
                      >
                        {value === null ? "—" : value}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="heatmap-legend">
            <span>Shorter Wait</span>
            <div className="heatmap-gradient"></div>
            <span>Longer Wait</span>
          </div>

          <p className="heatmap-note">
            Green indicates shorter average waits, yellow indicates moderate
            waits, and red indicates longer waits.
          </p>
        </article>

        <article className="chart-card wide-chart">
          <div className="chart-header">
            <div>
              <p className="chart-kicker">Selected Ride Trend</p>
              <h2>
                {selectedRide === "All Rides"
                  ? "Select a Ride to View Hourly Wait Pattern"
                  : `${selectedRide} Wait by Hour`}
              </h2>
            </div>
          </div>

          <div className="chart-container">
            {selectedRide === "All Rides" ? (
              <div className="empty-state">
                Choose a ride from the Ride Filter dropdown to see how its
                average wait changes throughout the day.
              </div>
            ) : (
              <ResponsiveContainer>
                <LineChart
                  data={selectedRideHourlyData}
                  margin={{ top: 16, right: 24, left: 0, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="4 4" stroke="#26364f" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: "#b8c3d9", fontSize: 11 }}
                  />
                  <YAxis tick={{ fill: "#b8c3d9", fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="avg_wait_minutes"
                    stroke="#f5c542"
                    strokeWidth={4}
                    dot={{ r: 5, fill: "#f5c542" }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="chart-card wide-chart">
          <div className="chart-header">
            <div>
              <p className="chart-kicker">Ride-Level Pattern</p>
              <h2>Average Wait by Ride</h2>
            </div>
          </div>

          <div className="chart-container">
            <ResponsiveContainer>
              <BarChart data={filteredRideAverages.slice(0, 12)}>
                <CartesianGrid strokeDasharray="4 4" stroke="#26364f" />
                <XAxis
                  dataKey="ride_name"
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  height={100}
                  tick={{ fill: "#b8c3d9", fontSize: 11 }}
                />
                <YAxis tick={{ fill: "#b8c3d9", fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="avg_wait_minutes" radius={[10, 10, 0, 0]}>
                  {filteredRideAverages.slice(0, 12).map((entry) => (
                    <Cell
                      key={`${entry.ride_name}-${entry.park_name}`}
                      fill={PARK_COLORS[entry.park_name] || "#f5c542"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="chart-card wide-chart">
          <div className="chart-header">
            <div>
              <p className="chart-kicker">Trend Analysis</p>
              <h2>Average Wait by Hour</h2>
            </div>
          </div>

          <div className="chart-container">
            <ResponsiveContainer>
              <LineChart data={hourlyAverages}>
                <CartesianGrid strokeDasharray="4 4" stroke="#26364f" />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: "#b8c3d9", fontSize: 11 }}
                />
                <YAxis tick={{ fill: "#b8c3d9", fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="avg_wait_minutes"
                  stroke="#f5c542"
                  strokeWidth={4}
                  dot={{ r: 5, fill: "#f5c542" }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="table-card">
        <div className="chart-header">
          <div>
            <p className="chart-kicker">Latest Snapshot</p>
            <h2>Current Top Waits</h2>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ride</th>
                <th>Park</th>
                <th>Wait</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredTopWaits.slice(0, 15).map((ride) => (
                <tr key={`${ride.ride_name}-${ride.park_name}`}>
                  <td>{ride.ride_name}</td>
                  <td>
                    <span className="park-pill">{ride.park_name}</span>
                  </td>
                  <td>{ride.wait_minutes} min</td>
                  <td>{ride.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="insights-card">
        <div className="chart-header">
          <div>
            <p className="chart-kicker">Key Insights</p>
            <h2>What the Data Suggests Right Now</h2>
          </div>
        </div>

        <div className="insights-grid">
          <article className="insight-item">
            <h3>Highest Average Wait</h3>
            <p>{keyInsights.highestAverageRide?.ride_name || "—"}</p>
            <span>
              {keyInsights.highestAverageRide
                ? `${keyInsights.highestAverageRide.avg_wait_minutes} min average`
                : "Not enough data yet"}
            </span>
          </article>

          <article className="insight-item">
            <h3>Most Crowded Park</h3>
            <p>{keyInsights.mostCrowdedPark?.park_name || "—"}</p>
            <span>
              {keyInsights.mostCrowdedPark
                ? `${keyInsights.mostCrowdedPark.priority_weighted_wait} min headliner average`
                : "Not enough data yet"}
            </span>
          </article>

          <article className="insight-item">
            <h3>Least Crowded Park</h3>
            <p>{keyInsights.leastCrowdedPark?.park_name || "—"}</p>
            <span>
              {keyInsights.leastCrowdedPark
                ? `${keyInsights.leastCrowdedPark.priority_weighted_wait} min headliner average`
                : "Not enough data yet"}
            </span>
          </article>

          <article className="insight-item">
            <h3>Best Current Value</h3>
            <p>{keyInsights.bestCurrentValue?.ride_name || "—"}</p>
            <span>
              {keyInsights.bestCurrentValue
                ? `${keyInsights.bestCurrentValue.current_wait_minutes} min now · ${keyInsights.bestCurrentValue.typical_wait_minutes} min typical`
                : "Not enough data yet"}
            </span>
          </article>

          <article className="insight-item">
            <h3>Most Operating Attractions</h3>
            <p>{keyInsights.mostReliablePark?.park_name || "—"}</p>
            <span>
              {keyInsights.mostReliablePark
                ? `${keyInsights.mostReliablePark.OPERATING} operating attractions`
                : "Not enough data yet"}
            </span>
          </article>
        </div>
      </section>

      <section className="methodology-card">
        <div className="chart-header">
          <div>
            <p className="chart-kicker">Methodology</p>
            <h2>About This Data</h2>
          </div>
        </div>

        <div className="methodology-content">
          <div className="methodology-grid">
            <div className="methodology-item">
              <h3>Data Source</h3>
              <p>
                Attraction wait times and operating status are collected from
                the ThemeParks.wiki API, which aggregates live Walt Disney World
                attraction data.
              </p>
            </div>

            <div className="methodology-item">
              <h3>Collection Frequency</h3>
              <p>
                A Python data collection pipeline records attraction wait times
                every 15 minutes, creating a continuously growing historical
                dataset.
              </p>
            </div>

            <div className="methodology-item">
              <h3>Database</h3>
              <p>
                All observations are stored in a Supabase PostgreSQL database
                containing parks, rides, attraction status information, and
                historical wait-time records.
              </p>
            </div>

            <div className="methodology-item">
              <h3>Analysis Pipeline</h3>
              <p>
                PostgreSQL views and Python queries calculate park averages,
                ride averages, hourly patterns, operating status summaries, and
                best-time-to-ride metrics from the underlying dataset.
              </p>
            </div>

            <div className="methodology-item">
              <h3>Visualization</h3>
              <p>
                The dashboard is built with React and Recharts, allowing users
                to explore wait-time trends through interactive charts, filters,
                and heatmaps.
              </p>
            </div>

            <div className="methodology-item">
              <h3>Project Goal</h3>
              <p>
                The objective is to identify crowd patterns, discover the best
                times to ride attractions, compare park demand throughout the
                day, and demonstrate modern data analytics workflows using SQL,
                Python, React, and data visualization techniques.
              </p>
            </div>
          </div>

          <div className="methodology-note">
            <strong>Note:</strong> This dashboard becomes more accurate over
            time as additional wait-time observations are collected. Historical
            trends, ride forecasts, and crowd-pattern analysis improve as the
            dataset grows.
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;