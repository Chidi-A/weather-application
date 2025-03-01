import {
  WeatherResponse,
  ForecastResponse,
  DailyForecast,
  CurrentWeather,
} from '../types/weather';

const OPENWEATHER_CONFIG = {
  API_KEY: 'e8e3bcc50013da319ed44dcbfba39f42',
  GEO_URL: 'https://api.openweathermap.org/geo/1.0/direct',
  WEATHER_URL: 'https://api.openweathermap.org/data/2.5/weather',
  FORECAST_URL: 'https://api.openweathermap.org/data/2.5/forecast',
  ICON_URL: 'https://openweathermap.org/img/wn',
};

export async function getWeatherData(
  latitude: number,
  longitude: number
): Promise<WeatherResponse> {
  try {
    const url = `${OPENWEATHER_CONFIG.WEATHER_URL}?lat=${latitude}&lon=${longitude}&units=metric&appid=${OPENWEATHER_CONFIG.API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Weather API Error: ${response.status}`);
    }

    const data: WeatherResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
}

export async function getWeatherForecast(
  latitude: number,
  longitude: number
): Promise<{ hourly: ForecastResponse; daily: DailyForecast[] }> {
  try {
    const hourlyurl = `${OPENWEATHER_CONFIG.FORECAST_URL}?lat=${latitude}&lon=${longitude}&units=metric&appid=${OPENWEATHER_CONFIG.API_KEY}`;
    const hourlyResponse = await fetch(hourlyurl);
    const hourlyData: ForecastResponse = await hourlyResponse.json();

    const dailyData = processDailyForecast(hourlyData);

    return {
      hourly: hourlyData,
      daily: dailyData,
    };
  } catch (error) {
    console.error('Error fetching weather forecast:', error);
    throw error;
  }
}

function processDailyForecast(forecastData: ForecastResponse): DailyForecast[] {
  const dailyForecasts: Record<string, DailyForecast> = {};

  forecastData.list.forEach((item) => {
    const date = new Date(item.dt * 1000);
    const dateKey = date.toDateString();

    if (!dailyForecasts[dateKey]) {
      dailyForecasts[dateKey] = {
        dt: date.getTime(),
        temp: {
          min: item.main.temp_min,
          max: item.main.temp_max,
        },
        weather: item.weather[0],
      };
    } else {
      dailyForecasts[dateKey].temp.min = Math.min(
        dailyForecasts[dateKey].temp.min,
        item.main.temp_min
      );
      dailyForecasts[dateKey].temp.max = Math.max(
        dailyForecasts[dateKey].temp.max,
        item.main.temp_max
      );
    }
  });

  return Object.values(dailyForecasts);
}

export function parseCurrentWeather(
  weatherData: WeatherResponse
): CurrentWeather {
  return {
    temperature: Math.round(weatherData.main.temp),
    weatherCode: weatherData.weather[0].id,
    weatherIcon: weatherData.weather[0].icon,
    humidity: weatherData.main.humidity,
    windSpeed: weatherData.wind.speed,
    feelsLike: Math.round(weatherData.main.feels_like),
    description: weatherData.weather[0].description,
    cityName: weatherData.name,
    uvIndex: getApproximateUVIndex(weatherData),
  };
}

export function getWeatherCondition(weatherCode: number): string {
  const weatherConditions: Record<number, string> = {
    200: 'Thunderstorm with light rain',
    201: 'Thunderstorm with rain',
    202: 'Thunderstorm with heavy rain',
    210: 'Light thunderstorm',
    211: 'Thunderstorm',
    212: 'Heavy thunderstorm',
    221: 'Ragged thunderstorm',
    230: 'Thunderstorm with light drizzle',
    231: 'Thunderstorm with drizzle',
    232: 'Thunderstorm with heavy drizzle',

    300: 'Light Drizzle',
    301: 'Drizzle',
    302: 'Heavy Drizzle',
    310: 'Light Drizzle Rain',
    311: 'Drizzle Rain',
    312: 'Heavy Drizzle Rain',
    313: 'Shower Rain and Drizzle',
    314: 'Heavy Shower Rain and Drizzle',
    321: 'Shower Drizzle',

    500: 'Light Rain',
    501: 'Moderate Rain',
    502: 'Heavy Rain',
    503: 'Very Heavy Rain',
    504: 'Extreme Rain',
    511: 'Freezing Rain',
    520: 'Light Rain Shower',
    521: 'Rain Shower',
    522: 'Heavy Rain Shower',
    531: 'Ragged Rain Shower',

    600: 'Light Snow',
    601: 'Snow',
    602: 'Heavy Snow',
    611: 'Sleet',
    612: 'Light Shower Sleet',
    613: 'Shower Sleet',
    615: 'Light Rain and Snow',
    616: 'Rain and Snow',
    620: 'Light Shower Snow',
    621: 'Shower Snow',
    622: 'Heavy Shower Snow',

    701: 'Mist',
    711: 'Smoke',
    721: 'Haze',
    731: 'Sand/Dust Whirls',
    741: 'Fog',
    751: 'Sand',
    761: 'Dust',
    762: 'Ash',
    771: 'Squalls',
    781: 'Tornado',

    800: 'Clear Sky',
    801: 'Few Clouds',
    802: 'Scattered Clouds',
    803: 'Broken Clouds',
    804: 'Overcast Clouds',
  };

  return weatherConditions[weatherCode] || 'Unknown';
}

function getApproximateUVIndex(weatherData: WeatherResponse): number {
  const hour = new Date(weatherData.dt * 1000).getHours();
  const clouds = weatherData.clouds.all;

  let baseUV = 0;
  if (hour >= 6 && hour <= 18) {
    baseUV = 10 - Math.abs(12 - hour);

    baseUV = baseUV * (1 - clouds / 100);
  }

  return Math.max(0, Math.min(11, Math.round(baseUV)));
}

export function getUVIndexLevel(uvi: number): string {
  if (uvi <= 2) return 'Low';
  if (uvi <= 5) return 'Moderate';
  if (uvi <= 7) return 'High';
  if (uvi <= 10) return 'Very High';
  return 'Extreme';
}

export function getWeatherIcon(iconCode: string): string {
  return `${OPENWEATHER_CONFIG.ICON_URL}/${iconCode}@2x.png`;
}
