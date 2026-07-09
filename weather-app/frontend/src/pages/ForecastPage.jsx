import { useCallback, useEffect, useState } from 'react'
import { Alert, Card } from 'react-bootstrap'
import axios from 'axios'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faInfoCircle, faTint, faThermometerHalf, faWind } from '@fortawesome/free-solid-svg-icons'
import { getWeatherIcon } from '../utils/weather'

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

  const BACKEND_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'

  const fetchForecast = useCallback(async (cityName) => {
    setLoading(true)
    setRedirecting(false)
    setError('')
    try {
      const response = await axios.get(`${BACKEND_API_BASE_URL}/api/forecast?city=${cityName}`)
      setForecast(response.data)

      const weatherResponse = await axios.get(`${BACKEND_API_BASE_URL}/api/weather?city=${cityName}`)
      setWeather(weatherResponse.data)
    } catch (err) {
      let errorMessage = err.response?.data?.error || 'Error fetching forecast data'

      if (errorMessage.includes('city not found') || errorMessage.includes('City not found')) {
        errorMessage = `We couldn't find "${cityName}". Please try another city.`
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
  }, [BACKEND_API_BASE_URL, navigate])

  const fetchHourlyForecast = async (cityName, date) => {
    try {
      const response = await axios.get(`${BACKEND_API_BASE_URL}/api/hourly-forecast?city=${cityName}&date=${date}`)
      setHourlyForecast(response.data)
      setSelectedDay(date)
    } catch (err) {
      console.error('Error fetching hourly forecast:', err)
      setHourlyForecast([])
    }
  }

  const handleDayClick = (day) => {
    fetchHourlyForecast(city, day.date)
  }

  const closeHourlyForecast = () => {
    setHourlyForecast([])
    setSelectedDay(null)
  }

  const formatTimeDisplay = (dateTimeStr) => {
    const date = new Date(dateTimeStr)
    const hours = date.getHours()
    const isNextDayMidnight = date.getDate() !== new Date(selectedDay).getDate() && hours === 0

    if (hours === 0) {
      return isNextDayMidnight ? '12 AM (next day)' : '12 AM'
    }
    if (hours === 12) {
      return '12 PM'
    }
    if (hours > 12) {
      return `${hours - 12} PM`
    }
    return `${hours} AM`
  }

  useEffect(() => {
    if (city) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchForecast(city)
    }
  }, [city, fetchForecast])

  return (
    <main className="weather-container" role="main">
      <Card className="weather-card mb-4">
        <Card.Body>
          <h2 className="card-title text-center">Weather Tracker</h2>
          <p className="text-center">
            Today {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
          </p>

          {loading && <p className="text-center">Loading...</p>}

          {error && (
            <Alert variant="danger" className="mb-4" aria-live="polite">
              {error}
              {redirecting && <div className="mt-2">Redirecting to home page...</div>}
            </Alert>
          )}

          {weather && !error && (
            <div className="top-summary-grid mb-4">
              <div className="top-summary-block">
                <h2 className="mb-2">{weather.name}</h2>
                <p className="top-summary-label">Current location</p>
              </div>
              <div className="top-summary-block top-summary-main">
                <p className="temperature mb-2">
                  <FontAwesomeIcon icon={faThermometerHalf} className="me-2" />
                  <span>{Math.round(weather.main.temp)}°C</span>
                </p>
                <div className="weather-stats">
                  <p className="mb-0"><FontAwesomeIcon icon={faTint} className="me-2" />{weather.main.humidity}%</p>
                  <p className="mb-0"><FontAwesomeIcon icon={faWind} className="me-2" />{weather.wind.speed} m/s</p>
                </div>
              </div>
              <div className="top-summary-block top-summary-weather text-end">
                <div className="weather-summary d-inline-flex align-items-center justify-content-end">
                  <FontAwesomeIcon icon={getWeatherIcon(weather.weather[0].icon)} className="weather-icon-large me-3" />
                  <span className="description">{weather.weather[0].description}</span>
                </div>
              </div>
            </div>
          )}

          <Link to="/" className="btn btn-secondary mt-3">Back to Search</Link>
        </Card.Body>
      </Card>

      {hourlyForecast.length > 0 && selectedDay && (
        <div className="hourly-forecast-overlay">
          <div className="hourly-forecast-modal">
            <div className="hourly-forecast-header">
              <h3>Hourly Forecast for {new Date(selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
              <button type="button" className="btn-close" aria-label="Close" onClick={closeHourlyForecast} />
            </div>
            <div className="hourly-forecast-content">
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
                                const x = (i * 100) + 50
                                const y = 120 - (Math.min(Math.max(hour.temp, 0), 30) / 30 * 100)
                                return `${x},${y}`
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

              <div className="hourly-forecast-grid">
                {hourlyForecast.slice(0, 6).map((hour, index) => (
                  <div key={index} className="hourly-forecast-card">
                    <div className="hourly-time">{formatTimeDisplay(hour.time)}</div>
                    <div className="hourly-temp">{Math.round(hour.temp)}°C</div>
                    <div className="hourly-description">{hour.description}</div>
                    <div className="hourly-details">
                      <span className="humidity-detail"><FontAwesomeIcon icon={faTint} /> {hour.humidity}%</span>
                      <span className="wind-detail"><FontAwesomeIcon icon={faWind} /> {hour.wind.toFixed(1)} m/s</span>
                    </div>
                  </div>
                ))}
              </div>

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
                        <td className="time-cell" data-label="Time">{formatTimeDisplay(hour.time)}</td>
                        <td className="temp-cell" data-label="Temp">{Math.round(hour.temp)}°C</td>
                        <td className="desc-cell" data-label="Conditions">{hour.description}</td>
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
                      <div className="text-muted">{day.description}</div>
                      <div className="mt-2">
                        <small>
                          <FontAwesomeIcon icon={faTint} /> {day.humidity}% &nbsp;
                          <FontAwesomeIcon icon={faWind} /> {day.wind} m/s
                        </small>
                      </div>
                    </div>
                    <div className="d-flex align-items-center forecast-weather-summary">
                      <FontAwesomeIcon icon={getWeatherIcon(day.icon)} className="forecast-weather-icon me-3" />
                      <span className="temperature">{Math.round(day.temp)}°C</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}
    </main>
  )
}

export default ForecastPage
