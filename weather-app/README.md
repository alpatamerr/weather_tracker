# Weather Tracker App

A web application that provides real-time weather information and forecasts for cities worldwide.

## Features

*   **City Search:** Search for cities using autocomplete suggestions.
*   **Current Weather:** Displays current temperature, conditions, humidity, and wind speed for the searched city.
*   **7-Day Forecast:** Shows a summary forecast for the next 7 days.
*   **Hourly Forecast:** Provides a detailed hourly forecast view (accessible by clicking a day in the 7-day forecast) presented in both graph and table formats.
    *   Displays data at 4-hour intervals.
    *   Includes temperature trends, precipitation, conditions, and wind speed.
*   **Responsive Design:** Adapts to different screen sizes (desktop, tablet, mobile).

## Technologies Used

*   **Frontend:**
    *   React (using Vite)
    *   JavaScript (ES6+)
    *   Axios (for API requests)
    *   React Bootstrap & Bootstrap CSS
    *   FontAwesome (for icons)
    *   React Router
*   **Backend:**
    *   Python 3
    *   Flask (web framework)
    *   Flask-CORS (for handling Cross-Origin Resource Sharing)
    *   Requests (for making API calls to OpenWeatherMap)
    *   psycopg2-binary (for PostgreSQL interaction)
    *   python-dotenv (for environment variables)
*   **API:**
    *   OpenWeatherMap API (for weather data) 

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd weather-app
    ```

2.  **Backend Setup:**
    *   Navigate to the backend directory:
        ```bash
        cd backend
        ```
    *   Create a virtual environment (optional but recommended):
        ```bash
        python3 -m venv venv
        source venv/bin/activate  # On Windows use `venv\Scripts\activate`
        ```
    *   Create a `.env` file in the `backend` directory and add your OpenWeatherMap API key and database credentials:
        ```env
        WEATHER_API_KEY=YOUR_OPENWEATHERMAP_API_KEY

3.  **Frontend Setup:**
    *   Navigate to the frontend directory:
        ```bash
        cd ../frontend 
        ```
        (If you are still in the `backend` directory)
    *   Install frontend dependencies:
        ```bash
        npm install
        ```

4.  **Running the Application:**
    *   **Start the Backend Server:**
        Open a terminal in the `weather-app/backend` directory and run:
        ```bash
        python app.py
        ```
        The backend server will typically run on `http://localhost:5001`.
    *   **Start the Frontend Development Server:**
        Open another terminal in the `weather-app/frontend` directory and run:
        ```bash
        npm run dev
        ```
        The frontend application will be accessible, usually at `http://localhost:5173`.

## Important Notes

*   You need an API key from [OpenWeatherMap](https://openweathermap.org/) for the application to fetch weather data. Make sure to add it to the `.env` file in the `backend` directory.
*   The database features (user registration, login, history) are implemented in the backend but might require further UI integration to be fully usable.

## API Endpoints

- `GET /api/weather?city={city_name}` - Get current weather for a city

## Technologies Used

- Frontend: React, Vite, Bootstrap
- Backend: Flask, Python
- API: OpenWeatherMap 
