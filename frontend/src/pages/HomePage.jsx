import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Form, InputGroup } from 'react-bootstrap'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

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

  const BACKEND_API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'

  const fetchWeather = async (cityName) => {
    setLoading(true)
    setError('')
    try {
      const response = await axios.get(`${BACKEND_API_URL}/api/weather?city=${cityName}`)
      setWeather(response.data)
      navigate(`/forecast/${encodeURIComponent(cityName)}`)
    } catch (err) {
      let errorMessage = err.response?.data?.error || 'Error fetching weather data'

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

  const handleCityInputChange = (e) => {
    const cityName = e.target.value
    setCity(cityName)
    setSearchActive(true)
    setSelectedIndex(-1)

    if (cityName.length > 2) {
      setSearchLoading(true)
      axios.get(`${BACKEND_API_URL}/api/city-search?q=${cityName}`)
        .then((response) => {
          setCitySuggestions(response.data)
        })
        .catch((err) => {
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
    if (!searchActive || citySuggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < citySuggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : citySuggestions.length - 1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      selectCity(citySuggestions[selectedIndex])
    }
  }

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchActive(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <main className="weather-container home-page" role="main">
      <Card className="weather-card search-card">
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
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    </div>
                  ) : citySuggestions.length > 0 ? (
                    citySuggestions.map((suggestion, index) => (
                      <div
                        key={`${suggestion.name}-${index}`}
                        className={`city-suggestion-item ${selectedIndex === index ? 'selected' : ''}`}
                        onClick={() => selectCity(suggestion)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        {suggestion.name}
                      </div>
                    ))
                  ) : city.length > 2 ? (
                    <div className="city-suggestion-item disabled">No matching cities found</div>
                  ) : (
                    <div className="city-suggestion-item disabled">Type at least 3 characters to search</div>
                  )}
                </div>
              )}
            </div>
          </Form>

          {error && (
            <Alert variant="danger" className="mb-4" aria-live="polite">
              {error}
            </Alert>
          )}

          {weather && !error && (
            <div className="text-center mt-3">
              <p className="text-muted">Recent search loaded successfully.</p>
            </div>
          )}
        </Card.Body>
      </Card>
    </main>
  )
}

export default HomePage
