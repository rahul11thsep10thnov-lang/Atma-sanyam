import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { DestinationView } from "@/lib/master/view";
import { WatermarkSection } from "@/components/watermark/WatermarkSection";
import { getWeatherProvider } from "@/lib/providers/weather";

/** Live current weather and 7-day forecast for the trip dates (monthly climatology is a separate, stored section). */
export async function WeatherSection({ view, dict, id = "live-weather" }: { view: DestinationView; dict: Dictionary; id?: string }) {
  const { ui } = dict.common;
  const d = view.record;
  const weather = await getWeatherProvider().getWeather({ lat: d.latitude, lng: d.longitude, locationName: d.name });

  return (
    <WatermarkSection images={view.watermarkImages} id={id} className="border-b border-forest-100/70 py-9">
      <div className="container-page">
        <h2 className="section-heading">{dict.destination.sectionTitles.liveWeather}</h2>
        <p className="mt-1 text-xs text-charcoal-light">
          {ui.source}: {weather.source}
          {!weather.isLiveData && ` — ${ui.sampleData}`}
        </p>
        <div className="mt-5 grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="card-surface flex flex-col items-start p-6">
            <span className="font-display text-5xl font-bold text-forest-700">{weather.current.temperatureC}°C</span>
            <p className="mt-1 text-sm text-charcoal-light">
              {weather.current.condition} · Feels like {weather.current.feelsLikeC}°C
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-charcoal-light">Humidity</dt><dd className="font-semibold text-charcoal">{weather.current.humidity}%</dd></div>
              <div><dt className="text-xs text-charcoal-light">Wind</dt><dd className="font-semibold text-charcoal">{weather.current.windKph} kph</dd></div>
              <div><dt className="text-xs text-charcoal-light">Rain chance</dt><dd className="font-semibold text-charcoal">{weather.current.rainProbability}%</dd></div>
            </dl>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {weather.forecast.map((day) => (
              <div key={day.date} className="card-surface p-3 text-center">
                <p className="text-xs font-semibold text-charcoal-light">{new Date(day.date).toLocaleDateString("en-IN", { weekday: "short" })}</p>
                <p className="mt-1 text-sm text-charcoal">{day.condition}</p>
                <p className="mt-1 text-sm font-semibold text-charcoal">{day.maxTempC}° / {day.minTempC}°</p>
                <p className="mt-1 text-[11px] text-charcoal-light">{day.rainProbability}% rain</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WatermarkSection>
  );
}
