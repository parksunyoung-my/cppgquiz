// 새 문항 생성 스크립트
const fs = require('fs');

// 기존 문항 로드
const existing = JSON.parse(fs.readFileSync('data/questions.json', 'utf8'));

const newQuestions = [
  // 영역 2 — 개인정보보호 제도 (추가)
  {
    id: "2-17",
    area: 2,
    areaName: "개인정보보호 제도",
    tag: "CPO 자격요건",
    amend: false,
    question: "개인정보 보호책임자(CPO)의 자격요건으로 가장 적절하지 않은 것은? (2023 개정 기준)",
    options: [
      "정보보호 관련 학위 또는 CISA, CISSP, 정보보호사 등 자격증 보유",
      "정보보호 분야 3년 이상 관련 업무 경력",
      "개인정보관리사 자격증",
      "고등학교 졸업 학력이면 충분하다"
    ],
    answer: 3,
    explanation: "2023년 개정으로 CPO는 정보보호 관련 학위·자격증 보유와 3년 이상 경력이 필수화되었다. 고등학교 학력만으로는 불충분하다."
  },
  {
    id: "2-18",
    area: 2,
    areaName: "개인정보보호 제도",
    tag: "과징금 상향",
    amend: true,
    question: "2023년 개정된 개인정보보호법상 과징금의 상한선으로 옳은 것은?",
    options: [
      "전체 매출액의 1% 또는 최대 5천만 원",
      "전체 매출액의 2% 또는 최대 1억 원",
      "전체 매출액의 3% 또는 최대 1억 원",
      "고정액 3천만 원"
    ],
    answer: 2,
    explanation: "2023년 개정으로 과징금이 상향되어 중대 위반의 경우 전체 매출액의 최대 3% 또는 1억 원(큰 금액) 범위 내에서 부과된다."
  },
  {
    id: "2-19",
    area: 2,
    areaName: "개인정보보호 제도",
    tag: "유출 신고 의무",
    amend: true,
    question: "개인정보 유출 시 개인정보보호위원회 및 수사기관에 신고해야 하는 기한은?",
    options: [
      "7일 이내",
      "14일 이내",
      "72시간(3일) 이내",
      "30일 이내"
    ],
    answer: 2,
    explanation: "개인정보 유출·침해 시 72시간(3일) 이내에 개인정보보호위원회·수사기관에 신고해야 하며, 45일 이내에 정보주체에 통지해야 한다."
  },
  {
    id: "2-20",
    area: 2,
    areaName: "개인정보보호 제도",
    tag: "과징금 대상 위반",
    amend: false,
    question: "과징금이 부과될 수 있는 위반 행위로 가장 적절하지 않은 것은?",
    options: [
      "정보주체 동의 없이 개인정보를 처리하는 경우",
      "민감정보·고유식별정보를 부당하게 처리하는 경우",
      "안전조치 의무를 위반하는 경우",
      "개인정보 처리방침을 수시로 변경 공지하는 경우"
    ],
    answer: 3,
    explanation: "처리방침 변경 공지는 의무이며 과징금 대상이 아니다. 과징금 대상은 동의 위반, 민감정보 부당 처리, 안전조치 위반 등이다."
  }
];

// 병합
const merged = [...existing, ...newQuestions];

// 저장
fs.writeFileSync('data/questions.json', JSON.stringify(merged, null, 2) + '\n');

console.log(`✅ Updated: ${existing.length} → ${merged.length} 문항`);
console.log(`📝 추가된 문항: ${newQuestions.length}개`);

