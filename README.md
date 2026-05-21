# CPPG 문제은행 📚

CPPG(개인정보관리사) 시험 대비용 웹 기반 문제은행.  
GitHub Pages에 정적 파일로 배포하며, 별도 서버·빌드 없이 동작합니다.

> **현재 상태**: 102문항 (영역별 15~26문항) · reference 법령 기반 확충 · 전체 기능 구현 완료 · 수동 검증 진행 중  
> 상세 진행 현황 및 TODO → [TODO.md](TODO.md)

---

## 📦 파일 구조

```
/index.html              — 메인 페이지
/css/style.css           — 스타일시트 (라이트/다크 테마)
/js/app.js               — 전체 앱 로직 (바닐라 JS)
/data/questions.json     — 문제 데이터 (단일 소스, 직접 편집 가능)
/data/questions.fallback.js — file:// 실행 폴백용 미러
/reference/              — 문제 생성 근거 자료 (마크다운, 배포 무관)
/.nojekyll               — GitHub Pages 폴더 서빙 설정
```

---

## 🌐 GitHub Pages 배포

1. GitHub에 레포 Push
2. 레포 → **Settings → Pages**
3. **Source:** `Deploy from a branch`
4. **Branch:** `main` (또는 `master`) / **폴더:** `/ (root)`
5. 저장 후 수분 내 `https://<username>.github.io/<repo>/` 에서 접속

`.nojekyll` 파일이 있어야 `css/`, `js/`, `data/` 폴더가 정상 서빙됩니다 (이미 포함).

---

## 💻 로컬 테스트

### 방법 1 — 로컬 서버 (권장)
```bash
# Python 3
python3 -m http.server 8000

# Node.js (npx)
npx serve .
```
→ 브라우저에서 `http://localhost:8000` 접속

### 방법 2 — `file://` 직접 열기
`index.html`을 브라우저에서 직접 열 경우, 일부 브라우저는 `fetch`가 차단됩니다.  
이 경우 앱이 자동으로 `data/questions.fallback.js`를 불러옵니다.  
둘 다 실패하면 화면에 안내 메시지가 표시됩니다.

---

## ✏️ 문제 추가·수정

### 1. `data/questions.json` 편집

스키마:
```json
{
  "id": "3-19",
  "area": 3,
  "areaName": "개인정보 라이프사이클 관리",
  "tag": "처리위탁",
  "amend": false,
  "question": "개인정보 처리위탁 시 위탁자가 해야 할 사항이 아닌 것은?",
  "options": ["보기1","보기2","보기3","보기4"],
  "answer": 2,
  "explanation": "정답 해설 (1~3문장)"
}
```

| 필드 | 설명 |
|------|------|
| `id` | `"{area}-{순번}"` 형식, 중복 금지 |
| `area` | 1~5 (영역 번호) |
| `areaName` | 영역 이름 (5개 중 하나, 정확히 일치) |
| `tag` | 소주제 키워드 (자유) |
| `amend` | 최근 개정 관련이면 `true` |
| `answer` | 정답 보기의 **0-기반** 인덱스 (0~3) |

### 2. fallback.js 갱신 (file:// 사용 시)

```bash
node scripts/generate_questions.js  # data/questions.json 에서 fallback.js 생성
```

> 로컬 서버(`python3 -m http.server`) 또는 GitHub Pages 사용 시에는 fallback.js를 갱신하지 않아도 됩니다.

---

## 🗂 5개 영역

| # | 영역명 | 배점 |
|---|--------|------|
| 1 | 개인정보보호의 이해 | 10% |
| 2 | 개인정보보호 제도 | 20% |
| 3 | 개인정보 라이프사이클 관리 | 25% |
| 4 | 개인정보의 보호조치 | 30% |
| 5 | 개인정보 관리체계 | 15% |

합격 기준: **각 과목 40% 이상 + 총점 60% 이상**

---

## 🔄 데이터 초기화

앱 우상단 **↺** 버튼을 누르면 모든 학습 데이터(통계·오답노트·즐겨찾기·스트릭)를 삭제합니다.  
`data/questions.json`은 삭제되지 않습니다.

또는 브라우저 개발자 도구 콘솔:
```js
['cppg.stats','cppg.wrong','cppg.bookmarks','cppg.streak'].forEach(k => localStorage.removeItem(k));
```

---

## ⚠️ 면책 및 참고자료 출처

`reference/` 폴더의 내용과 문제의 해설은 **학습 목적** 요약이며 법령 원문이 아닙니다.  
실제 시험·실무 판단 시 아래 원문을 반드시 확인하세요:

- 국가법령정보센터: [law.go.kr](https://www.law.go.kr/)
- 개인정보보호위원회: [privacy.go.kr](https://www.privacy.go.kr/)
- CPPG 공식: [cpptest.or.kr](https://cpptest.or.kr/)

---

## ✅ 동작 확인 체크리스트

### 기본 동작
- [ ] `python3 -m http.server` 후 `http://localhost:8000` 정상 로드
- [ ] 홈 화면: 통계 카드, 영역별 정답률 막대, 모드 목록 표시
- [ ] 연습 모드: 문제 출제, 보기 클릭 즉시 정오답 + 해설
- [ ] 연습 모드: 진행바, n/총 문항 표시
- [ ] 연습 모드: 개정사항 문제에 `개정` 배지 표시
- [ ] 시험 모드: 문항 수 선택, 타이머 동작, 미답 문항 경고
- [ ] 시험 모드: 제출 후 점수·합격선·영역별 분포·문항별 리뷰 표시
- [ ] 오답노트: 틀린 문제 자동 저장, 다시 풀기 시 제거
- [ ] 즐겨찾기: ★ 클릭 저장, 모아 풀기

### 편의 기능
- [ ] 키보드 `1`~`4` 보기 선택, `Enter` 다음 문제
- [ ] 다크/라이트 모드 전환 및 설정 유지 (새로고침 후에도)
- [ ] 약점 영역 우선 토글 저장
- [ ] 데이터 초기화 후 통계 리셋 확인

### 반응형
- [ ] 모바일 폭(375px)에서 레이아웃 정상, 터치 타깃 크기 충분
- [ ] 데스크톱·태블릿에서 가독성 양호

### 데이터 무결성
- [ ] `questions.json` JSON 유효성: `node -e "JSON.parse(require('fs').readFileSync('data/questions.json'))"`
- [ ] `answer` 인덱스 범위 0~3 내에 있음
- [ ] `id` 중복 없음
