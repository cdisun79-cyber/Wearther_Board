// api/kma.js – GET /api/kma?region=대전 : 그 지역의 일정 · 날씨 · 판단을 JSON 으로 돌려줌
// 접근 키 없이 누구나 호출할 수 있음 (가상 데이터만 다룸). 비밀 값은 코드에 적지 않는다.

const { REGIONS, judge, buildWeatherUrl, parseWeather } = require('../logic.js');
const { SUPABASE_URL, SUPABASE_ANON_KEY } = require('../config.js');

function send(res, status, body) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'GET 만 지원합니다' });

  const region = req.query && req.query.region;
  if (!region || !Object.prototype.hasOwnProperty.call(REGIONS, region)) {
    return send(res, 400, { error: 'region 은 ' + Object.keys(REGIONS).join(' · ') + ' 중 하나여야 합니다' });
  }

  try {
    const [taskRes, weatherRes] = await Promise.all([
      fetch(SUPABASE_URL + '/rest/v1/wx_tasks?select=title,region,kind,owner&order=id&region=eq.' + encodeURIComponent(region), {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY },
      }),
      fetch(buildWeatherUrl()),
    ]);
    if (!taskRes.ok) throw new Error('일정 조회 실패 ' + taskRes.status);
    if (!weatherRes.ok) throw new Error('날씨 조회 실패 ' + weatherRes.status);

    const rows = await taskRes.json();
    const weather = parseWeather(await weatherRes.json())[region];
    const tasks = rows.map(t => ({ ...t, judgment: judge(t.kind, weather) }));
    const date = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

    return send(res, 200, { region, date, weather, tasks });
  } catch (err) {
    return send(res, 502, { error: '일정 또는 날씨를 가져오지 못했습니다' });
  }
};
