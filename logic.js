// logic.js – 판단 규칙만 (화면을 다루는 코드 금지)

// 교육용 가상 기준 (실제 작업 중지 · 행사 취소 기준은 각 기관 규정을 따름)
const RULES = { wind: 10, rain: 60, heat: 33 };

// 일정 구분과 날씨로 판단 (w가 없으면 '날씨 확인 전')
function judge(kind, w) {
  if (!w) return { level: 'none', text: '날씨 확인 전' };
  if (kind === '실내') return { level: 'ok', text: '영향 없음' };
  if (kind === '고소' && w.windMax >= RULES.wind) return { level: 'stop', text: '중지 검토 (강풍)' };
  if (w.tempMax >= RULES.heat) return { level: 'warn', text: '폭염 휴식' };
  if (w.rainProb >= RULES.rain) return { level: 'warn', text: '우천 주의' };
  return { level: 'ok', text: '진행' };
}

// 지역별 좌표 (공개 지리 정보, 도시 중심 부근)
const REGIONS = {
  '세종': { lat: 36.48, lon: 127.29 },
  '대전': { lat: 36.35, lon: 127.38 },
  '태안': { lat: 36.75, lon: 126.30 },
  '보령': { lat: 36.33, lon: 126.61 },
};

// Open-Meteo 주소 만들기 : 4곳을 한 번에, 오늘 하루, 풍속은 m/s
function buildWeatherUrl() {
  const names = Object.keys(REGIONS);
  const lat = names.map(n => REGIONS[n].lat).join(',');
  const lon = names.map(n => REGIONS[n].lon).join(',');
  return 'https://api.open-meteo.com/v1/forecast'
    + '?latitude=' + lat + '&longitude=' + lon
    + '&daily=temperature_2m_max,wind_speed_10m_max,precipitation_probability_max'
    + '&wind_speed_unit=ms&timezone=Asia%2FSeoul&forecast_days=1';
}

// 응답 해석 : { 세종: { tempMax, windMax, rainProb }, … } (모양이 이상하면 오류)
function parseWeather(data) {
  const list = Array.isArray(data) ? data : [data];
  const names = Object.keys(REGIONS);
  if (list.length !== names.length) throw new Error('날씨 응답 모양이 다릅니다');
  const result = {};
  names.forEach((name, i) => {
    const d = list[i] && list[i].daily;
    const tempMax = d && d.temperature_2m_max && d.temperature_2m_max[0];
    const windMax = d && d.wind_speed_10m_max && d.wind_speed_10m_max[0];
    const rainProb = d && d.precipitation_probability_max && d.precipitation_probability_max[0];
    if (![tempMax, windMax, rainProb].every(Number.isFinite)) throw new Error('날씨 값이 없습니다');
    result[name] = { tempMax, windMax, rainProb };
  });
  return result;
}

// 시험용 : 모든 지역의 최대 풍속을 바꿈
function applyWindTest(weather, wind) {
  const result = {};
  for (const name of Object.keys(weather)) result[name] = { ...weather[name], windMax: wind };
  return result;
}

// 마크다운 표 칸에 넣을 글자 정리 ( | 와 줄바꿈이 표를 깨지 않게 )
function mdCell(v) {
  return String(v).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

// 파일 이름 : 현장일정_판단_YYYY-MM-DD.md
function mdFileName(dateText) {
  return '현장일정_판단_' + dateText + '.md';
}

// 오늘 판단을 마크다운 표로 만들기 (rows: { title, region, kind, owner, weather, judge })
function buildMarkdown(dateText, rows, testMode) {
  const lines = ['# 현장 일정 판단 – ' + dateText, ''];
  if (testMode) lines.push('(시험 모드: 풍속 12 m/s 로 바꾼 값입니다)', '');
  lines.push('| 일정 | 지역 | 구분 | 담당 | 날씨 | 판단 |', '|---|---|---|---|---|---|');
  for (const r of rows) {
    lines.push('| ' + [r.title, r.region, r.kind, r.owner, r.weather, r.judge].map(mdCell).join(' | ') + ' |');
  }
  lines.push('', '판단 기준(교육용 가상): 고소 · 풍속 ' + RULES.wind + 'm/s 이상 중지 검토 / 기온 '
    + RULES.heat + '℃ 이상 폭염 휴식 / 강수확률 ' + RULES.rain + '% 이상 우천 주의 / 실내 영향 없음');
  return lines.join('\n') + '\n';
}

if (typeof module !== 'undefined') module.exports = { RULES, REGIONS, judge, buildWeatherUrl, parseWeather, applyWindTest, mdFileName, buildMarkdown };
