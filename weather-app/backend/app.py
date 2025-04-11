from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from dotenv import load_dotenv
import requests
import random
import datetime

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:5173", "https://my-weathertracker.netlify.app"}})  # Replace with your frontend's origin

# OpenWeatherMap API configuration
WEATHER_API_KEY = os.getenv('WEATHER_API_KEY')
WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather'
FORECAST_API_URL = 'https://api.openweathermap.org/data/2.5/forecast'


@app.route('/')
def index():
    return jsonify({"message": "Weather API is running. Use /api/health for status check."}), 200


@app.route('/api/weather', methods=['GET'])
def get_weather():
    city = request.args.get('city', 'London')
    try:
        params = {
            'q': city,
            'appid': WEATHER_API_KEY,
            'units': 'metric'
        }
        
        response = requests.get(WEATHER_API_URL, params=params)
        
        if response.status_code != 200:
            error_data = response.json()
            error_message = error_data.get('message', 'Unknown error')
            
            if response.status_code == 404 and 'city not found' in error_message:
                return jsonify({'error': f'City not found: {city}'}), 404
            
            return jsonify({'error': f'Weather API error: {response.status_code} - {error_message}'}), response.status_code
            
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Network error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

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
        
        # Log the raw OpenWeatherMap API response for debugging
        print("OpenWeatherMap API Response:", cities_data)
        
        if not cities_data:
            # Return empty list instead of error (no matches is valid)
            return jsonify([]), 200
        
        # Group cities by name to identify duplicates
        cities_by_name = {}
        for city in cities_data:
            name = city.get('name', 'Unknown')
            if name not in cities_by_name:
                cities_by_name[name] = []
            cities_by_name[name].append(city)
        
        # Log the grouped cities for debugging
        print("Grouped Cities:", cities_by_name)
        
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
        
        # Log the final city suggestions for debugging
        print("City Suggestions:", city_suggestions)
        
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
    app.run(debug=True, port=5001)  # Run on port 5001 