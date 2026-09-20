import "server-only";
import type { WeatherProvider } from "./types";
import { DemoWeatherProvider } from "./demoProvider";
import { OpenWeatherProvider } from "./openWeatherProvider";

export type { WeatherSnapshot, CurrentWeather, DailyForecast, WeatherProvider } from "./types";

let cachedProvider: WeatherProvider | null = null;

/** Selected at request time so a missing WEATHER_API_KEY degrades to demo data instead of crashing the page. */
export function getWeatherProvider(): WeatherProvider {
  if (cachedProvider) return cachedProvider;
  const apiKey = process.env.WEATHER_API_KEY;
  cachedProvider = apiKey ? new OpenWeatherProvider(apiKey) : new DemoWeatherProvider();
  return cachedProvider;
}
