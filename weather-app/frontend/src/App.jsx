import { useState, useEffect, useRef } from 'react'
import { Container, Row, Col, Card, Form, Button, ListGroup, Alert, InputGroup, Dropdown } from 'react-bootstrap'
import axios from 'axios'
import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faThermometerHalf, faTint, faWind, faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom'

// Component for the Homepage
function HomePage() {
  const [city, setCity] = useState('')
  const [weather, setWeather] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [citySuggestions, setCitySuggestions] = useState([])
  const [searchActive, setSearchActive] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchContainerRef = useRef(null)
  const navigate = useNavigate()

  const API_URL = 'http://localhost:5001/api'

  const getWeatherIcon = (weatherCode) => {
    const iconMap = {
      '01d': '☀️', // clear sky (day)
      '01n': '🌙', // clear sky (night)
      '02d': '⛅', // few clouds (day)
      '02n': '☁️', // few clouds (night)
      '03d': '☁️', // scattered clouds
      '03n': '☁️',
      '04d': '☁️', // broken clouds
      '04n': '☁️',
      '09d': '🌧️', // shower rain
      '09n': '🌧️',
      '10d': '🌦️', // rain (day)
      '10n': '🌧️', // rain (night)
      '11d': '⛈️', // thunderstorm
      '11n': '⛈️',
      '13d': '❄️', // snow
      '13n': '❄️',
      '50d': '🌫️', // mist
      '50n': '🌫️'
    }
    return iconMap[weatherCode] || '🌤️'
  }

  const fetchWeather = async (cityName) => {
    setLoading(true)
    setError('')
    try {
      const response = await axios.get(`${API_URL}/weather?city=${cityName}`)
      setWeather(response.data)
      
      // Navigate to forecast page after getting weather
      navigate(`/forecast/${encodeURIComponent(cityName)}`)
    } catch (err) {
      let errorMessage = err.response?.data?.error || 'Error fetching weather data'
      
      // More user-friendly error message for city not found
      if (errorMessage.includes('city not found')) {
        errorMessage = `We couldn't find "${cityName}". Please check the spelling or try another city.`
      }
      
      setError(errorMessage)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (city.trim()) {
      fetchWeather(city)
    }
  }

  // Handle city suggestions
  const handleCityInputChange = (e) => {
    const cityName = e.target.value
    setCity(cityName)
    setSearchActive(true)
    setSelectedIndex(-1)
    
    if (cityName.length > 2) {
      // Call the city search API endpoint
      setSearchLoading(true)
      axios.get(`${API_URL}/city-search?q=${cityName}`)
        .then(response => {
          // Use full city data with location details
          setCitySuggestions(response.data)
        })
        .catch(err => {
          console.error('Error fetching city suggestions:', err)
          setCitySuggestions([])
        })
        .finally(() => {
          setSearchLoading(false)
        })
    } else {
      setCitySuggestions([])
    }
  }

  const handleKeyDown = (e) => {
    if (!searchActive || citySuggestions.length === 0) return;
    
    // Arrow down
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < citySuggestions.length - 1 ? prev + 1 : 0
      );
    }
    // Arrow up
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev > 0 ? prev - 1 : citySuggestions.length - 1
      );
    }
    // Enter to select
    else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      selectCity(citySuggestions[selectedIndex]);
    }
  };

  const handleInputFocus = () => {
    setSearchActive(true)
    if (city.length > 2) {
      handleCityInputChange({ target: { value: city } })
    }
  }

  const selectCity = (selectedCity) => {
    setCity(selectedCity.name)
    setCitySuggestions([])
    setSearchActive(false)
    setSelectedIndex(-1)
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchActive(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [searchContainerRef])

  return (
    <div className="weather-container">
      <Card className="weather-card">
        <Card.Body>
          <h2 className="card-title text-center">Weather Tracker</h2>
          <p className="text-center">
            Today {currentTime.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
          </p>
          
          <p className="text-center mb-4">
            Access real-time weather updates and 6-day forecasts for over 200,000 cities worldwide!
          </p>
          
          <Form onSubmit={handleSubmit} className="mb-4">
            <div className="position-relative" ref={searchContainerRef}>
              <InputGroup className="mb-3">
                <Form.Control
                  type="text"
                  placeholder="Search for cities"
                  value={city}
                  onChange={handleCityInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  aria-label="Search for cities"
                  autoComplete="off"
                  onFocus={handleInputFocus}
                />
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? 'Loading...' : 'Get Weather'}
                </Button>
              </InputGroup>
              
              {searchActive && city.length > 0 && (
                <div className="city-suggestions-dropdown">
                  {searchLoading ? (
                    <div className="city-suggestion-item">
                      <div className="d-flex align-items-center justify-content-center">
                        <span className="me-2">Searching cities...</span>
                        <div className="search-loading-dots">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  ) : citySuggestions.length > 0 ? (
                    citySuggestions.map((suggestion, index) => (
                      <div 
                        key={index} 
                        className={`city-suggestion-item ${selectedIndex === index ? 'selected' : ''}`}
                        onClick={() => selectCity(suggestion)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        {suggestion.name}
                      </div>
                    ))
                  ) : city.length > 2 ? (
                    <div className="city-suggestion-item disabled">
                      No matching cities found
                    </div>
                  ) : (
                    <div className="city-suggestion-item disabled">
                      Type at least 3 characters to search
                    </div>
                  )}
                </div>
              )}
            </div>
          </Form>

          {error && (
            <Alert variant="danger" className="mb-4">
              {error}
            </Alert>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}

// Component for the Forecast Page
function ForecastPage() {
  const { city } = useParams()
  const [weather, setWeather] = useState(null)
  const [forecast, setForecast] = useState([])
  const [hourlyForecast, setHourlyForecast] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const navigate = useNavigate()

  const API_URL = 'http://localhost:5001/api'

  const getWeatherIcon = (weatherCode) => {
    const iconMap = {
      '01d': '☀️', // clear sky (day)
      '01n': '🌙', // clear sky (night)
      '02d': '⛅', // few clouds (day)
      '02n': '☁️', // few clouds (night)
      '03d': '☁️', // scattered clouds
      '03n': '☁️',
      '04d': '☁️', // broken clouds
      '04n': '☁️',
      '09d': '🌧️', // shower rain
      '09n': '🌧️',
      '10d': '🌦️', // rain (day)
      '10n': '🌧️', // rain (night)
      '11d': '⛈️', // thunderstorm
      '11n': '⛈️',
      '13d': '❄️', // snow
      '13n': '❄️',
      '50d': '🌫️', // mist
      '50n': '🌫️'
    }
    return iconMap[weatherCode] || '🌤️'
  }

  const fetchForecast = async (cityName) => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/forecast?city=${cityName}`)
      setForecast(response.data)
      
      // Also fetch current weather
      const weatherResponse = await axios.get(`${API_URL}/weather?city=${cityName}`)
      setWeather(weatherResponse.data)
    } catch (err) {
      let errorMessage = err.response?.data?.error || 'Error fetching forecast data'
      
      // More user-friendly error message for city not found
      if (errorMessage.includes('city not found') || errorMessage.includes('City not found')) {
        errorMessage = `We couldn't find "${cityName}". Please try another city.`
        
        // Redirect back to home page after a short delay
        setRedirecting(true)
        setTimeout(() => {
          navigate('/')
        }, 3000)
      }
      
      setError(errorMessage)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchHourlyForecast = async (cityName, date) => {
    try {
      const response = await axios.get(`${API_URL}/hourly-forecast?city=${cityName}&date=${date}`)
      // Set the hourly forecast data directly
      setHourlyForecast(response.data);
      setSelectedDay(date);
    } catch (err) {
      console.error('Error fetching hourly forecast:', err);
      setHourlyForecast([]);
    }
  };

  const handleDayClick = (day) => {
    fetchHourlyForecast(city, day.date)
  }

  const closeHourlyForecast = () => {
    setHourlyForecast([])
    setSelectedDay(null)
  }

  const formatTimeDisplay = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    const hours = date.getHours();
    
    // For the next day's midnight, show as "12 AM (next day)"
    const isNextDayMidnight = date.getDate() !== new Date(selectedDay).getDate() && hours === 0;
    
    if (hours === 0) {
      return isNextDayMidnight ? "12 AM (next day)" : "12 AM";
    } else if (hours === 12) {
      return "12 PM";
    } else if (hours > 12) {
      return `${hours - 12} PM`;
    } else {
      return `${hours} AM`;
    }
  };

  useEffect(() => {
    if (city) {
      fetchForecast(city)
    }
  }, [city])

  return (
    <div className="weather-container">
      {/* Today's Weather Card */}
      <Card className="weather-card mb-4">
        <Card.Body>
          <h2 className="card-title text-center">Weather Tracker</h2>
          <p className="text-center">
            Today {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
          </p>

          {loading && <p className="text-center">Loading...</p>}
          
          {error && (
            <Alert variant="danger" className="mb-4">
              {error}
              {redirecting && <div className="mt-2">Redirecting to home page...</div>}
            </Alert>
          )}

          {weather && !error && (
            <div>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h2 className="mb-0">{weather.name}</h2>
                <div className="d-flex align-items-center">
                  <span className="display-4 me-2">
                    {getWeatherIcon(weather.weather[0].icon)}
                  </span>
                  <span className="description">
                    {weather.weather[0].description}
                  </span>
                </div>
              </div>
              <div className="weather-details">
                <p className="temperature">
                  <FontAwesomeIcon icon={faThermometerHalf} /> {Math.round(weather.main.temp)}°C
                </p>
                <div className="d-flex justify-content-between mt-3">
                  <p><FontAwesomeIcon icon={faTint} /> Humidity: {weather.main.humidity}%</p>
                  <p><FontAwesomeIcon icon={faWind} /> Wind: {weather.wind.speed} m/s</p>
                </div>
              </div>
            </div>
          )}
          
          <Link to="/" className="btn btn-secondary mt-3">Back to Search</Link>
        </Card.Body>
      </Card>

      {/* Hourly Forecast Modal */}
      {hourlyForecast.length > 0 && selectedDay && (
        <div className="hourly-forecast-overlay">
          <div className="hourly-forecast-modal">
            <div className="hourly-forecast-header">
              <h3>Hourly Forecast for {new Date(selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
              <button 
                type="button" 
                className="btn-close" 
                aria-label="Close" 
                onClick={closeHourlyForecast}
              ></button>
            </div>
            <div className="hourly-forecast-content">
              {/* Temperature Graph */}
              <div className="temperature-chart-container">
                <h4 className="chart-title">Hourly forecast</h4>
                {hourlyForecast.length > 0 && (
                  <>
                    <div className="time-labels">
                      {hourlyForecast.map((hour, index) => (
                        <div key={`time-${index}`} className="time-label">
                          {formatTimeDisplay(hour.time)}
                        </div>
                      ))}
                    </div>
                    <div className="temperature-chart">
                      <div className="y-axis">
                        <div className="y-label">30°</div>
                        <div className="y-label">20°</div>
                        <div className="y-label">10°</div>
                        <div className="y-label">0°</div>
                      </div>
                      <div className="chart-area">
                        <svg className="temp-graph" viewBox={`0 0 ${hourlyForecast.length * 100} 120`} preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="temp-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#ff7043" />
                              <stop offset="100%" stopColor="#ff7043" stopOpacity="0.5" />
                            </linearGradient>
                          </defs>
                          {hourlyForecast.length > 1 && (
                            <polyline
                              points={hourlyForecast.map((hour, i) => {
                                // Center point within each column (width = 100)
                                const x = (i * 100) + 50;
                                const y = 120 - (Math.min(Math.max(hour.temp, 0), 30) / 30 * 100);
                                return `${x},${y}`;
                              }).join(' ')}
                              fill="none"
                              stroke="#ff7043"
                              strokeWidth="3"
                            />
                          )}
                        </svg>
                        <div className="precipitation-row">
                          {hourlyForecast.map((hour, index) => (
                            <div key={`precip-${index}`} className="precip-value">0%</div>
                          ))}
                        </div>
                        <div className="description-row">
                          {hourlyForecast.map((hour, index) => (
                            <div key={`desc-${index}`} className="weather-desc">{hour.description}</div>
                          ))}
                        </div>
                        <div className="wind-row">
                          {hourlyForecast.map((hour, index) => (
                            <div key={`wind-${index}`} className="wind-value">{hour.wind.toFixed(1)}m/s</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* Hourly Tabular Forecast */}
              <div className="hourly-table-container">
                <table className="hourly-forecast-table">
                  <thead>
                    <tr>
                      <th className="time-column">Time</th>
                      <th className="temp-column">Temp</th>
                      <th className="desc-column">Conditions</th>
                      <th className="precip-column">Humidity</th>
                      <th className="wind-column">Wind</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hourlyForecast.map((hour, index) => (
                      <tr key={index} className="hourly-row">
                        <td className="time-cell" data-label="Time">
                          {formatTimeDisplay(hour.time)}
                        </td>
                        <td className="temp-cell" data-label="Temp">
                          {Math.round(hour.temp)}°C
                        </td>
                        <td className="desc-cell" data-label="Conditions">
                          {hour.description}
                        </td>
                        <td className="precip-cell" data-label="Humidity">
                          <FontAwesomeIcon icon={faTint} /> {hour.humidity}%
                        </td>
                        <td className="wind-cell" data-label="Wind">
                          <FontAwesomeIcon icon={faWind} /> {hour.wind.toFixed(1)} m/s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7-Day Forecast Card */}
      {forecast.length > 0 && (
        <Card className="forecast-card">
          <Card.Body>
            <h3 className="text-center mb-4">
              {weather ? `Next 7 days for ${weather.name}` : '7-Day Forecast'}
            </h3>
            <p className="text-center text-muted mb-4">
              <small>
                <FontAwesomeIcon icon={faInfoCircle} className="me-1" />
                Click on any day to see detailed hourly forecast
              </small>
            </p>
            <div className="forecast-list">
              {forecast.map((day, index) => (
                <div 
                  key={index} 
                  className={`forecast-item ${selectedDay === day.date ? 'active' : ''}`}
                  onClick={() => handleDayClick(day)}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</strong>
                      <div className="text-muted">
                        {day.description}
                      </div>
                      <div className="mt-2">
                        <small>
                          <FontAwesomeIcon icon={faTint} /> {day.humidity}% &nbsp;
                          <FontAwesomeIcon icon={faWind} /> {day.wind} m/s
                        </small>
                      </div>
                    </div>
                    <div className="d-flex align-items-center">
                      <span className="display-6 me-2">
                        {getWeatherIcon(day.icon)}
                      </span>
                      <span className="temperature">
                        {Math.round(day.temp)}°C
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  )
}

function App() {
  return (
    <Router>
      <div className="page-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/forecast/:city" element={<ForecastPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
