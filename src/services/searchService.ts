import { GeocodingResponse } from '../types/weather';
import {
  getWeatherData,
  //   parseCurrentWeather,
  //   getWeatherIcon,
  //   getWeatherCondition,
} from './weatherService';
import { debounce } from '../utils/helpers';
import { updateCurrentWeather } from '../main';
// Config
const OPENWEATHER_CONFIG = {
  API_KEY: 'e8e3bcc50013da319ed44dcbfba39f42',
  GEO_URL: 'https://api.openweathermap.org/geo/1.0/direct',
};

// Initialize search functionality
export function initializeSearch(): void {
  console.log('Initializing search...');

  // Setup search elements
  const searchInput = document.querySelector<HTMLInputElement>('.search-input');
  const searchButton =
    document.querySelector<HTMLButtonElement>('.search-button');
  const searchResults =
    document.querySelector<HTMLDivElement>('.search-results');

  if (!searchInput || !searchButton || !searchResults) {
    console.error('Search elements not found');
    return;
  }

  // Debounced function for suggestions
  const debouncedSuggestions = debounce(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      searchResults.innerHTML = '';
      return;
    }

    try {
      searchResults.innerHTML =
        '<div class="loading">Loading suggestions...</div>';

      // Get city suggestions from OpenWeatherMap
      const url = `${OPENWEATHER_CONFIG.GEO_URL}?q=${encodeURIComponent(
        searchTerm
      )}&limit=5&appid=${OPENWEATHER_CONFIG.API_KEY}`;
      const response = await fetch(url);
      const data: GeocodingResponse[] = await response.json();

      if (data && data.length > 0) {
        // Create suggestions HTML
        const suggestionsHTML = data
          .map(
            (city) => `
          <div class="search-result" 
               data-lat="${city.lat}"
               data-lon="${city.lon}"
               data-name="${city.name}, ${city.country}">
            <span class="city">
              ${highlightMatch(city.name, searchTerm)}
              <span class="country">${city.state ? `${city.state}, ` : ''}${
              city.country
            }</span>
            </span>
          </div>
        `
          )
          .join('');

        searchResults.innerHTML = suggestionsHTML;

        // Add click handlers to suggestions
        document
          .querySelectorAll<HTMLDivElement>('.search-result')
          .forEach((result) => {
            result.addEventListener('click', async () => {
              const { lat, lon, name } = result.dataset;
              if (lat && lon) {
                searchInput.value = name || '';
                searchResults.innerHTML = '';

                // Get weather for selected city
                try {
                  const weatherData = await getWeatherData(
                    parseFloat(lat),
                    parseFloat(lon)
                  );
                  await updateCurrentWeather(
                    weatherData,
                    parseFloat(lat),
                    parseFloat(lon)
                  );
                } catch (error) {
                  console.error('Error getting weather:', error);
                  searchResults.innerHTML =
                    '<div class="error">Error loading weather data</div>';
                }
              }
            });
          });
      } else {
        searchResults.innerHTML =
          '<div class="no-results">No matching cities found</div>';
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
      searchResults.innerHTML =
        '<div class="error">Error loading suggestions</div>';
    }
  }, 300);

  // Function to handle search button click or Enter key
  const handleSearch = async () => {
    const searchTerm = searchInput.value.trim();

    if (!searchTerm || searchTerm.length < 2) {
      searchResults.innerHTML =
        '<div class="info">Please enter at least 2 characters</div>';
      return;
    }

    try {
      searchResults.innerHTML = '<div class="loading">Searching...</div>';

      // Get city coordinates
      const geoUrl = `${OPENWEATHER_CONFIG.GEO_URL}?q=${encodeURIComponent(
        searchTerm
      )}&limit=1&appid=${OPENWEATHER_CONFIG.API_KEY}`;
      const geoResponse = await fetch(geoUrl);
      const geoData: GeocodingResponse[] = await geoResponse.json();

      if (geoData && geoData.length > 0) {
        const { lat, lon } = geoData[0];
        const weatherData = await getWeatherData(lat, lon);
        await updateCurrentWeather(weatherData, lat, lon);
        searchResults.innerHTML = '';
        searchInput.value = '';
      } else {
        searchResults.innerHTML = '<div class="error">City not found</div>';
      }
    } catch (error) {
      console.error('Error during search:', error);
      searchResults.innerHTML =
        '<div class="error">Error performing search</div>';
    }
  };

  // Helper function to highlight matching text
  function highlightMatch(text: string, query: string): string {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
  }

  // Add input event listener for suggestions
  searchInput.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    const searchTerm = target.value.trim();
    debouncedSuggestions(searchTerm);
  });

  // Add click event listener to search button
  searchButton.addEventListener('click', handleSearch);

  // Add Enter key event listener to input
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });

  // Close suggestions when clicking outside
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!searchInput.contains(target) && !searchResults.contains(target)) {
      searchResults.innerHTML = '';
    }
  });
}

// // This function needs to be implemented in your main.ts
// async function updateCurrentWeather(
//   weatherData: any,
//   latitude: number,
//   longitude: number
// ): Promise<void> {
//   // This is just a placeholder - you'll implement this in your main.ts
//   console.log('Update weather with:', weatherData, latitude, longitude);
// }
