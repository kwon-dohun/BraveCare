// 기본 할 일 중 앱 안의 화면과 바로 이어지는 것에 "바로 가기"를 붙이기 위한 규칙. 위에서부터 먼저 맞는 것을 쓴다.
const RULES: [RegExp, string, string][] = [
  [/데일리 체크/, "/daily", "데일리 체크 하러 가기"],
  [/외래 리포트/, "/report", "외래 리포트 열기"],
  [/물어볼 것 적어두기/, "/questions", "물어볼 것 적으러 가기"],
  [/사진으로 남기기|촬영해서/, "/scan", "서류 찍으러 가기"],
  [/보험 청구 서류|실손24/, "/docs", "보험 청구 서류 열기"],
  [/지원 확인|재난적의료비/, "/benefits", "지원 보러 가기"],
];

export const taskLink = (title: string): { path: string; label: string } | null => {
  const r = RULES.find(([re]) => re.test(title));
  return r ? { path: r[1], label: r[2] } : null;
};
