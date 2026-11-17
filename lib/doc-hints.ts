// 필요 서류 이름 옆에 "이건 어디서 받아요"를 작게 붙인다. 글자 모양으로 짐작하는 일반 안내라 단정하지 않고, 모르는 서류는 붙이지 않는다.
export function docHint(doc: string): string | null {
  if (/^따로 없음/.test(doc)) return null;
  if (/대리/.test(doc)) return "환자 대신 가족이 신청할 때 필요해요";
  if (/신분증/.test(doc)) return "환자 본인 신분증이에요. 대신 신청하는 가족은 본인 신분증도 챙기세요";
  if (/입퇴원확인서|퇴원.*(확인|예정)|입원.*확인|질병·부상.*확인|진료 예약.*확인/.test(doc)) return "병원 원무과(수납 창구)에서 받아요. 퇴원 당일 같이 받아 두면 편해요";
  if (/진단서|소견서|의무기록/.test(doc)) return "병원 외래·원무과에서 받아요(수수료가 있어요). 어디에 낼 건지 말하면 맞는 형식으로 줘요";
  if (/영수증|세부내역서/.test(doc)) return "병원 수납 창구에서 받아요. 영수증과 세부내역서를 같이 달라고 하세요";
  if (/가족관계증명서|주민등록등본/.test(doc)) return "주민센터나 정부24(gov.kr)에서 받아요";
  if (/통장 사본|본인 명의 계좌/.test(doc)) return "받을 돈이 들어올 환자 본인 명의 통장 사본이나 계좌번호예요";
  if (/기초수급|차상위|기초연금/.test(doc)) return "주민센터나 복지로(bokjiro.go.kr)에서 받아요";
  if (/신청서/.test(doc)) return "보통 신청하는 곳에 비치돼 있어서 가서 바로 써도 돼요";
  return null;
}
