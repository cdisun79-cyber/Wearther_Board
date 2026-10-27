// api/kma.js – GET /api/kma?region=대전 : 그 지역의 일정 · 날씨 · 판단을 JSON 으로 돌려줌
// 접근 키는 Vercel 환경변수 KMA_KEY (코드에 적지 않음). 호출할 때 헤더 x-kma-key 로 보낸다.

const crypto = require('crypto');
const { REGIONS, judge, buildWeatherUrl, parseWeather } = require('../logic.js');
const { SUPABASE_URL, SUPABASE_ANON_KEY } = require('../config.js');

function send(res, status, body) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(JSON.stringify(body));
}

// 키 비교 (길이가 달라도 시간 차이로 알아내지 못하게)
function sameKey(sent, expected) {
  const a = crypto.createHash('sha256').update(String(sent || '')).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'GET 만 지원합니다' });

  const expected = process.env.KMA_KEY;
  if (!expected) return send(res, 500, { error: '서버 설정 오류' });
  if (!sameKey(req.headers['x-kma-key'], expected)) return send(res, 401, { error: '접근 키가 올바르지 않습니다' });

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
