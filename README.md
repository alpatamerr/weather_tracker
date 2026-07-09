# Weather Tracker

A simple weather application with a React frontend and a Flask backend. It lets users search for cities, view current weather, and explore short-term forecasts.

## Features

- City search with suggestions
- Current weather details
- 7-day forecast summary
- Hourly forecast view
- Responsive UI

## Project Structure

- `frontend/` — Vite + React app
- `backend/` — Flask API server
- `netlify.toml` — Netlify build configuration

## Setup

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file inside `backend/` with:

```env
WEATHER_API_KEY=your_openweather_api_key
```

Run the backend:

```bash
python app.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Build

```bash
cd frontend
npm run build
```

## Deployment

The app is configured for Netlify using the frontend folder as the build base.

