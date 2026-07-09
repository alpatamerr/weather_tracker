import {
  faSun,
  faMoon,
  faCloudSun,
  faCloudMoon,
  faCloud,
  faCloudRain,
  faCloudShowersHeavy,
  faBolt,
  faSnowflake,
  faSmog
} from '@fortawesome/free-solid-svg-icons'

const WEATHER_ICON_MAP = {
  '01d': faSun,
  '01n': faMoon,
  '02d': faCloudSun,
  '02n': faCloudMoon,
  '03d': faCloud,
  '03n': faCloud,
  '04d': faCloud,
  '04n': faCloud,
  '09d': faCloudShowersHeavy,
  '09n': faCloudShowersHeavy,
  '10d': faCloudRain,
  '10n': faCloudRain,
  '11d': faBolt,
  '11n': faBolt,
  '13d': faSnowflake,
  '13n': faSnowflake,
  '50d': faSmog,
  '50n': faSmog,
}

export const getWeatherIcon = (weatherCode) => WEATHER_ICON_MAP[weatherCode] || faCloudSun
