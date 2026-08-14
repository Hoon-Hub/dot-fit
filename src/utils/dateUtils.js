/**
 * 날짜 처리 관련 유틸리티 함수 모음
 */

const KOREAN_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 로컬 기준 오늘 날짜를 'YYYY-MM-DD' 형식으로 반환합니다.
 * @returns {string} 예: '2026-08-12'
 */
export function getTodayDateString(referenceDate = new Date()) {
  return getLocalDateKey(referenceDate);
}

export function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getStartOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseLocalDateKey(dateKey) {
  if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return null;
  }

  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (getLocalDateKey(date) !== dateKey) return null;
  return date;
}

export function addLocalDays(dateKey, days) {
  const date = parseLocalDateKey(dateKey);
  if (!date || !Number.isInteger(days)) return null;

  date.setDate(date.getDate() + days);
  return getLocalDateKey(date);
}

export function getDateKeysBetween(startDateKey, endDateKey) {
  const startDate = parseLocalDateKey(startDateKey);
  const endDate = parseLocalDateKey(endDateKey);
  if (!startDate || !endDate || startDate > endDate) return [];

  const dateKeys = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dateKeys.push(getLocalDateKey(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dateKeys;
}

export function getRecentDateKeys(days = 7, referenceDate = new Date()) {
  const startOfToday = getStartOfLocalDay(referenceDate);
  const dateKeys = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(startOfToday);
    date.setDate(startOfToday.getDate() - offset);
    dateKeys.push(getLocalDateKey(date));
  }

  return dateKeys;
}

export function getDateKeyFromHealthConnectBucket(bucketStartTime) {
  if (typeof bucketStartTime !== 'string') return null;

  const dateKey = bucketStartTime.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : null;
}

/**
 * 'YYYY-MM-DD' 날짜 문자열을 한국어 상세 날짜 형식으로 변환합니다.
 * @param {string} dateStr 예: '2026-08-12'
 * @returns {string} 예: '2026년 8월 12일 수요일'
 */
export function formatDateToKorean(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayOfWeek = KOREAN_DAYS[dateObj.getDay()];
  
  return `${year}년 ${month}월 ${day}일 ${dayOfWeek}요일`;
}

/**
 * 'YYYY-MM-DD' 날짜 문자열에서 짧은 날짜(월/일) 형식으로 변환합니다.
 * @param {string} dateStr 예: '2026-08-12'
 * @returns {string} 예: '8/12'
 */
export function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const [, month, day] = dateStr.split('-').map(Number);
  return `${month}/${day}`;
}

/**
 * 'YYYY-MM-DD' 날짜 문자열에서 요일(한 글자)을 반환합니다.
 * @param {string} dateStr 예: '2026-08-12'
 * @returns {string} 예: '수'
 */
export function getDayOfWeekShort(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  return KOREAN_DAYS[dateObj.getDay()];
}

/**
 * 입력된 'YYYY-MM-DD' 날짜가 오늘인지 여부를 반환합니다.
 * @param {string} dateStr 
 * @returns {boolean}
 */
export function isToday(dateStr) {
  return dateStr === getTodayDateString();
}

/**
 * 숫자를 1,000 단위 쉼표(,)가 포함된 문자열로 포맷팅합니다.
 * @param {number} num 
 * @returns {string} 예: '8,421'
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('ko-KR');
}
