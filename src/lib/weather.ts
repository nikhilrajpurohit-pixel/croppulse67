import { queryOptions } from "@tanstack/react-query";
import { hargreavesEt0, type DayWeather } from "./agro";

export interface WeatherDaily extends DayWeather {
  tmax: number;
  tmin: number;
  code: number;
  et0Estimated: boolean;
}
export interface WeatherData {
  fetchedAt: number;
  current: { temp: number; humidity: number; wind: number; precip: number; code: number };
  today: string;
  history: WeatherDaily[]; // up to yesterday
  todayDay: WeatherDaily;
  forecast: WeatherDaily[]; // tomorrow onwards
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,et0_fao_evapotranspiration",
    timezone: "auto",
    past_days: "92",
    forecast_days: "8",
  }).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather service responded ${res.status}`);
  const j = await res.json();
  const d = j.daily;
  const today: string = j.current.time.slice(0, 10);
  const days: WeatherDaily[] = d.time.map((date: string, i: number) => {
    const tmax = d.temperature_2m_max[i] ?? 0;
    const tmin = d.temperature_2m_min[i] ?? 0;
    const et0Raw = d.et0_fao_evapotranspiration[i];
    return {
      date,
      tmax,
      tmin,
      code: d.weather_code[i] ?? 0,
      rain: d.precipitation_sum[i] ?? 0,
      rainProb: d.precipitation_probability_max[i],
      et0: et0Raw ?? hargreavesEt0(tmax, tmin, lat, date),
      et0Estimated: et0Raw == null,
      isForecast: date > today,
    };
  });
  return {
    fetchedAt: Date.now(),
    today,
    current: {
      temp: j.current.temperature_2m,
      humidity: j.current.relative_humidity_2m,
      wind: j.current.wind_speed_10m,
      precip: j.current.precipitation,
      code: j.current.weather_code,
    },
    history: days.filter((x) => x.date < today),
    todayDay: days.find((x) => x.date === today) ?? days[days.length - 8]!,
    forecast: days.filter((x) => x.date > today),
  };
}

export const weatherQuery = (lat: number, lon: number) =>
  queryOptions({
    queryKey: ["weather", lat.toFixed(3), lon.toFixed(3)],
    queryFn: () => fetchWeather(lat, lon),
    refetchInterval: 15 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

export interface GeoResult { id: number; name: string; admin1?: string; country?: string; latitude: number; longitude: number }
export async function searchPlaces(q: string): Promise<GeoResult[]> {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`);
  if (!res.ok) throw new Error("Location search failed");
  const j = await res.json();
  return j.results ?? [];
}

export function weatherLabel(code: number) {
  if (code === 0) return "Clear sky";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  return "Thunderstorm";
}
