/**
 * Open-Meteo — free, no API key (see DEPLOYMENT.md), so unlike Strava/Garmin
 * there's no config secret to wire up for this integration.
 */

export interface GeocodedCity {
  latitude: number;
  longitude: number;
}

interface GeocodingResponse {
  results?: Array<{ latitude: number; longitude: number }>;
}

/** Takes the first match only — an ambiguous city name (e.g. multiple "Paris" worldwide) can resolve to the wrong one; biased toward French results via `language=fr`, not restricted to a country. */
export async function geocodeCity(city: string): Promise<GeocodedCity | null> {
  const params = new URLSearchParams({ name: city, count: '1', language: 'fr', format: 'json' });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as GeocodingResponse;
  const first = data.results?.[0];
  return first ? { latitude: first.latitude, longitude: first.longitude } : null;
}

interface ForecastResponse {
  daily: {
    time: string[];
    temperature_2m_max: number[];
  };
}

/** Daily max temperature (°C) for each day in [start, end], keyed by ISO date (yyyy-MM-dd). One call covers the whole range — no need for a per-day request. */
export async function fetchDailyMaxTemps(latitude: number, longitude: number, start: Date, end: Date): Promise<Map<string, number>> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: 'temperature_2m_max',
    timezone: 'auto',
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!res.ok) throw new Error(`Forecast fetch failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as ForecastResponse;

  const result = new Map<string, number>();
  data.daily.time.forEach((date, i) => result.set(date, data.daily.temperature_2m_max[i]!));
  return result;
}
