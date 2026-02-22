import { WMO_CODES } from './constants.js';

const METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/reverse';

/**
 * Open-Meteo에서 현재 날씨 + 24시간 시간별 예보를 가져온다.
 */
export async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: [
      'temperature_2m',
      'apparent_temperature',
      'weather_code',
      'wind_speed_10m',
      'relative_humidity_2m',
    ].join(','),
    hourly: [
      'temperature_2m',
      'apparent_temperature',
      'weather_code',
      'wind_speed_10m',
    ].join(','),
    timezone: 'auto',
    forecast_days: 8,
  });

  const res = await fetch(`${METEO_BASE}?${params}`);
  if (!res.ok) throw new Error('날씨 데이터를 가져올 수 없습니다');
  const data = await res.json();

  return {
    current: parseCurrentWeather(data),
    hourly: parseHourlyWeather(data),
  };
}

function parseCurrentWeather(data) {
  const c = data.current;
  const code = c.weather_code;
  const wmo = WMO_CODES[code] || { emoji: '❓', label: '알 수 없음' };

  return {
    temp: Math.round(c.temperature_2m),
    apparentTemp: Math.round(c.apparent_temperature),
    weatherCode: code,
    weatherEmoji: wmo.emoji,
    weatherLabel: wmo.label,
    windSpeed: Math.round(c.wind_speed_10m),
    humidity: c.relative_humidity_2m,
    hour: new Date(c.time).getHours(),
  };
}

function parseHourlyWeather(data) {
  const h = data.hourly;
  const now = new Date();
  const items = [];

  for (let i = 0; i < h.time.length; i++) {
    const time = new Date(h.time[i]);
    if (time < now) continue;

    const code = h.weather_code[i];
    const wmo = WMO_CODES[code] || { emoji: '❓', label: '알 수 없음' };

    items.push({
      time,
      hour: time.getHours(),
      date: time.toISOString().split('T')[0],
      temp: Math.round(h.temperature_2m[i]),
      apparentTemp: Math.round(h.apparent_temperature[i]),
      weatherCode: code,
      weatherEmoji: wmo.emoji,
      weatherLabel: wmo.label,
      windSpeed: Math.round(h.wind_speed_10m[i]),
    });
  }

  return items;
}

/**
 * Nominatim 역지오코딩으로 좌표 → 한국어 지명을 가져온다.
 */
export async function fetchLocationName(lat, lon) {
  const params = new URLSearchParams({
    lat,
    lon,
    format: 'json',
    'accept-language': 'ko',
    zoom: 10,
  });

  try {
    const res = await fetch(`${NOMINATIM_BASE}?${params}`, {
      headers: { 'User-Agent': 'WeatherClothesApp/1.0' },
    });
    if (!res.ok) return '내 위치';
    const data = await res.json();

    const addr = data.address;
    // 시/구 또는 시/군 형태로 간결하게
    const city = addr.city || addr.town || addr.county || addr.state || '';
    const district = addr.borough || addr.suburb || addr.village || '';

    if (city && district) return `${city} ${district}`;
    if (city) return city;
    return data.display_name?.split(',')[0] || '내 위치';
  } catch {
    return '내 위치';
  }
}
