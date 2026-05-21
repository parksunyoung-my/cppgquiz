# CPPG 문제은행 — 작업 현황 & TODO

> **현재 상태**: 102문항 (영역별 15~26문항) · reference 법령 기반 확충 · 전체 기능 구현 완료 · 수동 검증 진행 중

---

## ✅ 완료된 작업

### Phase 1 — 참고자료 수집 (`reference/`)
- [x] `reference/00_시험정보.md` — CPPG 5개 영역·배점·합격기준·세부 출제기준
- [x] `reference/01_법령_개인정보보호법.md` — 개인정보보호법 핵심 조문 요약 (2023.9.15 개정 반영)
- [x] `reference/02_가이드라인_해설서.md` — 안전성 확보조치 기준·ISMS-P·영향평가
- [x] `reference/03_최근_개정사항.md` — 2020~2024 주요 개정 (amend:true 근거)
- [x] `reference/index.md` — 영역↔자료 매핑표 + 출처 URL (외부 링크 추가 완료)

### Phase 2 — 문제은행 (`data/questions.json`)
- [x] 총 **102문항** 생성, 스키마 검증 통과
  - 영역1(이해) 15문항 / 영역2(제도) 20문항
  - 영역3(라이프사이클) 20문항 / 영역4(보호조치) 26문항 / 영역5(관리체계) 21문항
- [x] `amend:true` 11문항 (자동화결정·전송요구권·과징금 3%·72시간 신고·CPO 자격·유출신고 등)
- [x] `data/questions.fallback.js` 미러 생성 (file:// 폴백용)
- [x] 중복 id 없음, answer 인덱스 0~3 범위 내, 스키마 오류 없음

### Phase 3~5 — 앱 구현
- [x] `index.html` — Noto Sans KR, 단일 #app 컨테이너, 상대경로
- [x] `css/style.css` — 아이보리 배경 + 녹색/금색, 라이트/다크 CSS 변수, 반응형, 터치 타깃 48px
- [x] `js/app.js` — 모든 핵심 기능 구현:
  - [x] 홈 대시보드 (통계·영역별 막대·약점우선 토글·스트릭·참조자료 링크)
  - [x] 연습 모드 (전체/영역별/개정사항만, 즉시 정오답+해설)
  - [x] 시험 모드 (문항 수 선택·타이머·일괄 채점·문항 이동)
  - [x] 결과 화면 (합격선·영역별 분포·문항별 리뷰)
  - [x] 오답노트 (자동 적립·정답 시 제거·수동 제거 버튼 없음→다음 TODO)
  - [x] 즐겨찾기 (★ 토글·모아 풀기)
  - [x] 학습 스트릭 (28일 히트맵)
  - [x] 키보드 단축키 (1~4 보기·Enter 다음·Esc 홈)
  - [x] 다크/라이트 모드 + localStorage 저장
  - [x] 데이터 초기화
  - [x] fetch → fallback.js → 안내 모달 3단계 로더

### Phase 6 — 환경 설정
- [x] `.nojekyll` (GitHub Pages 폴더 서빙)
- [x] `README.md` (배포법·로컬테스트·문제추가·초기화·체크리스트)
- [x] `.claude/launch.json` (로컬 서버 미리보기 설정)

### 검증 현황
- [x] JSON 유효성 node 검증 통과
- [x] 로컬 서버(`python3 -m http.server 8765`) 정상 기동, 200 응답
- [x] 홈 대시보드 렌더 확인 (스크린샷)
- [x] 연습 모드 진입 동작 확인 (eval 직접 클릭 → `1/82 문항` 정상 렌더)

---

## 🔲 남은 작업 (TODO)

### 버그 / 개선

- [ ] **오답노트 수동 제거 버튼** — 오답노트 목록 화면에서 개별 문제를 직접 제거하는 버튼 추가
  - 현재: 연습 중 정답 맞히면 자동 제거만 됨
  - 원하는 동작: 오답노트 목록을 보여주고 "제거" 버튼 제공

- [ ] **연습 모드 "다시 풀기"** 동작 개선
  - 현재: 다시 풀기 시 `startPractice({type:'all'})` 로 전체 pool로 재시작
  - 원하는 동작: 직전과 동일한 pool(같은 영역/모드)로 재시작

- [ ] **시험 모드 타이머 종료 시** 화면 전환 UX 확인 및 테스트

### 기능 추가 (선택)

- [ ] 오답노트 **목록 뷰** — 오답 문제 목록을 카드로 보여주고 각각 제거 가능
- [ ] 문제 **신고/피드백** 버튼 (오류 있는 문제 표시, localStorage 기록)
- [ ] **진도율** — 전체 82문항 중 한 번이라도 풀어본 문제 수 표시
- [ ] **영역 선택 퀴즈** 문항 수 지정 (예: 영역2에서 10문항만)

### 수동 검증 (브라우저에서 직접 확인)

다음 체크리스트를 브라우저에서 직접 확인:
- [ ] 홈 → 전체 랜덤 풀기 → 보기 클릭 → 즉시 정오답+해설 → 다음 문제
- [ ] 영역별 풀기 → 개정사항만 풀기
- [ ] 시험 모드 20문항 → 타이머 동작 → 제출 → 결과/리뷰
- [ ] 틀린 후 오답노트 → 다시 풀기 → 정답 → 오답노트에서 제거 확인
- [ ] 즐겨찾기 ★ → 즐겨찾기 모아 풀기
- [ ] 약점 영역 우선 토글 저장 확인 (새로고침 후 유지)
- [ ] 다크모드 → 새로고침 → 다크모드 유지 확인
- [ ] 키보드 1~4, Enter, Esc 단축키
- [ ] 데이터 초기화 → 통계 리셋
- [ ] 모바일(375px)에서 레이아웃 확인
- [ ] `file://` 직접 열기 → fallback.js 동작 또는 안내 메시지

### 문제은행 확충 (사용자 직접 또는 추후 AI 생성)

- [ ] 영역당 현재 15~18문항 → 목표 30문항 이상으로 확충
- [ ] 기출 문제 패턴 분석 후 유사 문제 추가
- [ ] `reference/` 자료 검수 후 오류 문항 수정

### GitHub Pages 배포

- [ ] 레포 Push 후 Settings → Pages 설정
- [ ] 배포 URL 접속 확인
- [ ] `fetch` 정상 동작 확인 (GitHub Pages는 http라 fetch 제한 없음)

---

## 📁 현재 파일 구조

```
/index.html                     ← 메인 (완성)
/css/style.css                  ← 스타일 (완성)
/js/app.js                      ← 앱 로직 (완성)
/data/questions.json            ← 102문항 (검수 완료)
/data/questions.fallback.js     ← 자동 생성 미러
/reference/
  index.md                      ← 참조자료 인덱스 (외부 링크 포함)
  00_시험정보.md
  01_법령_개인정보보호법.md
  02_가이드라인_해설서.md
  03_최근_개정사항.md
  04_개인정보보호법시행령.md
  04_안전성확보조치기준.md
  05_신용정보법_정보통신망법.md
  06_관리체계인증.md
/.nojekyll
/README.md
/TODO.md                        ← 이 파일
```

---

## 🔑 주요 기술 메모

- **데이터 로드**: `fetch('./data/questions.json')` → 실패 시 `questions.fallback.js` 동적 주입 → 실패 시 안내 모달
- **localStorage 키**: `cppg.stats`, `cppg.wrong`, `cppg.bookmarks`, `cppg.streak`, `cppg.settings`
- **fallback.js 재생성 명령**:
  ```bash
  node -e "const fs=require('fs'); const q=JSON.parse(fs.readFileSync('data/questions.json','utf8')); fs.writeFileSync('data/questions.fallback.js','window.CPPG_QUESTIONS='+JSON.stringify(q,null,2)+';\n'); console.log(q.length,'문항 미러 완료');"
  ```
- **로컬 서버**: `python3 -m http.server 8000` → `http://localhost:8000`
- **JSON 검증**: `node -e "JSON.parse(require('fs').readFileSync('data/questions.json'))"`
