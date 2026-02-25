import { WMO_CODES } from './constants.js';
import { latLonToGrid } from './grid.js';

const KMA_BASE = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/reverse';

/* ── API 키 관리 ── */

export function getApiKey() {
  return localStorage.getItem('kma-api-key') || '';
}

export function setApiKey(key) {
  localStorage.setItem('kma-api-key', key.trim());
}

/* ── 기상청 단기예보 ── */

/**
 * 기상청 단기예보에서 현재 날씨 + 시간별 예보를 가져온다.
 */
export async function fetchWeather(lat, lon) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('기상청 API 키가 설정되지 않았습니다');

  const { nx, ny } = latLonToGrid(lat, lon);
  const { baseDate, baseTime } = getVilageFcstBaseDateTime();

  const params = new URLSearchParams({
    numOfRows: '1000',
    pageNo: '1',
    dataType: 'JSON',
    base_date: baseDate,
    base_time: baseTime,
    nx: String(nx),
    ny: String(ny),
  });

  // serviceKey는 이미 인코딩된 상태이므로 수동 추가
  const url = `${KMA_BASE}/getVilageFcst?serviceKey=${apiKey}&${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('날씨 데이터를 가져올 수 없습니다');

  const json = await res.json();
  const header = json.response?.header;

  if (!header || header.resultCode !== '00') {
    throw new Error(getKmaErrorMessage(header?.resultCode));
  }

  const items = json.response.body?.items?.item;
  if (!items || items.length === 0) {
    throw new Error('날씨 데이터가 비어있습니다. 잠시 후 다시 시도해주세요.');
  }

  const hourlyMap = groupByForecastTime(items);

  return {
    current: extractCurrent(hourlyMap),
    hourly: extractHourly(hourlyMap),
  };
}

/* ── 응답 파싱 ── */

/**
 * API 응답 아이템들을 예보 시각별로 그룹핑한다.
 */
function groupByForecastTime(items) {
  const map = {};

  for (const item of items) {
    const key = `${item.fcstDate}-${item.fcstTime}`;
    if (!map[key]) {
      map[key] = { fcstDate: item.fcstDate, fcstTime: item.fcstTime };
    }
    map[key][item.category] = item.fcstValue;
  }

  return map;
}

/**
 * 현재 시각에 가장 가까운 예보를 "현재 날씨"로 추출한다.
 */
function extractCurrent(hourlyMap) {
  const now = Date.now();
  const entries = Object.values(hourlyMap)
    .filter((e) => e.TMP && e.SKY)
    .sort((a, b) =>
      `${a.fcstDate}${a.fcstTime}`.localeCompare(`${b.fcstDate}${b.fcstTime}`)
    );

  let closest = entries[0];
  let minDiff = Infinity;

  for (const entry of entries) {
    const diff = Math.abs(kmaToTimestamp(entry.fcstDate, entry.fcstTime) - now);
    if (diff < minDiff) {
      minDiff = diff;
      closest = entry;
    }
  }

  return parseKmaEntry(closest);
}

/**
 * 미래 시간별 예보 배열을 추출한다.
 */
function extractHourly(hourlyMap) {
  const now = Date.now();

  return Object.values(hourlyMap)
    .filter((e) => e.TMP && e.SKY)
    .filter((e) => kmaToTimestamp(e.fcstDate, e.fcstTime) >= now)
    .sort((a, b) =>
      `${a.fcstDate}${a.fcstTime}`.localeCompare(`${b.fcstDate}${b.fcstTime}`)
    )
    .map((entry) => {
      const parsed = parseKmaEntry(entry);
      const time = kmaToDate(entry.fcstDate, entry.fcstTime);
      return {
        time,
        hour: time.getHours(),
        date: `${entry.fcstDate.substring(0, 4)}-${entry.fcstDate.substring(4, 6)}-${entry.fcstDate.substring(6, 8)}`,
        ...parsed,
      };
    });
}

/**
 * 하나의 예보 시각 데이터를 앱에서 사용하는 형태로 변환한다.
 */
function parseKmaEntry(entry) {
  const temp = parseFloat(entry.TMP);
  const windSpeedMs = parseFloat(entry.WSD || '0');
  const humidity = parseFloat(entry.REH || '50');
  const sky = parseInt(entry.SKY || '1');
  const pty = parseInt(entry.PTY || '0');

  const weatherCode = kmaToWmoCode(sky, pty);
  const wmo = WMO_CODES[weatherCode] || { emoji: '❓', label: '알 수 없음' };
  const apparentTemp = calcApparentTemp(temp, windSpeedMs, humidity);
  const fcstTime = kmaToDate(entry.fcstDate, entry.fcstTime);

  return {
    temp: Math.round(temp),
    apparentTemp,
    weatherCode,
    weatherEmoji: wmo.emoji,
    weatherLabel: wmo.label,
    windSpeed: Math.round(windSpeedMs * 3.6), // m/s → km/h
    humidity: Math.round(humidity),
    hour: fcstTime.getHours(),
  };
}

/* ── KMA → WMO 코드 매핑 ── */

function kmaToWmoCode(sky, pty) {
  // 강수형태(PTY) 우선
  switch (pty) {
    case 1: return 63; // 비
    case 2: return 67; // 비/눈
    case 3: return 73; // 눈
    case 4: return 81; // 소나기
    case 5: return 51; // 빗방울
    case 6: return 56; // 빗방울눈날림
    case 7: return 71; // 눈날림
  }
  // 하늘상태(SKY)
  switch (sky) {
    case 1: return 0;  // 맑음
    case 3: return 2;  // 구름많음
    case 4: return 3;  // 흐림
  }
  return 0;
}

/* ── 체감온도 계산 ── */

function calcApparentTemp(temp, windSpeedMs, humidity) {
  const v = windSpeedMs * 3.6; // m/s → km/h

  // 체감온도(Wind Chill): 기온 10°C 이하 + 풍속 4.8km/h 이상
  if (temp <= 10 && v >= 4.8) {
    return Math.round(
      13.12 + 0.6215 * temp
      - 11.37 * Math.pow(v, 0.16)
      + 0.3965 * temp * Math.pow(v, 0.16)
    );
  }

  // 열지수(Heat Index): 기온 27°C 이상
  if (temp >= 27) {
    const T = temp;
    const R = humidity;
    const hi =
      -8.78469475556 + 1.61139411 * T + 2.33854883889 * R
      - 0.14611605 * T * R - 0.012308094 * T * T
      - 0.0164248277778 * R * R + 0.002211732 * T * T * R
      + 0.00072546 * T * R * R - 0.000003582 * T * T * R * R;
    return Math.round(hi);
  }

  return Math.round(temp);
}

/* ── 날짜/시간 유틸 ── */

function kmaToDate(dateStr, timeStr) {
  const y = dateStr.substring(0, 4);
  const m = dateStr.substring(4, 6);
  const d = dateStr.substring(6, 8);
  const hh = timeStr.substring(0, 2);
  const mm = timeStr.substring(2, 4);
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(hh), parseInt(mm));
}

function kmaToTimestamp(dateStr, timeStr) {
  return kmaToDate(dateStr, timeStr).getTime();
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * 단기예보 base_date, base_time을 결정한다.
 * 발표시각: 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300
 * 각 발표시각 + 약 10분 후 API 제공 (15분 여유)
 */
function getVilageFcstBaseDateTime() {
  const now = new Date();
  const baseTimes = ['0200', '0500', '0800', '1100', '1400', '1700', '2000', '2300'];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let baseDate = formatDate(now);
  let baseTime = null;

  for (let i = baseTimes.length - 1; i >= 0; i--) {
    const btHour = parseInt(baseTimes[i].substring(0, 2));
    const btMinutes = btHour * 60 + 15; // 15분 여유
    if (currentMinutes >= btMinutes) {
      baseTime = baseTimes[i];
      break;
    }
  }

  if (!baseTime) {
    // 새벽 0시~2시 14분: 전날 2300 사용
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    baseDate = formatDate(yesterday);
    baseTime = '2300';
  }

  return { baseDate, baseTime };
}

/* ── 에러 메시지 ── */

function getKmaErrorMessage(code) {
  const messages = {
    '01': '기상청 서버 오류입니다. 잠시 후 다시 시도해주세요.',
    '02': '기상청 DB 오류입니다. 잠시 후 다시 시도해주세요.',
    '03': '데이터가 없습니다. 잠시 후 다시 시도해주세요.',
    '10': '잘못된 요청입니다.',
    '11': '필수 파라미터가 누락되었습니다.',
    '12': '해당 서비스를 찾을 수 없습니다.',
    '20': 'API 접근이 거부되었습니다. API 키를 확인해주세요.',
    '21': '일시적으로 API 키가 비활성화되었습니다.',
    '22': '일일 API 호출 한도를 초과했습니다.',
    '30': 'API 키가 등록되지 않았습니다. 키를 확인해주세요.',
    '31': 'API 키 사용 기한이 만료되었습니다.',
  };
  return messages[code] || `기상청 API 오류 (코드: ${code || '알 수 없음'})`;
}

/* ── 역지오코딩 (Nominatim - 기존 유지) ── */

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
    const city = addr.city || addr.town || addr.county || addr.state || '';
    const district = addr.borough || addr.suburb || addr.village || '';

    if (city && district) return `${city} ${district}`;
    if (city) return city;
    return data.display_name?.split(',')[0] || '내 위치';
  } catch {
    return '내 위치';
  }
}
