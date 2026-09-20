import type { WeatherProvider, WeatherSnapshot, DailyForecast } from "./types";

const CONDITIONS = ["Clear", "Partly Cloudy", "Cloudy", "Light Rain", "Sunny", "Hazy"];

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

/**
 * Deterministic, seeded "weather" used until WEATHER_API_KEY is configured
 * (see lib/providers/weather/index.ts). Deterministic per-location so demo
 * data looks stable across page loads rather than flickering randomly.
 */
export class DemoWeatherProvider implements WeatherProvider {
  async getWeather({ lat, lng, locationName }: { lat: number; lng: number; locationName: string }): Promise<WeatherSnapshot> {
    const seed = Math.round((lat + lng) * 1000) + locationName.length;
    const random = seededRandom(seed);
    const baseTemp = 22 + Math.round(random() * 10);

    const forecast: DailyForecast[] = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const drift = Math.round(random() * 6) - 3;
      return {
        date: date.toISOString().slice(0, 10),
        minTempC: baseTemp + drift - 5,
        maxTempC: baseTemp + drift + 4,
        condition: CONDITIONS[Math.floor(random() * CONDITIONS.length)],
        rainProbability: Math.round(random() * 40)
      };
    });

    return {
      current: {
        temperatureC: baseTemp,
        feelsLikeC: baseTemp + 2,
        condition: CONDITIONS[Math.floor(random() * CONDITIONS.length)],
        humidity: 40 + Math.round(random() * 40),
        windKph: 5 + Math.round(random() * 15),
        rainProbability: Math.round(random() * 30),
        observedAt: new Date().toISOString()
      },
      forecast,
      source: "TripToe demo weather (deterministic sample data)",
      isLiveData: false
    };
  }
}
