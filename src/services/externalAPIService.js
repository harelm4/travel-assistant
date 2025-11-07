
import axios from 'axios';

export class ExternalAPIService {
  constructor(config) {
    this.weatherApiKey = config.weatherApiKey;
    this.weatherBaseUrl = 'https://api.openweathermap.org/data/2.5';
    this.countriesBaseUrl = 'https://restcountries.com/v3.1';
  }

  /**
   * Get current weather for a location
   * @param {string} location - City name or "city,country"
   */
  async getWeather(location) {
    if (!this.weatherApiKey) {
      console.warn('Weather API key not configured');
      return null;
    }

    try {
      const response = await axios.get(`${this.weatherBaseUrl}/weather`, {
        params: {
          q: location,
          appid: this.weatherApiKey,
          units: 'metric',
        },
        timeout: 5000,
      });

      const data = response.data;
      return {
        temp: Math.round(data.main.temp),
        feels_like: Math.round(data.main.feels_like),
        description: data.weather[0].description,
        humidity: data.main.humidity,
        wind_speed: data.wind.speed,
        icon: data.weather[0].icon,
        location: data.name,
        country: data.sys.country,
      };
    } catch (error) {
      console.error('Weather API error:', error.message);
      return null;
    }
  }

  /**
   * Get weather forecast for a location (5 day / 3 hour)
   */
  async getWeatherForecast(location) {
    if (!this.weatherApiKey) {
      return null;
    }

    try {
      const response = await axios.get(`${this.weatherBaseUrl}/forecast`, {
        params: {
          q: location,
          appid: this.weatherApiKey,
          units: 'metric',
          cnt: 8, // Next 24 hours (8 * 3 hour intervals)
        },
        timeout: 5000,
      });

      const forecasts = response.data.list.map(item => ({
        time: item.dt_txt,
        temp: Math.round(item.main.temp),
        description: item.weather[0].description,
        pop: Math.round(item.pop * 100), // Probability of precipitation
      }));

      return {
        location: response.data.city.name,
        forecasts: forecasts,
      };
    } catch (error) {
      console.error('Weather forecast API error:', error.message);
      return null;
    }
  }

  /**
   * Get country information
   * @param {string} countryName - Name of the country
   */
  async getCountryInfo(countryName) {
    try {
      const response = await axios.get(
        `${this.countriesBaseUrl}/name/${encodeURIComponent(countryName)}`,
        { timeout: 5000 }
      );

      const data = response.data[0]; // Take first match
      return {
        name: data.name.common,
        officialName: data.name.official,
        capital: data.capital?.[0],
        region: data.region,
        subregion: data.subregion,
        population: data.population,
        languages: Object.values(data.languages || {}),
        currency: Object.values(data.currencies || {}).map(c => `${c.name} (${c.symbol})`)[0],
        timezones: data.timezones,
        flagUrl: data.flags.png,
        continents: data.continents,
        borders: data.borders || [],
      };
    } catch (error) {
      console.error('Country API error:', error.message);
      return null;
    }
  }

  /**
   * Get country by capital city
   */
  async getCountryByCapital(capital) {
    try {
      const response = await axios.get(
        `${this.countriesBaseUrl}/capital/${encodeURIComponent(capital)}`,
        { timeout: 5000 }
      );

      const data = response.data[0];
      return this._formatCountryData(data);
    } catch (error) {
      console.error('Country by capital API error:', error.message);
      return null;
    }
  }

  /**
   * Helper to format country data consistently
   */
  _formatCountryData(data) {
    return {
      name: data.name.common,
      officialName: data.name.official,
      capital: data.capital?.[0],
      region: data.region,
      subregion: data.subregion,
      population: data.population,
      languages: Object.values(data.languages || {}),
      currency: Object.values(data.currencies || {}).map(c => `${c.name} (${c.symbol})`)[0],
      timezones: data.timezones,
      continents: data.continents,
    };
  }

  /**
   * Determine if external data should be fetched based on query
   * Returns object with flags for what data to fetch
   */
  static shouldFetchData(query, queryType) {
    const lowerQuery = query.toLowerCase();
    
    return {
      weather: 
        queryType === 'weather' ||
        queryType === 'packing' ||
        lowerQuery.includes('weather') ||
        lowerQuery.includes('climate') ||
        lowerQuery.includes('temperature'),
      
      country:
        queryType === 'destination_recommendation' ||
        queryType === 'attractions' ||
        lowerQuery.includes('country') ||
        lowerQuery.includes('capital') ||
        lowerQuery.includes('currency') ||
        lowerQuery.includes('language'),
    };
  }

  /**
   * Extract location from query using simple pattern matching
   * This is a heuristic approach - in production, consider using NER
   */
  static extractLocation(query) {
    // Common patterns: "in Paris", "to Tokyo", "visit Rome"
    const patterns = [
      /\b(?:in|to|visit|visiting|going to|traveling to|at)\s+([A-Z][a-zA-Z\s]+?)(?:\s|,|\.|\?|$)/,
      /\b([A-Z][a-zA-Z\s]+?)(?:\s+weather|\s+climate)/,
      /\bfor\s+([A-Z][a-zA-Z\s]+?)(?:\s+trip|\s+vacation)/,
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }
}

export default ExternalAPIService;
