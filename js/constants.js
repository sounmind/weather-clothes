// WMO Weather interpretation codes → emoji + 한국어 설명
export const WMO_CODES = {
  0: { emoji: '☀️', label: '맑음' },
  1: { emoji: '🌤️', label: '대체로 맑음' },
  2: { emoji: '⛅', label: '구름 조금' },
  3: { emoji: '☁️', label: '흐림' },
  45: { emoji: '🌫️', label: '안개' },
  48: { emoji: '🌫️', label: '짙은 안개' },
  51: { emoji: '🌦️', label: '가벼운 이슬비' },
  53: { emoji: '🌦️', label: '이슬비' },
  55: { emoji: '🌦️', label: '짙은 이슬비' },
  56: { emoji: '🌧️', label: '얼어붙는 이슬비' },
  57: { emoji: '🌧️', label: '강한 얼어붙는 이슬비' },
  61: { emoji: '🌧️', label: '약한 비' },
  63: { emoji: '🌧️', label: '비' },
  65: { emoji: '🌧️', label: '강한 비' },
  66: { emoji: '🌧️', label: '얼어붙는 비' },
  67: { emoji: '🌧️', label: '강한 얼어붙는 비' },
  71: { emoji: '🌨️', label: '약한 눈' },
  73: { emoji: '🌨️', label: '눈' },
  75: { emoji: '❄️', label: '강한 눈' },
  77: { emoji: '❄️', label: '싸라기눈' },
  80: { emoji: '🌧️', label: '약한 소나기' },
  81: { emoji: '🌧️', label: '소나기' },
  82: { emoji: '🌧️', label: '강한 소나기' },
  85: { emoji: '🌨️', label: '약한 눈보라' },
  86: { emoji: '🌨️', label: '강한 눈보라' },
  95: { emoji: '⛈️', label: '뇌우' },
  96: { emoji: '⛈️', label: '우박 뇌우' },
  99: { emoji: '⛈️', label: '강한 우박 뇌우' },
};

// 체감온도 기준 옷차림 추천 단계 (카테고리별)
export const CLOTHING_LEVELS = [
  {
    min: 28,
    max: Infinity,
    label: '매우 더움',
    color: '#e74c3c',
    clothes: { top: '민소매/반팔', bottom: '반바지', shoes: '샌들/슬리퍼', accessories: '모자, 선글라스' },
    icon: '🥵',
  },
  {
    min: 23,
    max: 27,
    label: '더움',
    color: '#e67e22',
    clothes: { top: '반팔', bottom: '면바지/반바지', shoes: '운동화/샌들', accessories: '없음' },
    icon: '😎',
  },
  {
    min: 20,
    max: 22,
    label: '따뜻함',
    color: '#f1c40f',
    clothes: { top: '얇은 긴팔/가디건', bottom: '면바지', shoes: '운동화', accessories: '없음' },
    icon: '😊',
  },
  {
    min: 17,
    max: 19,
    label: '선선함',
    color: '#2ecc71',
    clothes: { top: '긴팔/얇은 자켓', bottom: '청바지', shoes: '운동화', accessories: '없음' },
    icon: '🙂',
  },
  {
    min: 12,
    max: 16,
    label: '쌀쌀함',
    color: '#1abc9c',
    clothes: { top: '니트/맨투맨+자켓', bottom: '청바지', shoes: '운동화/부츠', accessories: '없음' },
    icon: '🧥',
  },
  {
    min: 9,
    max: 11,
    label: '추움',
    color: '#3498db',
    clothes: { top: '니트+코트/패딩', bottom: '기모바지', shoes: '부츠', accessories: '목도리' },
    icon: '🥶',
  },
  {
    min: 5,
    max: 8,
    label: '매우 추움',
    color: '#2980b9',
    clothes: { top: '히트텍+두꺼운 니트+롱패딩', bottom: '기모바지', shoes: '방한부츠', accessories: '목도리, 장갑' },
    icon: '🧣',
  },
  {
    min: -Infinity,
    max: 4,
    label: '한파',
    color: '#8e44ad',
    clothes: { top: '히트텍+기모내복+롱패딩', bottom: '기모바지', shoes: '방한부츠', accessories: '목도리, 장갑, 귀마개' },
    icon: '🥶',
  },
];

// 시간대 블록 정의
export const TIME_BLOCKS = [
  { key: 'dawn', label: '새벽', emoji: '🌃', startHour: 0, endHour: 6 },
  { key: 'morning', label: '아침', emoji: '🌅', startHour: 7, endHour: 12 },
  { key: 'afternoon', label: '오후', emoji: '🌤', startHour: 13, endHour: 18 },
  { key: 'evening', label: '저녁', emoji: '🌙', startHour: 19, endHour: 23 },
];

// 카테고리 레이블
export const CATEGORY_LABELS = {
  top: '상의',
  bottom: '하의',
  shoes: '신발',
  accessories: '액세서리',
};

// 날씨 조건별 추가 안내
export const WEATHER_ALERTS = {
  rain: { codes: [51,53,55,56,57,61,63,65,66,67,80,81,82], message: '☂️ 우산을 챙기세요' },
  snow: { codes: [71,73,75,77,85,86], message: '🥾 방수 부츠를 추천해요' },
  thunder: { codes: [95,96,99], message: '⚡ 뇌우 예보! 외출을 자제하세요' },
};

export const WIND_THRESHOLD = 30; // km/h
export const WIND_ALERT = '💨 바람이 강해요, 바람막이를 추천해요';

export const SUNNY_HOURS = { start: 10, end: 16 };
export const SUNNY_CODES = [0, 1];
export const UV_ALERT = '🧴 자외선 차단제를 바르세요';
