# Disney Wait Time Analytics

A live data analytics dashboard that tracks Walt Disney World attraction wait times, operating status, park crowd patterns, and ride-level trends using Python, SQLite, SQL views, React, and Recharts.

## Project Overview

This project collects live Walt Disney World attraction data from the ThemeParks.wiki API and stores recurring wait-time snapshots in a SQLite database. The dashboard visualizes current waits, park-level crowd patterns, attraction value scores, hourly trends, and historical crowd forecasts.

The goal is to combine front-end development, UX design, SQL analysis, and automated data collection into a portfolio-ready analytics product.

## Features

- Live wait-time dashboard for all 4 Walt Disney World parks
- 15-minute Python data collection loop
- SQLite database with parks, rides, wait times, and attraction priority scores
- SQL views for average waits, ride trends, status counts, crowd forecasts, and value scoring
- React dashboard with Recharts visualizations
- Park and ride filters
- Park/hour heatmap
- Selected ride hourly trend chart
- Best Time to Ride metric
- Best Current Value attraction metric
- Headliner-weighted Most/Least Crowded Park insights
- Crowd Forecast using historical hourly averages
- Methodology section explaining the data pipeline

## Tech Stack

- React
- Vite
- Recharts
- Python
- SQLite
- SQL
- ThemeParks.wiki API
- HTML/CSS
- JavaScript

## Data Pipeline

```text
ThemeParks.wiki API
        ↓
Python collector
        ↓
SQLite database
        ↓
SQL views
        ↓
JSON exports
        ↓
React dashboard