import { fetchWeather, fetchLocationName, getApiKey, setApiKey } from './api.js';
import { showScreen, showError, renderMain } from './ui.js';

async function init() {
  if (!getApiKey()) {
    showScreen('setup');
    return;
  }

  showScreen('loading');

  try {
    const { latitude, longitude } = await getPosition();
    const [weather, locationName] = await Promise.all([
      fetchWeather(latitude, longitude),
      fetchLocationName(latitude, longitude),
    ]);

    renderMain(weather.current, weather.hourly, locationName);
  } catch (err) {
    showError(err.message);
  }
}

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('이 브라우저는 위치 서비스를 지원하지 않습니다'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            reject(new Error('위치 권한이 거부되었습니다.\n브라우저 설정에서 위치 권한을 허용해주세요.'));
            break;
          case err.POSITION_UNAVAILABLE:
            reject(new Error('위치 정보를 가져올 수 없습니다'));
            break;
          case err.TIMEOUT:
            reject(new Error('위치 요청 시간이 초과되었습니다'));
            break;
          default:
            reject(new Error('알 수 없는 위치 오류가 발생했습니다'));
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

// API 키 설정 폼
document.getElementById('api-key-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('api-key-input');
  const key = input.value.trim();
  if (key) {
    setApiKey(key);
    init();
  }
});

// 설정 버튼 (API 키 재설정)
document.getElementById('settings-btn')?.addEventListener('click', () => {
  document.getElementById('api-key-input').value = getApiKey();
  showScreen('setup');
});

// 재시도 버튼
document.getElementById('retry-btn')?.addEventListener('click', init);

// API 키 재설정 버튼 (에러 화면)
document.getElementById('reset-key-btn')?.addEventListener('click', () => {
  document.getElementById('api-key-input').value = getApiKey();
  showScreen('setup');
});

// 새로고침 버튼
document.getElementById('refresh-btn')?.addEventListener('click', init);

// 앱 시작
init();
