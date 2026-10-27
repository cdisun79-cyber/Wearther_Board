// app.js – 화면 동작 (목록 그리기, 일정 추가)

let tasks = [];
let tasksLoadFailed = false;   // Supabase 에서 일정을 못 읽었을 때
let weatherByRegion = {};   // 03 단원에서 지역별 날씨를 넣음
const windTest = new URLSearchParams(location.search).get('test') === 'wind';   // 주소 끝 ?test=wind

// 연결 정보는 config.js (주소 · 공개용 키). 없거나 틀리면 db 는 null 이고 목록은 못 읽음
let db = null;
try {
  db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (err) {
  db = null;
}

// Supabase 표 wx_tasks 에서 일정을 id 순서로 읽음
async function loadTasks() {
  try {
    if (!db) throw new Error('연결 정보가 없습니다');
    const { data, error } = await db.from('wx_tasks').select('title, region, kind, owner').order('id');
    if (error) throw error;
    tasks = data;
    tasksLoadFailed = false;
  } catch (err) {
    tasks = [];
    tasksLoadFailed = true;
  }
}

// 이 PC 시계 기준 오늘 날짜 YYYY-MM-DD
function todayText() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

function showToday() {
  document.getElementById('todayBox').textContent = todayText();
}

// 지금 표를 마크다운 파일로 내려받기 (일정을 못 읽은 상태면 아무것도 만들지 않음)
function saveMarkdown() {
  if (tasksLoadFailed) return;
  const rows = tasks.map(t => {
    const w = weatherByRegion[t.region];
    return { title: t.title, region: t.region, kind: t.kind, owner: t.owner,
             weather: weatherText(w), judge: judge(t.kind, w).text };
  });
  const dateText = todayText();
  const blob = new Blob([buildMarkdown(dateText, rows, windTest)], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = mdFileName(dateText);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function weatherText(w) {
  return w ? w.tempMax + '℃ · ' + w.windMax + 'm/s · ' + w.rainProb + '%' : '-';
}

function renderTasks() {
  const body = document.getElementById('taskList');
  body.innerHTML = '';
  if (tasksLoadFailed) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'stop';
    td.textContent = '배포주소로 열어주세요';
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }
  for (const t of tasks) {
    const w = weatherByRegion[t.region];
    const r = judge(t.kind, w);
    const tr = document.createElement('tr');
    for (const v of [t.title, t.region, t.kind, t.owner, weatherText(w)]) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    }
    const td = document.createElement('td');
    td.textContent = r.text;
    td.className = r.level;
    tr.appendChild(td);
    body.appendChild(tr);
  }
}

async function addTask(e) {
  e.preventDefault();
  const t = {
    title: document.getElementById('titleInput').value.trim(),
    region: document.getElementById('regionInput').value,
    kind: document.getElementById('kindInput').value,
    owner: document.getElementById('ownerInput').value.trim(),
  };
  if (!t.title || !t.owner) return;
  const msg = document.getElementById('msgBox');
  const { error } = db ? await db.from('wx_tasks').insert(t) : { error: true };
  if (error) {
    msg.textContent = '일정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    return;
  }
  msg.textContent = '';
  e.target.reset();
  await loadTasks();
  renderTasks();
}

document.getElementById('taskForm').addEventListener('submit', addTask);
document.getElementById('saveMdBtn').addEventListener('click', saveMarkdown);
// 지역별 날씨를 받아 weatherBox 에 보여 주고 목록을 다시 그림 (실패해도 목록은 그대로)
async function loadWeather() {
  const box = document.getElementById('weatherBox');
  try {
    const res = await fetch(buildWeatherUrl());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    let weather = parseWeather(await res.json());
    if (windTest) weather = applyWindTest(weather, 12);
    weatherByRegion = weather;
    const lines = Object.keys(weather).map(name => name + ' ' + weatherText(weather[name]));
    box.textContent = (windTest ? '[시험 모드: 풍속 12 m/s] ' : '') + '오늘 날씨 – ' + lines.join(' / ');
  } catch (err) {
    weatherByRegion = {};
    box.textContent = '날씨를 불러오지 못했습니다. 일정 목록은 그대로 볼 수 있습니다.';
  }
  renderTasks();
}

async function start() {
  showToday();
  await loadTasks();
  renderTasks();
  loadWeather();
}

start();
