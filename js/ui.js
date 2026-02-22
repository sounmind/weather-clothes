import { getRecommendation, analyzeTimeBlocks } from './recommendation.js';
import { WMO_CODES, CATEGORY_LABELS } from './constants.js';

const $ = (sel) => document.querySelector(sel);

/** 화면 전환: loading / error / main 중 하나만 표시 */
export function showScreen(name) {
  document.querySelectorAll('.screen').forEach((el) => {
    el.classList.toggle('active', el.id === `screen-${name}`);
  });
}

/** 에러 화면 표시 */
export function showError(message) {
  $('#error-message').textContent = message;
  showScreen('error');
}

/** 메인 화면 전체 렌더링 */
export function renderMain(current, hourly, locationName) {
  renderLocation(locationName);
  renderCurrentWeather(current);
  renderRecommendation(current);
  renderWeeklyTimeBlocks(hourly);
  showScreen('main');
}

function renderLocation(name) {
  $('#location-name').textContent = name;
  $('#update-time').textContent = formatTime(new Date());
}

function renderCurrentWeather(current) {
  $('#current-emoji').textContent = current.weatherEmoji;
  $('#current-temp').textContent = `${current.temp}°`;
  $('#current-apparent').textContent = `체감 ${current.apparentTemp}°`;
  $('#current-label').textContent = current.weatherLabel;
  $('#current-detail').textContent =
    `습도 ${current.humidity}%  ·  바람 ${current.windSpeed}km/h`;
}

function renderRecommendation(weather) {
  const { level, alerts } = getRecommendation(weather);

  const card = $('#recommendation-card');
  card.style.setProperty('--accent', level.color);

  $('#rec-icon').textContent = level.icon;
  $('#rec-label').textContent = level.label;

  const clothes = level.clothes;
  const tags = Object.entries(CATEGORY_LABELS)
    .map(([key, label]) => `<span class="clothes-tag">${label}: ${clothes[key]}</span>`)
    .join('');
  $('#rec-clothes').innerHTML = tags;

  const alertsEl = $('#rec-alerts');
  if (alerts.length > 0) {
    alertsEl.innerHTML = alerts
      .map((a) => `<div class="alert-item">${a}</div>`)
      .join('');
    alertsEl.hidden = false;
  } else {
    alertsEl.hidden = true;
  }
}

/** 날짜별 데이터 캐시 */
let dayDataCache = [];
let currentDayIndex = 0;

/** 일주일치 시간대별 가이드 렌더링 */
function renderWeeklyTimeBlocks(hourly) {
  // 날짜별로 그룹핑
  const byDate = {};
  hourly.forEach((h) => {
    if (!byDate[h.date]) byDate[h.date] = [];
    byDate[h.date].push(h);
  });

  const dates = Object.keys(byDate).sort();
  dayDataCache = [];

  dates.forEach((date, idx) => {
    const dayHourly = byDate[date];
    const { blockResults, summary } = analyzeTimeBlocks(dayHourly);

    // 대표 날씨 이모지: 첫 번째 유효 블록의 dominantCode
    const firstResult = blockResults.find((b) => b.result)?.result;
    const dominantWmo = firstResult
      ? (WMO_CODES[firstResult.dominantCode] || { emoji: '❓' })
      : { emoji: '❓' };

    // 하루 전체 최저/최고 체감 온도
    const allApparents = blockResults
      .filter((b) => b.result)
      .flatMap((b) => [b.result.minApparent, b.result.maxApparent]);
    const dayMin = allApparents.length > 0 ? Math.min(...allApparents) : null;
    const dayMax = allApparents.length > 0 ? Math.max(...allApparents) : null;

    // 시간대 블록 HTML 생성
    let blocksHtml = '';
    blockResults.forEach(({ block, result, sameAsPrev }) => {
      if (!result) return;
      const wmo = WMO_CODES[result.dominantCode] || { emoji: '❓', label: '알 수 없음' };
      blocksHtml += `
        <div class="timeblock-card" style="--accent: ${result.level.color}">
          <div class="timeblock-header">
            <span class="timeblock-emoji">${block.emoji}</span>
            <span class="timeblock-label">${block.label}</span>
            <span class="timeblock-weather">${wmo.emoji} ${wmo.label}</span>
            <span class="timeblock-temp">${result.minApparent}°~${result.maxApparent}° <small>체감</small></span>
          </div>
          ${sameAsPrev
            ? `<div class="timeblock-same">👆 ${sameAsPrev}과 동일한 옷차림</div>`
            : renderClothesTable(result.clothes)
          }
          ${result.comments.length > 0
            ? `<div class="timeblock-comments">${result.comments.map((c) => `<div class="comment-item">${c}</div>`).join('')}</div>`
            : ''
          }
        </div>`;
    });

    dayDataCache.push({
      date,
      label: formatDateLabel(date, idx),
      weatherEmoji: dominantWmo.emoji,
      dayMin,
      dayMax,
      blocksHtml,
      summary,
    });
  });

  renderDateTabs();
  showDay(0);
}

/** 날짜 탭 바 렌더링 */
function renderDateTabs() {
  const tabsContainer = $('#date-tabs');
  tabsContainer.innerHTML = dayDataCache
    .map((day, idx) => {
      const tempRange = day.dayMin !== null ? `${day.dayMin}°~${day.dayMax}°` : '';
      return `<button class="date-tab" data-index="${idx}">
        <span class="date-tab-label">${day.label}</span>
        <span class="date-tab-preview">${day.weatherEmoji} ${tempRange}</span>
      </button>`;
    })
    .join('');

  tabsContainer.addEventListener('click', (e) => {
    const tab = e.target.closest('.date-tab');
    if (!tab) return;
    showDay(Number(tab.dataset.index));
  });
}

/** 선택된 날짜의 시간대 블록 + 요약 표시 */
function showDay(index) {
  currentDayIndex = index;
  const day = dayDataCache[index];
  if (!day) return;

  const container = $('#weekly-guide');
  const summaryContainer = $('#weekly-summary');

  // 시간대 블록 교체 (fade 애니메이션)
  container.innerHTML = `<div class="day-content">${day.blocksHtml}</div>`;

  // 선택된 날짜 요약
  const uniqueSummaries = [...new Set(day.summary)];
  summaryContainer.innerHTML = uniqueSummaries
    .map((s) => `<div class="summary-item">${s}</div>`)
    .join('');

  // 탭 active 상태 토글
  document.querySelectorAll('.date-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === index);
  });

  // 선택된 탭이 보이도록 스크롤
  const activeTab = document.querySelector('.date-tab.active');
  if (activeTab) {
    activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
}

function renderClothesTable(clothes) {
  const rows = Object.entries(CATEGORY_LABELS)
    .map(([key, label]) => `
      <tr>
        <td class="cat-label">${label}</td>
        <td class="cat-value">${clothes[key]}</td>
      </tr>`)
    .join('');

  return `<table class="clothes-table"><tbody>${rows}</tbody></table>`;
}

function formatTime(date) {
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateLabel(dateStr, index) {
  const date = new Date(dateStr + 'T00:00:00');
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayName = dayNames[date.getDay()];

  if (index === 0) return `오늘 (${month}/${day} ${dayName})`;
  if (index === 1) return `내일 (${month}/${day} ${dayName})`;
  return `${month}/${day} (${dayName})`;
}
