
import axios from 'axios';

export class ExternalAPIService {
  constructor(config) {
    this.weatherApiKey = config.weatherApiKey;
    this.weatherBaseUrl = 'https://api.openweathermap.org/data/2.5';
    this.countriesBaseUrl = 'https://restcountries.com/v3.1';
  }

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
          cnt: 8, 
        },
        timeout: 5000,
      });

      const forecasts = response.data.list.map(item => ({
        time: item.dt_txt,
        temp: Math.round(item.main.temp),
        description: item.weather[0].description,
        pop: Math.round(item.pop * 100),
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

  async getCountryInfo(countryName) {
    try {
      const response = await axios.get(
        `${this.countriesBaseUrl}/name/${encodeURIComponent(countryName)}`,
        { timeout: 5000 }
      );

      const data = response.data[0];
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

  static shouldFetchExternalData(query, queryType) {
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

static extractLocation(query) {
  // Make the query case-insensitive and more flexible
  const patterns = [
    /\bin\s+([a-zA-Z\s]+?)(?:\s|,|\.|\?|$)/i, // matches "in london", "in new york"
    /(?:weather|climate)\s+(?:in\s+)?([a-zA-Z\s]+?)(?:\s|,|\.|\?|$)/i, // matches "weather in london", "climate in tokyo"
    /\bto\s+([a-zA-Z\s]+?)(?:\s|,|\.|\?|$)/i, // matches "to paris"
    /\bfor\s+([a-zA-Z\s]+?)(?:\s+trip|\s+vacation)/i, // matches "for italy trip"
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
