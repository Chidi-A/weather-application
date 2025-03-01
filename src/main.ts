import './style.css';
import { initializeSearch } from './services/searchService';
import {
  getWeatherData,
  getWeatherForecast,
  parseCurrentWeather,
  getWeatherIcon,
  getWeatherCondition,
  getUVIndexLevel,
} from './services/weatherService';
import {
  WeatherResponse,
  ForecastResponse,
  // CurrentWeather,
} from './types/weather';

document.addEventListener('DOMContentLoaded', () => {
  initializeSearch();
  initializeWeather();
});

async function initializeWeather(): Promise<void> {
  console.log('Starting weather initialization');
  const weatherSection =
    document.querySelector<HTMLElement>('.current-weather');
  if (!weatherSection) {
    console.error('Weather section not found');
    return;
  }

  weatherSection.innerHTML = `<div class='loading'>Loading weather data...</div>`;

  if ('geolocation' in navigator) {
    try {
      console.log('Requesting geolocation...');
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
          });
        }
      );

      console.log('Got position:', position.coords);

      const { latitude, longitude } = position.coords;
      console.log('Fetching weather for:', latitude, longitude);

      const weatherData = await getWeatherData(latitude, longitude);
      console.log('Weather data received:', weatherData);

      await updateCurrentWeather(weatherData, latitude, longitude);
      console.log('Weather section updated');
    } catch (error) {
      console.error('Error in initializeWeather:', error);
      handleError(
        error instanceof GeolocationPositionError && error.code === 1
          ? 'location'
          : 'general'
      );
    }
  } else {
    handleError('location');
  }
}

export async function updateCurrentWeather(
  weatherData: WeatherResponse,
  latitude: number,
  longitude: number
): Promise<void> {
  try {
    const parsedData = parseCurrentWeather(weatherData);
    console.log('Parsed weather data:', parsedData);

    const weatherSection =
      document.querySelector<HTMLElement>('.current-weather');
    if (!weatherSection) {
      console.error('Weather section not found');
      return;
    }

    // IMPORTANT: Restore the original HTML structure first
    weatherSection.innerHTML = `
      <div class="weather-info">
        <div class="location-conditions">
          <h2></h2>
          <p class="weather-condition"></p>
        </div>
        <div class="temperature">
          <span></span>
        </div>
      </div>
      <img src="" alt="Weather" class="weather-icon" />
    `;

    // Now find and update the elements
    const locationElement = weatherSection.querySelector<HTMLHeadingElement>(
      '.location-conditions h2'
    );
    if (locationElement) {
      locationElement.textContent = parsedData.cityName;
      console.log('Updated location to:', parsedData.cityName);
    } else {
      console.error('Location element not found');
    }

    const conditionElement =
      weatherSection.querySelector<HTMLParagraphElement>('.weather-condition');
    if (conditionElement) {
      conditionElement.textContent = getWeatherCondition(
        parsedData.weatherCode
      );
    }

    const temperatureElement =
      weatherSection.querySelector<HTMLSpanElement>('.temperature span');
    if (temperatureElement) {
      temperatureElement.textContent = `${parsedData.temperature}°`;
    }

    const weatherIcon =
      weatherSection.querySelector<HTMLImageElement>('.weather-icon');
    if (weatherIcon) {
      weatherIcon.src = getWeatherIcon(parsedData.weatherIcon);
      weatherIcon.alt = parsedData.description;
    }

    updateAirConditions({
      feelsLike: parsedData.feelsLike,
      humidity: parsedData.humidity,
      windSpeed: parsedData.windSpeed,
      uvIndex: parsedData.uvIndex,
    });

    const forecastData = await getWeatherForecast(latitude, longitude);
    updateHourlyForecast(forecastData.hourly);
    updateDailyForecast(forecastData.daily);
  } catch (error) {
    console.error('Error in updateCurrentWeather:', error);
    handleError('general');
  }
}

function updateAirConditions(data: {
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
}): void {
  // Update Real Feel
  const realFeelElement = document.querySelector<HTMLSpanElement>(
    '.condition-card:has(img[alt="Real Feel"]) .value'
  );
  if (realFeelElement) {
    realFeelElement.textContent = `${data.feelsLike}°`;
  }

  // Update Wind
  const windElement = document.querySelector<HTMLSpanElement>(
    '.condition-card:has(img[alt="Wind"]) .value'
  );
  if (windElement) {
    // Convert m/s to km/h (multiply by 3.6)
    const windSpeedKmh = Math.round(data.windSpeed * 3.6);
    windElement.textContent = `${windSpeedKmh} km/h`;
  }

  // Update UV Index
  const uvElement = document.querySelector<HTMLSpanElement>(
    '.condition-card:has(img[alt="UV Index"]) .value'
  );
  if (uvElement) {
    const uvLevel = getUVIndexLevel(data.uvIndex);
    uvElement.textContent = `${Math.round(data.uvIndex)} (${uvLevel})`;
  }

  // Update Humidity
  const humidityElement = document.querySelector<HTMLSpanElement>(
    '.condition-card:has(img[alt="Humidity"]) .value'
  );
  if (humidityElement) {
    humidityElement.textContent = `${data.humidity}%`;
  }
}

function updateHourlyForecast(hourlyData: ForecastResponse): void {
  const forecastContainer =
    document.querySelector<HTMLDivElement>('.hourly-forecast');
  if (!forecastContainer) return;

  // Clear existing cards
  forecastContainer.innerHTML = '';

  // Get next 6 hours of forecast
  const next6Hours = hourlyData.list.slice(0, 6);

  // Create forecast cards
  next6Hours.forEach((hour) => {
    const time = new Date(hour.dt * 1000);
    const hourString = time.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const card = document.createElement('div');
    card.className = 'hour-card';
    card.innerHTML = `
      <span class="time">${hourString}</span>
      <img 
        src="${getWeatherIcon(hour.weather[0].icon)}" 
        alt="${hour.weather[0].description}"
        class="weather-icon"
      />
      <span class="temp">${Math.round(hour.main.temp)}°</span>
    `;

    forecastContainer.appendChild(card);
  });
}

// Update daily forecast
function updateDailyForecast(dailyData: any[]): void {
  const forecastContainer =
    document.querySelector<HTMLDivElement>('.weekly-forecast');
  if (!forecastContainer) return;

  // Clear existing rows
  forecastContainer.innerHTML = '';

  // Create forecast rows for available days
  dailyData.forEach((day, index) => {
    const date = new Date(day.dt * 1000);
    const dayName =
      index === 0
        ? 'Today'
        : date.toLocaleDateString('en-US', { weekday: 'long' });

    const row = document.createElement('div');
    row.className = 'forecast-row';
    row.innerHTML = `
      <span class="day">${dayName}</span>
      <div class="weather">
        <img src="${getWeatherIcon(day.weather.icon)}" alt="${
      day.weather.description
    }" />
        <span>${day.weather.main}</span>
      </div>
      <span class="temp">${Math.round(day.temp.max)}°/${Math.round(
      day.temp.min
    )}°</span>
    `;

    forecastContainer.appendChild(row);
  });
}

// Handle errors
function handleError(type: string = 'general'): void {
  const errorMessages: Record<string, string> = {
    api: 'Weather data unavailable. Please try again later.',
    network: 'Please check your internet connection.',
    location:
      'Unable to get your location. Please allow location access or search for a city.',
    general: 'Something went wrong. Please try again.',
  };

  const weatherSection =
    document.querySelector<HTMLElement>('.current-weather');
  if (weatherSection) {
    weatherSection.classList.add('error-state');

    let errorElement =
      weatherSection.querySelector<HTMLParagraphElement>('.error-message');
    if (!errorElement) {
      errorElement = document.createElement('p');
      errorElement.className = 'error-message';
      weatherSection.appendChild(errorElement);
    }
    errorElement.textContent = errorMessages[type] || errorMessages.general;
  }
}
