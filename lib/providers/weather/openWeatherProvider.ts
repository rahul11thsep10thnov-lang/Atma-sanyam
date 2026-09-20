import type { WeatherProvider, WeatherSnapshot } from "./types";

/**
 * Thin adapter around the OpenWeather One Call API. This file only ever
 * runs on the server (imported from server components / API routes), so
 * WEATHER_API_KEY is never bundled into client JavaScript.
 */
export class OpenWeatherProvider implements WeatherProvider {
  constructor(private apiKey: string) {}

  async getWeather({ lat, lng }: { lat: number; lng: number; locationName: string }): Promise<WeatherSnapshot> {
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lng}&units=metric&exclude=minutely,hourly,alerts&appid=${this.apiKey}`;
    const response = await fetch(url, { next: { revalidate: 1800 } });

    if (!response.ok) {
      throw new Error(`OpenWeather request failed with status ${response.status}`);
    }

    const data = await response.json();

    return {
      current: {
        temperatureC: Math.round(data.current.temp),
        feelsLikeC: Math.round(data.current.feels_like),
        condition: data.current.weather?.[0]?.main ?? "Unknown",
        humidity: data.current.humidity,
        windKph: Math.round(data.current.wind_speed * 3.6),
        rainProbability: Math.round((data.daily?.[0]?.pop ?? 0) * 100),
        observedAt: new Date(data.current.dt * 1000).toISOString()
      },
      forecast: (data.daily ?? []).slice(0, 7).map((day: any) => ({
        date: new Date(day.dt * 1000).toISOString().slice(0, 10),
        minTempC: Math.round(day.temp.min),
        maxTempC: Math.round(day.temp.max),
        condition: day.weather?.[0]?.main ?? "Unknown",
        rainProbability: Math.round((day.pop ?? 0) * 100)
      })),
      source: "OpenWeather",
      isLiveData: true
    };
  }
}
