import type { Living, Reason } from "./benefits";

export const SIDO = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
export const SEOUL_GU = ["강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구", "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구", "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구"];
export const REASON_LABEL: [Reason, string][] = [
  ["ortho", "정형외과 수술 (관절·골절 등)"], ["cancer", "암 치료"], ["brain", "뇌혈관 질환"], ["heart", "심장 질환"],
  ["surgery", "기타 수술"], ["internal", "내과 질환"], ["other", "기타"],
];
export const LIVING_LABEL: [Living, string][] = [["alone", "혼자"], ["spouse", "배우자와"], ["family", "자녀 등 가족과"]];
