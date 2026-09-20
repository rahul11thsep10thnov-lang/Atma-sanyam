import type { Destination } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { WatermarkSection } from "@/components/watermark/WatermarkSection";
import { getWeatherProvider } from "@/lib/providers/weather";

export async function WeatherSection({
  destination,
  dict,
  id = "weather"
}: {
  destination: Destination;
  dict: Dictionary;
  id?: string;
}) {
  const { sections } = dict.destination;
  const { ui } = dict.common;

  const provider = getWeatherProvider();
  const weather = await provider.getWeather({
    lat: destination.latitude,
    lng: destination.longitude,
    locationName: destination.name
  });

  return (
    <WatermarkSection images={destination.watermarkImages} id={id} className="py-10">
      <div className="container-page">
        <h2 className="section-heading">{sections.weather}</h2>
        <p className="mt-1 text-xs text-charcoal-light">
          {ui.source}: {weather.source}
          {!weather.isLiveData && ` — ${ui.sampleData}`}
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="card-surface flex flex-col items-start p-6">
            <span className="font-display text-5xl font-bold text-forest-700">{weather.current.temperatureC}°C</span>
            <p className="mt-1 text-sm text-charcoal-light">
              {weather.current.condition} · Feels like {weather.current.feelsLikeC}°C
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-charcoal-light">Humidity</dt>
                <dd className="font-semibold text-charcoal">{weather.current.humidity}%</dd>
              </div>
              <div>
                <dt className="text-xs text-charcoal-light">Wind</dt>
                <dd className="font-semibold text-charcoal">{weather.current.windKph} kph</dd>
              </div>
              <div>
                <dt className="text-xs text-charcoal-light">Rain chance</dt>
                <dd className="font-semibold text-charcoal">{weather.current.rainProbability}%</dd>
              </div>
            </dl>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {weather.forecast.map((day) => (
              <div key={day.date} className="card-surface p-3 text-center">
                <p className="text-xs font-semibold text-charcoal-light">
                  {new Date(day.date).toLocaleDateString(undefined, { weekday: "short" })}
                </p>
                <p className="mt-1 text-sm text-charcoal">{day.condition}</p>
                <p className="mt-1 text-sm font-semibold text-charcoal">
                  {day.maxTempC}° / {day.minTempC}°
                </p>
                <p className="mt-1 text-[11px] text-charcoal-light">{day.rainProbability}% rain</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-forest-50 p-4 text-sm text-charcoal">
          <strong>{ui.bestTime}: </strong>
          {destination.bestTimeToVisit}
        </div>
      </div>
    </WatermarkSection>
  );
}
