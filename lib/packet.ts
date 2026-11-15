// 퇴원할 때 원무과에서 한 번에 받아 두면 보험 청구와 연말정산에 다시 병원에 갈 일이 없는 서류 4종.
export const PACKET = [
  { id: "receipt", name: "진료비 계산서·영수증", note: "보험 청구의 기본 서류예요." },
  { id: "detail", name: "진료비 세부내역서", note: "비급여 항목이 적힌 상세 내역이에요. 실손 청구에 함께 내요." },
  { id: "admission", name: "입퇴원확인서 (질병분류코드 포함)", note: "진단서보다 발급비가 싸고, 보험사 대부분이 받아요. 코드가 적혀 있는지 확인하세요." },
  { id: "disabled_cert", name: "장애인증명서 (연말정산용)", note: "오래 치료가 필요한 중증환자로 의사가 인정하면 받을 수 있어요. 대상인지는 주치의에게 물어보세요." },
] as const;

export const SILSON24_URL = "https://www.silson24.or.kr";
