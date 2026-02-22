import {
  CLOTHING_LEVELS,
  WEATHER_ALERTS,
  WIND_THRESHOLD,
  WIND_ALERT,
  SUNNY_HOURS,
  SUNNY_CODES,
  UV_ALERT,
  TIME_BLOCKS,
  CATEGORY_LABELS,
} from './constants.js';

/**
 * 체감온도와 날씨 조건으로 옷차림 추천을 반환한다.
 * @param {object} weather - { apparentTemp, weatherCode, windSpeed, hour }
 * @returns {object} { level, alerts }
 */
export function getRecommendation(weather) {
  const { apparentTemp, weatherCode, windSpeed, hour } = weather;

  const level = CLOTHING_LEVELS.find(
    (l) => apparentTemp >= l.min && apparentTemp <= l.max
  ) || CLOTHING_LEVELS[CLOTHING_LEVELS.length - 1];

  const alerts = [];

  for (const key of Object.keys(WEATHER_ALERTS)) {
    const alert = WEATHER_ALERTS[key];
    if (alert.codes.includes(weatherCode)) {
      alerts.push(alert.message);
    }
  }

  if (windSpeed >= WIND_THRESHOLD) {
    alerts.push(WIND_ALERT);
  }

  if (
    SUNNY_CODES.includes(weatherCode) &&
    hour >= SUNNY_HOURS.start &&
    hour < SUNNY_HOURS.end
  ) {
    alerts.push(UV_ALERT);
  }

  return { level, alerts };
}

// 눈 관련 WMO 코드
const SNOW_CODES = [71, 73, 75, 77, 85, 86];
// 비 관련 WMO 코드
const RAIN_CODES = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];

/**
 * 시간대 블록의 hourly 데이터를 분석해서 카테고리별 옷차림 추천을 생성한다.
 * 최저 체감온도 기준으로 옷차림을 결정하고, 날씨 조건에 따라 코멘트를 추가한다.
 */
export function getTimeBlockRecommendation(hourlySlice) {
  if (!hourlySlice || hourlySlice.length === 0) return null;

  // 시간대 내 최저 체감온도 기준
  const minApparent = Math.min(...hourlySlice.map((h) => h.apparentTemp));
  const maxApparent = Math.max(...hourlySlice.map((h) => h.apparentTemp));
  const avgTemp = Math.round(
    hourlySlice.reduce((sum, h) => sum + h.temp, 0) / hourlySlice.length
  );
  const maxWind = Math.max(...hourlySlice.map((h) => h.windSpeed));

  // 대표 날씨 코드 (가장 안 좋은 것 기준)
  const weatherCodes = hourlySlice.map((h) => h.weatherCode);
  const hasSnow = weatherCodes.some((c) => SNOW_CODES.includes(c));
  const hasRain = weatherCodes.some((c) => RAIN_CODES.includes(c));
  const isWindy = maxWind >= WIND_THRESHOLD;

  // 체감온도로 옷차림 단계 결정
  const level = CLOTHING_LEVELS.find(
    (l) => minApparent >= l.min && minApparent <= l.max
  ) || CLOTHING_LEVELS[CLOTHING_LEVELS.length - 1];

  // 카테고리별 추천 복사 (날씨 조건으로 수정할 수 있도록)
  const clothes = { ...level.clothes };

  // 날씨 조건별 구체적 코멘트
  const comments = [];

  if (hasSnow) {
    clothes.shoes = '방수 부츠 (눈 오니까 필수!)';
    comments.push('🌨️ 눈 예보가 있어요 — 미끄러우니 조심하세요');
  }

  if (hasRain) {
    clothes.accessories = clothes.accessories === '없음'
      ? '우산 필수'
      : clothes.accessories + ', 우산 필수';
    comments.push('☂️ 비 예보 — 우산 꼭 챙기세요');
  }

  if (isWindy) {
    comments.push(`💨 바람 최대 ${maxWind}km/h — 지퍼 꼭 올리기!`);
    if (!clothes.top.includes('바람막이') && !clothes.top.includes('패딩')) {
      comments.push('🧥 바람막이를 추천해요');
    }
  }

  // 대표 날씨 이모지/라벨 (가장 빈번한 코드)
  const codeFreq = {};
  weatherCodes.forEach((c) => { codeFreq[c] = (codeFreq[c] || 0) + 1; });
  const dominantCode = Number(
    Object.entries(codeFreq).sort((a, b) => b[1] - a[1])[0][0]
  );

  return {
    level,
    clothes,
    comments,
    minApparent,
    maxApparent,
    avgTemp,
    maxWind,
    hasSnow,
    hasRain,
    isWindy,
    dominantCode,
  };
}

/**
 * 시간대 블록 간 옷차림이 동일한지 비교한다.
 */
function isSameClothes(a, b) {
  if (!a || !b) return false;
  return Object.keys(CATEGORY_LABELS).every(
    (key) => a.clothes[key] === b.clothes[key]
  );
}

/**
 * 하루 전체 날씨 패턴을 분석해서 핵심 요약 문장 배열을 생성한다.
 */
export function generateSummary(blockResults) {
  const summary = [];
  const validBlocks = blockResults.filter((b) => b.result !== null);

  if (validBlocks.length === 0) return ['날씨 데이터가 부족합니다'];

  // 기온 변화 분석
  const allMin = Math.min(...validBlocks.map((b) => b.result.minApparent));
  const allMax = Math.max(...validBlocks.map((b) => b.result.maxApparent));
  const tempRange = allMax - allMin;

  if (tempRange >= 10) {
    summary.push(`🌡️ 일교차가 ${tempRange}°로 매우 커요 — 겹쳐입기 필수!`);
  } else if (tempRange >= 6) {
    summary.push(`🌡️ 일교차 ${tempRange}° — 얇은 겉옷을 챙기세요`);
  }

  // 강수 패턴 분석
  const hasAnyRain = validBlocks.some((b) => b.result.hasRain);
  const hasAnySnow = validBlocks.some((b) => b.result.hasSnow);

  if (hasAnySnow) {
    summary.push('❄️ 오늘 눈 예보가 있어요 — 방수 신발 필수');
  } else if (hasAnyRain) {
    summary.push('🌧️ 비 예보 — 우산 잊지 마세요');
  }

  // 바람 패턴
  const hasAnyWind = validBlocks.some((b) => b.result.isWindy);
  if (hasAnyWind) {
    const maxWind = Math.max(...validBlocks.map((b) => b.result.maxWind));
    summary.push(`💨 바람이 최대 ${maxWind}km/h — 바람막이 추천`);
  }

  // 시간대 간 옷차림 변화
  if (validBlocks.length >= 2) {
    const allSame = validBlocks.every((b, i) =>
      i === 0 || isSameClothes(validBlocks[0].result, b.result)
    );
    if (allSame) {
      summary.push('👍 하루 종일 비슷한 옷차림이면 OK');
    }
  }

  if (summary.length === 0) {
    summary.push('✅ 무난한 날씨예요 — 편하게 입으세요');
  }

  return summary;
}

/**
 * 시간대별 추천 + 요약을 한번에 생성한다.
 */
export function analyzeTimeBlocks(hourly) {
  const blockResults = TIME_BLOCKS.map((block) => {
    const slice = hourly.filter(
      (h) => h.hour >= block.startHour && h.hour <= block.endHour
    );
    const result = getTimeBlockRecommendation(slice);

    // 이전 블록과 동일한지 체크용
    return { block, result, hourlySlice: slice };
  });

  // 시간대 간 "아침과 동일" 같은 참고 표시
  for (let i = 1; i < blockResults.length; i++) {
    const prev = blockResults[i - 1];
    const curr = blockResults[i];
    if (curr.result && prev.result && isSameClothes(prev.result, curr.result)) {
      curr.sameAsPrev = prev.block.label;
    }
  }

  const summary = generateSummary(blockResults);

  return { blockResults, summary };
}
