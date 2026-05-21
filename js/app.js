/* ===================================================
   CPPG 문제은행 — 바닐라 JS 단일 파일 앱
   GitHub Pages 정적 배포 / localStorage 기반
   =================================================== */

/* ===== 상수 ===== */
const AREAS = [
  { id: 1, name: '개인정보보호의 이해' },
  { id: 2, name: '개인정보보호 제도' },
  { id: 3, name: '개인정보 라이프사이클 관리' },
  { id: 4, name: '개인정보의 보호조치' },
  { id: 5, name: '개인정보 관리체계' },
];
const PASS_SCORE = 60;
const EXAM_SIZES = [20, 50, 100];
const MIN_PER_Q_SEC = 72; // 1문항당 72초 (100문항→120분)
const NS = 'cppg.';
const KEY = {
  stats: NS + 'stats',
  wrong: NS + 'wrong',
  bookmarks: NS + 'bookmarks',
  streak: NS + 'streak',
  settings: NS + 'settings',
};

/* ===== 전역 상태 ===== */
let ALL_Q = [];      // 전체 문제 배열
let state = null;    // 현재 세션 상태 (퀴즈/시험)

/* ===== localStorage 헬퍼 ===== */
const ls = {
  get: (k, def) => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; }
    catch { return def; }
  },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

/* ===== 기본 구조체 ===== */
function defaultStats() {
  return { total: 0, correct: 0, bestExam: 0, byArea: {} };
}
function defaultSettings() {
  return { weakFirst: false, timer: true, theme: 'light' };
}
function getStats()    { return ls.get(KEY.stats,    defaultStats()); }
function getSettings() { return ls.get(KEY.settings, defaultSettings()); }
function getWrong()    { return new Set(ls.get(KEY.wrong,     [])); }
function getBookmarks(){ return new Set(ls.get(KEY.bookmarks, [])); }
function getStreak()   { return ls.get(KEY.streak,   {}); }

function saveStats(s)    { ls.set(KEY.stats,    s); }
function saveSettings(s) { ls.set(KEY.settings, s); }
function saveWrong(s)    { ls.set(KEY.wrong,    [...s]); }
function saveBookmarks(s){ ls.set(KEY.bookmarks,[...s]); }
function saveStreak(o)   { ls.set(KEY.streak,   o); }

/* ===== 유틸 ===== */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }

function todayKey() { return new Date().toISOString().slice(0, 10); }

function recordStreak() {
  const o = getStreak();
  const k = todayKey();
  o[k] = (o[k] || 0) + 1;
  // 90일 이상 오래된 키 정리
  const cutoff = new Date(Date.now() - 90 * 86400 * 1000).toISOString().slice(0, 10);
  Object.keys(o).filter(d => d < cutoff).forEach(d => delete o[d]);
  saveStreak(o);
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/* ===== 셔플된 문제 준비 ===== */
// 정답 인덱스를 보기 셔플 후에도 추적하기 위해 셔플된 options와 새 answer를 반환
function prepareQuestion(q) {
  const idxs = shuffle([0, 1, 2, 3]);
  const newOptions = idxs.map(i => q.options[i]);
  const newAnswer  = idxs.indexOf(q.answer);
  return { ...q, options: newOptions, answer: newAnswer, _origAnswer: q.answer };
}

/* ===== 가중 샘플링 (약점우선) ===== */
function weightedSample(pool, n, weakFirst) {
  if (!weakFirst) return shuffle(pool).slice(0, n);

  const stats = getStats();
  // 영역별 정답률 계산 (데이터 없으면 0으로 취급)
  const areaRates = {};
  AREAS.forEach(a => {
    const ba = stats.byArea[a.id] || { c: 0, t: 0 };
    areaRates[a.id] = ba.t ? ba.c / ba.t : -1; // -1 = 미풀이
  });

  // 가중치: 정답률이 낮을수록 크게 (0점=3, 50%=2, 100%=1)
  const weight = id => {
    const r = areaRates[id];
    if (r < 0) return 3;
    if (r < 0.5) return 3;
    if (r < 0.75) return 2;
    return 1;
  };

  const weighted = [];
  pool.forEach(q => {
    const w = weight(q.area);
    for (let i = 0; i < w; i++) weighted.push(q);
  });
  shuffle(weighted);

  const seen = new Set();
  const result = [];
  for (const q of weighted) {
    if (!seen.has(q.id)) { seen.add(q.id); result.push(q); }
    if (result.length >= n) break;
  }
  // 부족하면 나머지로 채움
  if (result.length < n) {
    pool.forEach(q => { if (!seen.has(q.id)) result.push(q); });
  }
  return result.slice(0, n);
}

/* ===== 렌더링 헬퍼 ===== */
const $app = () => document.getElementById('app');

function render(html) { $app().innerHTML = html; }

function toast(msg, ms = 2000) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  clearTimeout(t._to);
  t.textContent = msg;
  t.classList.add('show');
  t._to = setTimeout(() => t.classList.remove('show'), ms);
}

/* ===== 통계 업데이트 ===== */
function recordAnswer(q, isCorrect) {
  const s = getStats();
  s.total++;
  if (isCorrect) s.correct++;
  if (!s.byArea[q.area]) s.byArea[q.area] = { c: 0, t: 0 };
  s.byArea[q.area].t++;
  if (isCorrect) s.byArea[q.area].c++;
  saveStats(s);

  if (!isCorrect) {
    const w = getWrong();
    w.add(q.id);
    saveWrong(w);
  } else {
    // 정답이면 오답노트에서 제거
    const w = getWrong();
    if (w.has(q.id)) { w.delete(q.id); saveWrong(w); }
  }
  recordStreak();
}

/* ===== 시험 결과 저장 ===== */
function recordExamResult(scorePct) {
  const s = getStats();
  if (scorePct > (s.bestExam || 0)) s.bestExam = scorePct;
  saveStats(s);
}

/* ===== 뷰: 오류/안내 ===== */
function showError(msg) {
  render(`
    <div class="card notice" style="margin-top:40px">
      <h2 style="margin-bottom:10px">⚠️ 데이터를 불러오지 못했습니다</h2>
      <p>${msg}</p>
      <p><strong>해결 방법:</strong> 로컬 서버로 여세요:<br/>
        <code>python3 -m http.server 8000</code><br/>
        → 브라우저에서 <code>http://localhost:8000</code> 접속</p>
      <p>또는 GitHub Pages에 배포하면 정상 동작합니다.</p>
    </div>`);
}

/* ===========================
   뷰: 홈 대시보드
   =========================== */
function showHome() {
  state = null;
  const stats     = getStats();
  const settings  = getSettings();
  const wrong     = getWrong();
  const bookmarks = getBookmarks();
  const streak    = getStreak();

  const totalPct = pct(stats.correct, stats.total);

  // 영역별 막대
  const areaBars = AREAS.map(a => {
    const ba = stats.byArea[a.id] || { c: 0, t: 0 };
    const p  = pct(ba.c, ba.t);
    const cls = ba.t === 0 ? 'none' : p < 50 ? 'weak' : '';
    return `
      <div class="area-bar">
        <div class="top">
          <span>${a.name}</span>
          <span class="pct">${ba.t ? p + '%' : '미풀이'}</span>
        </div>
        <div class="track"><div class="fill ${cls}" style="width:${ba.t ? p : 0}%"></div></div>
      </div>`;
  }).join('');

  // 스트릭 (최근 28일)
  const streakCells = (() => {
    const cells = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400 * 1000).toISOString().slice(0, 10);
      const n = streak[d] || 0;
      const lv = n === 0 ? '' : n < 5 ? 'lv1' : n < 15 ? 'lv2' : 'lv3';
      cells.push(`<div class="streak-cell ${lv}" title="${d}: ${n}문제"></div>`);
    }
    return cells.join('');
  })();

  render(`
    <p class="section-title">📊 나의 학습 현황</p>
    <div class="stat-grid">
      <div class="stat">
        <div class="num">${stats.total}</div>
        <div class="lbl">총 푼 문제</div>
      </div>
      <div class="stat">
        <div class="num">${stats.total ? totalPct + '%' : '—'}</div>
        <div class="lbl">누적 정답률</div>
      </div>
      <div class="stat">
        <div class="num">${stats.bestExam ? stats.bestExam + '%' : '—'}</div>
        <div class="lbl">최고 점수</div>
      </div>
    </div>

    <div class="card" style="margin-top:14px">
      <div class="section-title">영역별 정답률</div>
      ${areaBars}
      <div class="toggle-row" style="margin-top:14px">
        <span>⚖️ 약점 영역 우선 출제</span>
        <label class="switch">
          <input type="checkbox" id="weakToggle" ${settings.weakFirst ? 'checked' : ''} />
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <p class="section-title">📝 연습 모드</p>
    <div class="mode-list">
      <button class="mode-item" data-action="practice-all">
        <div><div class="lead">전체 랜덤 풀기</div><div class="desc">모든 영역에서 무작위 출제</div></div>
        <span class="chev">›</span>
      </button>
      <button class="mode-item" data-action="practice-amend">
        <div><div class="lead">개정사항만 풀기 <span class="badge amend">개정</span></div>
             <div class="desc">최근 개정·신설 조항 집중 출제</div></div>
        <span class="chev">›</span>
      </button>
      ${AREAS.map(a => `
      <button class="mode-item" data-action="practice-area" data-area="${a.id}">
        <div><div class="lead">${a.name}</div>
             <div class="desc">${ALL_Q.filter(q => q.area === a.id).length}문항</div></div>
        <span class="chev">›</span>
      </button>`).join('')}
    </div>

    <p class="section-title">📋 시험 모드 (모의고사)</p>
    <button class="mode-item" data-action="exam-setup" style="margin-bottom:0">
      <div><div class="lead">모의고사 시작</div>
           <div class="desc">문항 수 선택 · 타이머 · 일괄 채점 · 합격선 확인</div></div>
      <span class="chev">›</span>
    </button>

    <p class="section-title" style="margin-top:18px">📓 복습</p>
    <div class="mode-list">
      <button class="mode-item" data-action="wrong-note">
        <div><div class="lead">오답노트</div>
             <div class="desc">틀린 문제 모아 풀기</div></div>
        ${wrong.size ? `<span class="badge count">${wrong.size}</span>` : '<span class="chev">›</span>'}
      </button>
      <button class="mode-item" data-action="bookmarks">
        <div><div class="lead">즐겨찾기</div>
             <div class="desc">별표 문제 모아 풀기</div></div>
        ${bookmarks.size ? `<span class="badge count">${bookmarks.size}</span>` : '<span class="chev">›</span>'}
      </button>
    </div>

    <div class="card" style="margin-top:14px">
      <div class="section-title">📅 최근 28일 학습</div>
      <div class="streak-grid">${streakCells}</div>
      <p class="muted" style="font-size:13px;margin:10px 0 0">
        히트맵은 일일 정답 문항 수를 표시합니다. | 오늘: ${streak[todayKey()] || 0}문제
      </p>
    </div>

    <p class="section-title" style="margin-top:18px">📚 자료실</p>
    <div class="mode-list">
      <a href="reference/index.md" target="_blank" class="mode-item" style="text-decoration:none; color:inherit;">
        <div><div class="lead">참조 자료 보기 (Markdown)</div>
             <div class="desc">법령 요약, 가이드라인, 개정사항 등</div></div>
        <span class="chev">›</span>
      </a>
      <a href="https://www.law.go.kr/" target="_blank" class="mode-item" style="text-decoration:none; color:inherit;">
        <div><div class="lead">국가법령정보센터</div>
             <div class="desc">개인정보 보호법 원문 확인</div></div>
        <span class="chev">↗</span>
      </a>
    </div>
  `);

  // 이벤트
  document.getElementById('weakToggle').addEventListener('change', e => {
    const cfg = getSettings();
    cfg.weakFirst = e.target.checked;
    saveSettings(cfg);
    toast(cfg.weakFirst ? '약점 영역 우선 출제 ON' : '약점 영역 우선 출제 OFF');
  });

  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const area   = btn.dataset.area ? +btn.dataset.area : null;
      if (action === 'practice-all')   startPractice({ type: 'all' });
      if (action === 'practice-amend') startPractice({ type: 'amend' });
      if (action === 'practice-area')  startPractice({ type: 'area', area });
      if (action === 'exam-setup')     showExamSetup();
      if (action === 'wrong-note')     startWrongNote();
      if (action === 'bookmarks')      startBookmarkQuiz();
    });
  });
}

/* ===========================
   연습 모드 시작
   =========================== */
function startPractice({ type, area }) {
  let pool;
  const cfg = getSettings();

  if (type === 'amend') {
    pool = ALL_Q.filter(q => q.amend);
    if (pool.length === 0) { toast('개정사항 문제가 없습니다.'); return; }
  } else if (type === 'area') {
    pool = ALL_Q.filter(q => q.area === area);
  } else {
    pool = [...ALL_Q];
  }

  const questions = weightedSample(pool, pool.length, cfg.weakFirst)
    .map(prepareQuestion);

  state = {
    mode: 'practice',
    questions,
    idx: 0,
    score: 0,
    answered: false,
  };
  renderPractice();
}

/* ===========================
   연습 모드 렌더
   =========================== */
function renderPractice() {
  if (!state || state.mode !== 'practice') return;
  const { questions, idx, score } = state;
  const q = questions[idx];
  const total = questions.length;
  const pctDone = pct(idx, total);
  const bm = getBookmarks();

  render(`
    <div class="quiz-top">
      <span class="quiz-meta">${idx + 1} / ${total} &nbsp; 점수 <strong>${score}</strong>점</span>
      <button class="star-btn ${bm.has(q.id) ? 'on' : ''}" id="starBtn" title="즐겨찾기">★</button>
    </div>
    <div class="progress"><i style="width:${pctDone}%"></i></div>

    <div class="q-tags">
      <span class="badge area">영역${q.area}</span>
      ${q.amend ? '<span class="badge amend">개정</span>' : ''}
      <span class="muted" style="font-size:13px">${q.areaName} · ${q.tag}</span>
    </div>
    <div class="q-text" id="qText">${escHtml(q.question)}</div>

    <div class="options" id="options">
      ${q.options.map((opt, i) => `
        <button class="option" data-idx="${i}" aria-label="${i + 1}번: ${opt}">
          <span class="key">${i + 1}</span>
          <span>${escHtml(opt)}</span>
        </button>`).join('')}
    </div>

    <div id="explain"></div>

    <div class="quiz-actions" id="quizActions" style="display:none">
      <button class="btn primary" id="nextBtn">
        ${idx + 1 < total ? '다음 문제 →' : '결과 보기'}
      </button>
    </div>

    <p class="kbd-hint">
      <span class="kbd">1</span>–<span class="kbd">4</span> 보기 선택 &nbsp;
      <span class="kbd">Enter</span> 다음
    </p>
  `);

  // 즐겨찾기
  document.getElementById('starBtn').addEventListener('click', () => {
    toggleBookmark(q.id);
    document.getElementById('starBtn').classList.toggle('on', getBookmarks().has(q.id));
  });

  // 보기 클릭
  document.querySelectorAll('.option').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.answered) return;
      handlePracticeAnswer(+btn.dataset.idx);
    });
  });

  // 다음 버튼
  document.getElementById('nextBtn')?.addEventListener('click', nextPractice);
}

function handlePracticeAnswer(chosen) {
  const q = state.questions[state.idx];
  const correct = chosen === q.answer;
  state.answered = true;
  if (correct) state.score += 1;
  recordAnswer({ id: q.id, area: q.area }, correct);

  // 보기 표시
  document.querySelectorAll('.option').forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer) btn.classList.add('correct');
    else if (i === chosen) btn.classList.add('wrong');
  });

  // 해설
  document.getElementById('explain').innerHTML = `
    <div class="explain">
      <div class="verdict ${correct ? 'ok' : 'no'}">${correct ? '✅ 정답!' : '❌ 오답'}</div>
      <div>${escHtml(q.explanation)}</div>
    </div>`;

  document.getElementById('quizActions').style.display = 'flex';

  // 자동 포커스
  setTimeout(() => document.getElementById('nextBtn')?.focus(), 50);
}

function nextPractice() {
  state.idx++;
  state.answered = false;
  if (state.idx >= state.questions.length) {
    showPracticeResult();
  } else {
    renderPractice();
  }
}

function showPracticeResult() {
  const { questions, score } = state;
  const total = questions.length;
  const p = pct(score, total);

  render(`
    <div class="score-hero">
      <div class="big ${p >= PASS_SCORE ? 'pass' : 'fail'}">${p}%</div>
      <div>${score} / ${total} 정답</div>
      <span class="verdict-pill ${p >= PASS_SCORE ? 'pass' : 'fail'}">
        ${p >= PASS_SCORE ? '합격 기준 통과 🎉' : '더 열심히 해봐요 💪'}
      </span>
    </div>
    <div class="btn-row">
      <button class="btn" id="retryBtn">다시 풀기</button>
      <button class="btn primary" id="homeBtn2">처음으로</button>
    </div>
  `);

  document.getElementById('retryBtn').addEventListener('click', () => {
    const prev = state;
    startPractice({ type: 'all' }); // 홈으로 돌아가지 않고 같은 문제 재시작
    state.questions = prev.questions.map(q => prepareQuestion(
      ALL_Q.find(x => x.id === q.id) || q
    ));
    state.idx = 0; state.score = 0; state.answered = false;
    renderPractice();
  });
  document.getElementById('homeBtn2').addEventListener('click', showHome);
}

/* ===========================
   오답노트 / 즐겨찾기 퀴즈
   =========================== */
function startWrongNote() {
  const wrong = getWrong();
  if (wrong.size === 0) {
    render(`
      <div class="empty"><div class="em">🎉</div>
        <h2>오답노트가 비어있습니다!</h2>
        <p class="muted">틀린 문제가 없거나 모두 맞혔어요.</p>
        <button class="btn primary" onclick="showHome()">홈으로</button>
      </div>`);
    return;
  }
  const pool = ALL_Q.filter(q => wrong.has(q.id));
  startSpecialPractice(pool, '오답노트');
}

function startBookmarkQuiz() {
  const bm = getBookmarks();
  if (bm.size === 0) {
    render(`
      <div class="empty"><div class="em">⭐</div>
        <h2>즐겨찾기가 비어있습니다</h2>
        <p class="muted">문제 풀이 중 ★을 눌러 저장하세요.</p>
        <button class="btn primary" onclick="showHome()">홈으로</button>
      </div>`);
    return;
  }
  const pool = ALL_Q.filter(q => bm.has(q.id));
  startSpecialPractice(pool, '즐겨찾기');
}

function startSpecialPractice(pool, label) {
  const questions = shuffle(pool).map(prepareQuestion);
  state = { mode: 'practice', questions, idx: 0, score: 0, answered: false, label };
  renderPractice();
}

/* ===========================
   즐겨찾기 토글
   =========================== */
function toggleBookmark(id) {
  const bm = getBookmarks();
  if (bm.has(id)) { bm.delete(id); toast('즐겨찾기 해제'); }
  else { bm.add(id); toast('즐겨찾기 추가 ★'); }
  saveBookmarks(bm);
}

/* ===========================
   뷰: 시험 설정
   =========================== */
function showExamSetup() {
  const cfg = getSettings();
  let examN = 20;

  render(`
    <p class="section-title">📋 모의고사 설정</p>
    <div class="card">
      <h3>문항 수 선택</h3>
      <div class="choice-chips" id="sizeChips">
        ${EXAM_SIZES.map(n => `
          <button class="chip ${n === examN ? 'active' : ''}" data-n="${n}">${n}문항</button>
        `).join('')}
      </div>
    </div>
    <div class="card">
      <div class="toggle-row">
        <div>
          <div>⏱ 제한 시간</div>
          <div class="muted" style="font-size:13px">20문항→24분, 50문항→60분, 100문항→120분</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="timerToggle" ${cfg.timer ? 'checked' : ''} />
          <span class="slider"></span>
        </label>
      </div>
    </div>
    <div class="btn-row" style="margin-top:8px">
      <button class="btn" id="backBtn">← 뒤로</button>
      <button class="btn primary" id="startExamBtn">시작하기</button>
    </div>
  `);

  document.querySelectorAll('.chip').forEach(c => {
    c.addEventListener('click', () => {
      examN = +c.dataset.n;
      document.querySelectorAll('.chip').forEach(x => x.classList.toggle('active', +x.dataset.n === examN));
    });
  });

  document.getElementById('timerToggle').addEventListener('change', e => {
    const s = getSettings(); s.timer = e.target.checked; saveSettings(s);
  });

  document.getElementById('backBtn').addEventListener('click', showHome);
  document.getElementById('startExamBtn').addEventListener('click', () => startExam(examN));
}

/* ===========================
   시험 모드
   =========================== */
function startExam(n) {
  const cfg = getSettings();
  const pool = shuffle(ALL_Q).slice(0, n);
  const questions = pool.map(prepareQuestion);

  state = {
    mode: 'exam',
    questions,
    answers: new Array(n).fill(null), // null = 미답
    idx: 0,
    timer: cfg.timer ? n * MIN_PER_Q_SEC : null,
    _interval: null,
  };

  renderExam();

  if (state.timer !== null) startTimer();
}

function startTimer() {
  state._interval = setInterval(() => {
    if (!state || state.mode !== 'exam') { clearInterval(state?._interval); return; }
    state.timer--;
    updateTimerDisplay();
    if (state.timer <= 0) {
      clearInterval(state._interval);
      toast('시간 종료! 자동 제출합니다.');
      setTimeout(submitExam, 1200);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const el = document.getElementById('timerEl');
  if (!el || !state) return;
  el.textContent = fmtTime(state.timer);
  el.classList.toggle('warn', state.timer <= 60);
}

function renderExam() {
  const { questions, idx, answers, timer } = state;
  const q = questions[idx];
  const total = questions.length;
  const answered = answers[idx];

  render(`
    <div class="quiz-top">
      <span class="quiz-meta">${idx + 1} / ${total}</span>
      <div style="display:flex;align-items:center;gap:10px">
        ${timer !== null ? `<span class="timer" id="timerEl">${fmtTime(timer)}</span>` : ''}
        <button class="btn" id="submitExamBtn" style="padding:8px 14px;font-size:14px">제출</button>
      </div>
    </div>
    <div class="progress"><i style="width:${pct(idx, total)}%"></i></div>

    <div class="q-tags">
      <span class="badge area">영역${q.area}</span>
      ${q.amend ? '<span class="badge amend">개정</span>' : ''}
    </div>
    <div class="q-text">${escHtml(q.question)}</div>

    <div class="options" id="options">
      ${q.options.map((opt, i) => `
        <button class="option ${answered === i ? 'chosen' : ''}" data-idx="${i}">
          <span class="key">${i + 1}</span>
          <span>${escHtml(opt)}</span>
        </button>`).join('')}
    </div>

    <div class="quiz-actions">
      <button class="btn ghost" id="prevBtn" ${idx === 0 ? 'disabled' : ''}>← 이전</button>
      <button class="btn primary" id="nextExamBtn">
        ${idx + 1 < total ? '다음 →' : '마지막 문항'}
      </button>
    </div>

    <!-- 빠른 이동 -->
    <div style="margin-top:16px">
      <div class="section-title">문항 이동</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${questions.map((_, i) => `
          <button class="chip ${answers[i] !== null ? 'active' : ''} ${i === idx ? '' : ''}"
            data-goto="${i}"
            style="min-width:40px;padding:8px 6px;font-size:13px;
                   ${i === idx ? 'outline:2px solid var(--gold);' : ''}">
            ${i + 1}
          </button>`).join('')}
      </div>
      <p class="muted" style="font-size:13px;margin-top:8px">
        ✅ 답한 문항 ${answers.filter(a => a !== null).length} / ${total}
      </p>
    </div>

    <p class="kbd-hint">
      <span class="kbd">1</span>–<span class="kbd">4</span> 보기 선택 &nbsp;
      <span class="kbd">Enter</span> 다음
    </p>
  `);

  document.querySelectorAll('.option').forEach(btn => {
    btn.addEventListener('click', () => {
      state.answers[state.idx] = +btn.dataset.idx;
      // 즉시 시각 반영 후 다음으로
      renderExam();
    });
  });

  document.getElementById('prevBtn').addEventListener('click', () => {
    if (state.idx > 0) { state.idx--; renderExam(); }
  });
  document.getElementById('nextExamBtn').addEventListener('click', () => {
    if (state.idx < state.questions.length - 1) { state.idx++; renderExam(); }
    else { toast('이 문항이 마지막입니다. 제출 버튼을 눌러 채점하세요.'); }
  });
  document.getElementById('submitExamBtn').addEventListener('click', () => {
    const unanswered = state.answers.filter(a => a === null).length;
    if (unanswered > 0) {
      if (!confirm(`${unanswered}문항이 아직 미답입니다. 제출할까요?`)) return;
    }
    clearInterval(state._interval);
    submitExam();
  });
  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => { state.idx = +btn.dataset.goto; renderExam(); });
  });
}

function submitExam() {
  if (!state || state.mode !== 'exam') return;
  clearInterval(state._interval);

  const { questions, answers } = state;
  let correct = 0;
  const areaStats = {}; // area → {c, t}

  questions.forEach((q, i) => {
    const isCorrect = answers[i] === q.answer;
    if (isCorrect) correct++;
    if (!areaStats[q.area]) areaStats[q.area] = { c: 0, t: 0 };
    areaStats[q.area].t++;
    if (isCorrect) areaStats[q.area].c++;

    // 통계 기록
    recordAnswer({ id: q.id, area: q.area }, isCorrect);
  });

  const scorePct = pct(correct, questions.length);
  recordExamResult(scorePct);

  showExamResult({ questions, answers, correct, areaStats, scorePct });
}

/* ===========================
   결과 화면 (시험)
   =========================== */
function showExamResult({ questions, answers, correct, areaStats, scorePct }) {
  const pass = scorePct >= PASS_SCORE;
  const total = questions.length;

  const areaBarHtml = AREAS.map(a => {
    const as = areaStats[a.id];
    if (!as) return '';
    const p = pct(as.c, as.t);
    return `
      <div class="area-bar">
        <div class="top">
          <span>${a.name}</span>
          <span class="pct">${as.c}/${as.t} (${p}%)</span>
        </div>
        <div class="track"><div class="fill ${p < 40 ? 'weak' : ''}" style="width:${p}%"></div></div>
      </div>`;
  }).join('');

  const reviewHtml = questions.map((q, i) => {
    const chosen = answers[i];
    const isCorrect = chosen === q.answer;
    const chosenText = chosen !== null ? q.options[chosen] : '(미답)';
    const correctText = q.options[q.answer];
    return `
      <div class="review-item">
        <div class="review-line"><span class="review-mark ${isCorrect ? 'ok' : 'no'}">${isCorrect ? '✅' : '❌'}</span>
          <strong>Q${i + 1}.</strong></div>
        <div class="rq">${escHtml(q.question)}</div>
        ${!isCorrect ? `<div class="review-line mine bad">내 답: ${escHtml(chosenText)}</div>` : ''}
        <div class="review-line ans">정답: ${escHtml(correctText)}</div>
        <div class="review-line muted" style="font-size:13px">${escHtml(q.explanation)}</div>
      </div>`;
  }).join('');

  render(`
    <div class="score-hero">
      <div class="big ${pass ? 'pass' : 'fail'}">${scorePct}점</div>
      <div>${correct} / ${total} 정답</div>
      <span class="verdict-pill ${pass ? 'pass' : 'fail'}">
        ${pass ? '합격! 🎉' : `불합격 — 합격선 ${PASS_SCORE}점 미달 💪`}
      </span>
    </div>

    <div class="card">
      <div class="section-title">영역별 득점</div>
      ${areaBarHtml}
    </div>

    <div class="btn-row" style="margin-bottom:14px">
      <button class="btn" id="retryExamBtn">다시 풀기</button>
      <button class="btn primary" id="homeBtn3">홈으로</button>
    </div>

    <p class="section-title">📝 문항별 리뷰</p>
    ${reviewHtml}

    <div class="btn-row" style="margin-top:14px">
      <button class="btn primary" id="homeBtn4">홈으로</button>
    </div>
  `);

  document.getElementById('retryExamBtn').addEventListener('click', () => showExamSetup());
  document.getElementById('homeBtn3').addEventListener('click', showHome);
  document.getElementById('homeBtn4').addEventListener('click', showHome);
}

/* ===========================
   키보드 단축키
   =========================== */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  const key = e.key;

  // 1~4: 보기 선택
  if (['1','2','3','4'].includes(key)) {
    const idx = +key - 1;
    const opts = document.querySelectorAll('.option:not(:disabled)');
    if (opts[idx]) { e.preventDefault(); opts[idx].click(); }
  }

  // Enter: 다음 / 제출
  if (key === 'Enter') {
    const next = document.getElementById('nextBtn') ||
                 document.getElementById('nextExamBtn');
    if (next && !next.disabled) { e.preventDefault(); next.click(); }
  }

  // Escape: 홈
  if (key === 'Escape') { e.preventDefault(); showHome(); }
});

/* ===========================
   헤더 버튼
   =========================== */
document.getElementById('homeBtn').addEventListener('click', showHome);

document.getElementById('themeBtn').addEventListener('click', () => {
  const cfg = getSettings();
  cfg.theme = cfg.theme === 'dark' ? 'light' : 'dark';
  saveSettings(cfg);
  applyTheme(cfg.theme);
  toast(cfg.theme === 'dark' ? '다크 모드' : '라이트 모드');
});

document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('⚠️ 모든 학습 데이터(통계·오답·즐겨찾기·스트릭)를 초기화할까요?\n되돌릴 수 없습니다.')) {
    [KEY.stats, KEY.wrong, KEY.bookmarks, KEY.streak].forEach(k => localStorage.removeItem(k));
    toast('초기화 완료');
    showHome();
  }
});

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : '';
}

/* ===========================
   XSS 방지
   =========================== */
function escHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ===========================
   데이터 로드
   =========================== */
async function loadQuestions() {
  // 1차: fetch (서버 / GitHub Pages)
  try {
    const res = await fetch('./data/questions.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('빈 배열');
    return data;
  } catch (err) {
    console.warn('fetch 실패, fallback.js 시도:', err);
  }

  // 2차: file:// fallback (questions.fallback.js 주입)
  try {
    await loadScript('./data/questions.fallback.js');
    if (window.CPPG_QUESTIONS && window.CPPG_QUESTIONS.length > 0) {
      return window.CPPG_QUESTIONS;
    }
  } catch (e2) {
    console.warn('fallback.js 실패:', e2);
  }

  return null;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload  = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* ===========================
   앱 초기화
   =========================== */
(async function init() {
  // 테마 적용
  const cfg = getSettings();
  applyTheme(cfg.theme);

  // 로딩 표시
  render('<div class="empty"><div class="em">📖</div><p>문제를 불러오는 중…</p></div>');

  const data = await loadQuestions();

  if (!data) {
    showError('fetch와 fallback 모두 실패했습니다.');
    return;
  }

  ALL_Q = data;
  showHome();
})();

// 전역 노출 (인라인 onclick 용)
window.showHome = showHome;
