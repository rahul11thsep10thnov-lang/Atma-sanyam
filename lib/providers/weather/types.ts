export interface DailyForecast {
  date: string;
  minTempC: number;
  maxTempC: number;
  condition: string;
  rainProbability: number;
}

export interface CurrentWeather {
  temperatureC: number;
  feelsLikeC: number;
  condition: string;
  humidity: number;
  windKph: number;
  rainProbability: number;
  observedAt: string;
}

export interface WeatherSnapshot {
  current: CurrentWeather;
  forecast: DailyForecast[];
  source: string;
  isLiveData: boolean;
}

export interface WeatherProvider {
  getWeather(input: { lat: number; lng: number; locationName: string }): Promise<WeatherSnapshot>;
}
