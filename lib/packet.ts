// 퇴원할 때 원무과에서 한 번에 받아 두면 보험 청구와 연말정산에 다시 병원에 갈 일이 없는 서류 4종.
export const PACKET = [
  { id: "receipt", name: "진료비 계산서·영수증", note: "보험 청구의 기본 서류예요." },
  { id: "detail", name: "진료비 세부내역서", note: "비급여 항목이 적힌 상세 내역이에요. 실손 청구에 함께 내요." },
  { id: "admission", name: "입퇴원확인서 (질병분류코드 포함)", note: "진단서보다 발급비가 싸고, 보험사 대부분이 받아요. 코드가 적혀 있는지 확인하세요." },
  { id: "disabled_cert", name: "장애인증명서 (연말정산용)", note: "오래 치료가 필요한 중증환자로 의사가 인정하면 받을 수 있어요. 대상인지는 주치의에게 물어보세요." },
] as const;

export const SILSON24_URL = "https://www.silson24.or.kr";

// 복지 제도 필요 서류 문구(docText)가 원무과 서류 4종 중 어떤 항목과 연결되는지 판별
export function matchPacketDoc(docText: string): (typeof PACKET)[number] | null {
  const norm = docText.replace(/\s+/g, "");
  if (norm.includes("입퇴원확인서") || norm.includes("퇴원확인서") || norm.includes("입퇴원")) {
    return PACKET.find((p) => p.id === "admission") ?? null;
  }
  if (norm.includes("영수증") || norm.includes("계산서") || norm.includes("진료비영수증")) {
    return PACKET.find((p) => p.id === "receipt") ?? null;
  }
  if (norm.includes("세부내역서") || norm.includes("진료비세부")) {
    return PACKET.find((p) => p.id === "detail") ?? null;
  }
  if (norm.includes("장애인증명서") || norm.includes("장애인공제")) {
    return PACKET.find((p) => p.id === "disabled_cert") ?? null;
  }
  return null;
}
