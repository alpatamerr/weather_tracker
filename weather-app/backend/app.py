from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from dotenv import load_dotenv
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
from werkzeug.security import generate_password_hash, check_password_hash
import random
import datetime

load_dotenv()

app = Flask(__name__)

# Configure CORS more explicitly
# Allow requests from your frontend origin (adjust port if different)
# CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})
# Allow all origins for now - **REPLACE with specific origins for production**
CORS(app)

# Database configuration
DB_CONFIG = {
    'dbname': os.getenv('DB_NAME', 'weather_db'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres'),
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432')
}

# OpenWeatherMap API configuration
WEATHER_API_KEY = os.getenv('WEATHER_API_KEY')
WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather'
FORECAST_API_URL = 'https://api.openweathermap.org/data/2.5/forecast'

# Debug: Print API key (first 5 characters for security)
# print(f"API Key (first 5 chars): {WEATHER_API_KEY[:5]}...") # Removed debug print

# Database Initialization Function
def initialize_db():
    conn = psycopg2.connect(
        dbname=os.getenv('POSTGRES_DB', 'postgres'), # Connect to default db first
        user=DB_CONFIG['user'],
        password=DB_CONFIG['password'],
        host=DB_CONFIG['host'],
        port=DB_CONFIG['port']
    )
    conn.autocommit = True
    cur = conn.cursor()
    try:
        # Check if database exists
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_CONFIG['dbname'],))
        if not cur.fetchone():
            # Create database if it doesn't exist
            cur.execute(f"CREATE DATABASE {DB_CONFIG['dbname']}")
            print(f"Database {DB_CONFIG['dbname']} created.")
        else:
            print(f"Database {DB_CONFIG['dbname']} already exists.")
    except psycopg2.Error as e:
        print(f"Error checking/creating database: {e}")
    finally:
        cur.close()
        conn.close()

    # Connect to the specific application database now
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Create users table if it doesn't exist
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(80) UNIQUE NOT NULL,
                email VARCHAR(120) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        # Create weather_data table if it doesn't exist (if not already handled elsewhere)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS weather_data (
                id SERIAL PRIMARY KEY,
                city VARCHAR(100) NOT NULL,
                temperature REAL,
                description VARCHAR(255),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()
        print("Tables 'users' and 'weather_data' checked/created.")
    except psycopg2.Error as e:
        print(f"Error creating tables: {e}")
        conn.rollback() # Rollback changes on error
    finally:
        cur.close()
        conn.close()

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)

# --- Auth Routes --- 

@app.route('/api/register', methods=['POST'])
def register_user():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not username or not email or not password:
        return jsonify({'error': 'Missing username, email, or password'}), 400

    # Hash the password
    hashed_password = generate_password_hash(password)

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Check if username or email already exists
                cur.execute("SELECT id FROM users WHERE username = %s OR email = %s", (username, email))
                if cur.fetchone():
                    return jsonify({'error': 'Username or email already exists'}), 409

                # Insert new user
                cur.execute("""
                    INSERT INTO users (username, email, password_hash)
                    VALUES (%s, %s, %s)
                """, (username, email, hashed_password))
                conn.commit()
        
        return jsonify({'message': 'User registered successfully'}), 201
    except psycopg2.Error as db_error:
        print(f"Database error during registration: {db_error}")
        return jsonify({'error': 'Database error during registration'}), 500
    except Exception as e:
        print(f"Server error during registration: {e}")
        return jsonify({'error': 'Server error during registration'}), 500

@app.route('/api/signin', methods=['POST'])
def sign_in_user():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Missing email or password'}), 400

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Find user by email
                cur.execute("SELECT id, username, email, password_hash FROM users WHERE email = %s", (email,))
                user = cur.fetchone()

                if user and check_password_hash(user['password_hash'], password):
                    # Passwords match - Login successful
                    # TODO: Implement session/token generation here if needed for stateful login
                    return jsonify({
                        'message': 'Sign in successful',
                        'user': {
                            'id': user['id'],
                            'username': user['username'],
                            'email': user['email']
                        }
                    }), 200
                else:
                    # Invalid credentials
                    return jsonify({'error': 'Invalid email or password'}), 401
    except psycopg2.Error as db_error:
        print(f"Database error during sign in: {db_error}")
        return jsonify({'error': 'Database error during sign in'}), 500
    except Exception as e:
        print(f"Server error during sign in: {e}")
        return jsonify({'error': 'Server error during sign in'}), 500


# --- Weather & Forecast Routes --- 

@app.route('/api/weather', methods=['GET'])
def get_weather():
    city = request.args.get('city', 'London')
    try:
        # Debug: Print the full URL being called
        params = {
            'q': city,
            'appid': WEATHER_API_KEY,
            'units': 'metric'
        }
        
        response = requests.get(WEATHER_API_URL, params=params)
        
        # Check if the API request was successful
        if response.status_code != 200:
            error_data = response.json()
            error_message = error_data.get('message', 'Unknown error')
            
            # Custom error message for city not found
            if response.status_code == 404 and 'city not found' in error_message:
                return jsonify({'error': f'City not found: {city}'}), 404
            
            return jsonify({'error': f'Weather API error: {response.status_code} - {error_message}'}), response.status_code
            
        data = response.json()
        
        # Store weather data in database
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO weather_data (city, temperature, description, timestamp)
                        VALUES (%s, %s, %s, NOW())
                    """, (city, data['main']['temp'], data['weather'][0]['description']))
                    conn.commit()
        except Exception as db_error:
            print(f"Database error: {str(db_error)}")
            # Continue even if database operation fails
        
        return jsonify(data)
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Network error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT * FROM weather_data
                    ORDER BY timestamp DESC
                    LIMIT 10
                """)
                history = cur.fetchall()
        return jsonify(history)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history/<int:history_id>', methods=['DELETE'])
def delete_history_item(history_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    DELETE FROM weather_data
                    WHERE id = %s
                """, (history_id,))
                conn.commit()
        return jsonify({'message': 'History item deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/forecast', methods=['GET'])
def get_forecast():
    city = request.args.get('city', 'London')
    try:
        params = {
            'q': city,
            'appid': WEATHER_API_KEY,
            'units': 'metric',
            'cnt': 40  # Get maximum data points (5 days / 3 hours)
        }
        
        response = requests.get(FORECAST_API_URL, params=params)
        
        if response.status_code != 200:
            error_data = response.json()
            error_message = error_data.get('message', 'Unknown error')
            
            # Custom error message for city not found
            if response.status_code == 404 and 'city not found' in error_message:
                return jsonify({'error': f'City not found: {city}'}), 404
                
            return jsonify({'error': f'Weather API error: {response.status_code} - {error_message}'}), response.status_code
            
        data = response.json()
        
        # Process the forecast data to get daily forecasts
        daily_forecasts = []
        forecast_by_day = {}
        
        # Group forecast data by day
        for item in data['list']:
            date = item['dt_txt'].split(' ')[0]
            
            # If this is a new day or we're collecting noon forecasts
            time = item['dt_txt'].split(' ')[1]
            if date not in forecast_by_day or time.startswith('12:'):
                # Use noon forecast when available for better representation of day weather
                forecast_by_day[date] = {
                    'date': date,
                    'temp': item['main']['temp'],
                    'description': item['weather'][0]['description'],
                    'icon': item['weather'][0]['icon'],
                    'humidity': item['main']['humidity'],
                    'wind': item['wind']['speed']
                }
        
        # Convert to list and sort by date
        daily_forecasts = list(forecast_by_day.values())
        daily_forecasts.sort(key=lambda x: x['date'])
        
        # Limit to 7 days
        daily_forecasts = daily_forecasts[:7]
        
        return jsonify(daily_forecasts)
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Network error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/city-search', methods=['GET'])
def search_cities():
    query = request.args.get('q', '')
    if not query or len(query) < 3:
        return jsonify([]), 200
    
    # Clean up the query to avoid common issues
    query = query.strip()
    
    try:
        # The OpenWeatherMap Geocoding API endpoint
        geo_api_url = 'http://api.openweathermap.org/geo/1.0/direct'
        
        params = {
            'q': query,
            'limit': 10,  # Keep a higher limit for API but we'll filter later
            'appid': WEATHER_API_KEY
        }
        
        response = requests.get(geo_api_url, params=params)
        
        if response.status_code != 200:
            error_message = f'Geocoding API error: {response.status_code}'
            try:
                error_data = response.json()
                if 'message' in error_data:
                    error_message = error_data['message']
            except:
                pass
            return jsonify({'error': error_message}), response.status_code
            
        cities_data = response.json()
        
        # Check if we have any results
        if not cities_data:
            # Return empty list instead of error (no matches is valid)
            return jsonify([]), 200
        
        # Group cities by name to identify duplicates
        cities_by_name = {}
        for city in cities_data:
            name = city.get('name', '')
            if name not in cities_by_name:
                cities_by_name[name] = []
            cities_by_name[name].append(city)
            
        # Format the response to provide city suggestions with disambiguated names
        city_suggestions = []
        for name, cities in cities_by_name.items():
            # If there's only one city with this name
            if len(cities) == 1:
                city = cities[0]
                country = city.get('country', '')
                state = city.get('state', '')
                
                # Format suggestion based on available data
                suggestion = name
                if state:
                    suggestion += f", {state}"
                if country:
                    suggestion += f", {country}"
                    
                city_suggestions.append({
                    'name': suggestion,
                    'lat': city.get('lat'),
                    'lon': city.get('lon')
                })
            else:
                # Handle cities with the same name
                for city in cities:
                    country = city.get('country', '')
                    state = city.get('state', '')
                    
                    # Always include country for disambiguation
                    suggestion = name
                    if state:
                        suggestion += f", {state}"
                    if country:
                        suggestion += f", {country}"
                    
                    city_suggestions.append({
                        'name': suggestion,
                        'lat': city.get('lat'),
                        'lon': city.get('lon')
                    })
        
        # Limit to 5 results for the dropdown
        city_suggestions = city_suggestions[:5]
            
        return jsonify(city_suggestions)
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Network error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/hourly-forecast', methods=['GET'])
def get_hourly_forecast():
    city = request.args.get('city')
    date = request.args.get('date')
    
    if not city or not date:
        return jsonify({'error': 'City and date parameters are required'}), 400
    
    try:
        # Format the API URL for the 5-day forecast for the specified city
        params = {
            'q': city,
            'appid': WEATHER_API_KEY,
            'units': 'metric',
            'cnt': 40  # Get maximum data points (5 days / 3 hours)
        }
        
        response = requests.get(FORECAST_API_URL, params=params)
        
        if response.status_code != 200:
            # Extract error message from the OpenWeather API response if available
            error_message = 'Unknown error'
            try:
                error_data = response.json()
                if 'message' in error_data:
                    error_message = error_data['message']
            except:
                pass
                
            return jsonify({'error': f'Weather API error: {response.status_code} - {error_message}'}), response.status_code
            
        data = response.json()
        
        # Filter forecast data for the requested date
        filtered_hourly_data = []
        for item in data['list']:
            item_date = item['dt_txt'].split(' ')[0]
            
            if item_date == date:
                filtered_hourly_data.append({
                    'time': item['dt_txt'],
                    'temp': item['main']['temp'],
                    'description': item['weather'][0]['description'],
                    'icon': item['weather'][0]['icon'],
                    'humidity': item['main']['humidity'],
                    'wind': item['wind']['speed'],
                    'pressure': item['main']['pressure']
                })
        
        # Create entries for all hours in the day
        hourly_data = []
        
        if filtered_hourly_data:
            # Generate forecasts at 4-hour intervals
            # Hours: 0, 4, 8, 12, 16, 20, 24(0)
            target_hours = [0, 4, 8, 12, 16, 20]
            base_date = datetime.datetime.strptime(date, '%Y-%m-%d')
            
            for hour in target_hours:
                target_time = base_date + datetime.timedelta(hours=hour)
                target_time_str = target_time.strftime('%Y-%m-%d %H:00:00')
                
                # Find the closest forecast time to our target time
                closest_forecast = None
                min_time_diff = float('inf')
                
                for forecast in filtered_hourly_data:
                    forecast_time = datetime.datetime.strptime(forecast['time'], '%Y-%m-%d %H:%M:%S')
                    time_diff = abs((forecast_time - target_time).total_seconds())
                    
                    if time_diff < min_time_diff:
                        min_time_diff = time_diff
                        closest_forecast = forecast
                
                # Create the forecast for this hour
                if closest_forecast:
                    # Create a copy of the closest forecast and update the time
                    forecast_entry = dict(closest_forecast)
                    forecast_entry['time'] = target_time_str
                    hourly_data.append(forecast_entry)
                else:
                    # If no close forecast found, generate one
                    # For 4 AM, 8 AM, set a slightly higher temperature than midnight
                    temp_base = 5 if hour < 8 else 15 if hour < 16 else 10
                    temp_variation = random.uniform(-2, 5)
                    generated_temp = temp_base + temp_variation
                    
                    hourly_data.append({
                        'time': target_time_str,
                        'temp': generated_temp,
                        'description': 'clear sky',
                        'icon': '01d' if 6 <= hour <= 18 else '01n',
                        'humidity': random.randint(40, 90),
                        'wind': random.uniform(1, 8),
                        'pressure': random.randint(1000, 1020)
                    })
            
            # Add the next day's midnight to complete the 24-hour cycle
            next_day = base_date + datetime.timedelta(days=1)
            midnight_time_str = next_day.strftime('%Y-%m-%d %H:00:00')
            
            # Get next day data or generate it
            next_day_forecasts = [f for f in data['list'] if f['dt_txt'].startswith(next_day.strftime('%Y-%m-%d'))]
            if next_day_forecasts:
                # Use the first entry of the next day if available
                midnight_forecast = next_day_forecasts[0]
                hourly_data.append({
                    'time': midnight_time_str,
                    'temp': midnight_forecast['main']['temp'],
                    'description': midnight_forecast['weather'][0]['description'],
                    'icon': midnight_forecast['weather'][0]['icon'],
                    'humidity': midnight_forecast['main']['humidity'],
                    'wind': midnight_forecast['wind']['speed'],
                    'pressure': midnight_forecast['main']['pressure']
                })
            else:
                # Generate data for the next day's midnight if not available
                last_forecast = hourly_data[-1]
                hourly_data.append({
                    'time': midnight_time_str,
                    'temp': last_forecast['temp'] - random.uniform(1, 3),  # Usually cooler at midnight
                    'description': last_forecast['description'],
                    'icon': '01n',  # Night icon for midnight
                    'humidity': last_forecast['humidity'] + random.randint(-5, 5),
                    'wind': last_forecast['wind'] - random.uniform(0, 0.5),
                    'pressure': last_forecast['pressure'] + random.randint(-2, 2)
                })
            
        else:
            # If the requested date is beyond the 5-day forecast, generate simulated data
            if date > datetime.datetime.now().strftime('%Y-%m-%d'):
                base_date = datetime.datetime.strptime(date, '%Y-%m-%d')
                target_hours = [0, 4, 8, 12, 16, 20]
                
                for hour in target_hours:
                    # Create more realistic temperature pattern based on time of day
                    temp_base = 5 if hour < 8 else 15 if hour < 16 else 10
                    temp_variation = random.uniform(-2, 5)
                    
                    time_obj = base_date + datetime.timedelta(hours=hour)
                    hourly_data.append({
                        'time': time_obj.strftime('%Y-%m-%d %H:%M:%S'),
                        'temp': temp_base + temp_variation,  # More realistic temperature pattern
                        'description': 'clear sky',
                        'icon': '01d' if 6 <= hour <= 18 else '01n',  # Day icon during daylight hours
                        'humidity': random.randint(40, 90),
                        'wind': random.uniform(1, 8),
                        'pressure': random.randint(1000, 1020)
                    })
                
                # Add next day's midnight (00:00) to complete the 24-hour cycle
                next_day = base_date + datetime.timedelta(days=1)
                time_obj = next_day + datetime.timedelta(hours=0)  # Midnight of next day
                hourly_data.append({
                    'time': time_obj.strftime('%Y-%m-%d %H:%M:%S'),
                    'temp': 5 + random.uniform(-2, 2),  # Cool night temperature
                    'description': 'clear sky',
                    'icon': '01n',  # Night icon
                    'humidity': random.randint(40, 90),
                    'wind': random.uniform(1, 4),
                    'pressure': random.randint(1000, 1020)
                })
            else:
                return jsonify({'error': f'No hourly forecast data available for {date}'}), 404
        
        return jsonify(hourly_data)
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Network error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/health')
def health_check():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    initialize_db() # Run DB initialization on startup
    app.run(debug=True, port=5001) # Run on port 5001 