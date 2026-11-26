import { dayDiff } from "./benefits.ts";

export function dischargeLabel(discharge: string | null, today: string) {
  if (!discharge) return "퇴원일 미정";
  const d = dayDiff(discharge, today);
  return d > 0 ? `퇴원 D-${d}` : d === 0 ? "오늘 퇴원" : `퇴원 ${-d}일째`;
}

// 화면에 보이는 날짜는 ISO(2026-11-18) 대신 사람이 읽는 꼴로
export const krDate = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;
export const krDateYear = (d: string) => `${d.slice(0, 4)}년 ${krDate(d)}`;
// 14:00 → 오후 2시, 09:30 → 오전 9시 30분
export function krTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}시${m ? ` ${m}분` : ""}`;
}
export const dotDate = (d: string) => d.slice(0, 10).replaceAll("-", ".");

// 히어로용: 큰 숫자 하나 + 설명 한 줄
export function heroLabel(discharge: string | null, today: string, isSelfCare = false) {
  if (!discharge) {
    return isSelfCare
      ? { big: "D-?", sub: "퇴원일이 정해지면 씩씩이가 일정과 준비를 맞춰드려요" }
      : { big: "D-?", sub: "퇴원일이 정해지면 다시 계산해요" };
  }
  const d = dayDiff(discharge, today);
  const md = krDate(discharge);
  if (isSelfCare) {
    return d > 0
      ? { big: `D-${d}`, sub: "너무 걱정 마세요, 씩씩이가 하나씩 챙겨드릴게요" }
      : d === 0
        ? { big: "D-Day", sub: "오늘 퇴원해요 · 서류와 약 챙겨서 조심히 귀가하세요" }
        : { big: `${-d}일째`, sub: `${md} 퇴원 후 씩씩하게 회복 중` };
  }
  return d > 0
    ? { big: `D-${d}`, sub: `${md} 퇴원까지` }
    : d === 0
      ? { big: "D-Day", sub: "오늘 퇴원해요" }
      : { big: `${-d}일째`, sub: `${md} 퇴원 후 회복 중` };
}

export function dday(daysLeft: number) {
  return daysLeft === 0 ? "오늘 마감" : `마감 D-${daysLeft}`;
}

export function dateLabel(date: string | null, rel: number | null, today: string) {
  if (!date) return rel === null ? "" : rel === 0 ? "퇴원 당일" : rel < 0 ? `퇴원 ${-rel}일 전` : `퇴원 ${rel}일 후`;
  const d = dayDiff(date, today);
  const md = `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`;
  return d === 0 ? `오늘 (${md})` : d === 1 ? `내일 (${md})` : d === -1 ? `어제 (${md})` : md;
}

// 시간대와 회복 단계에 맞춘 씩씩이 감성 한마디
// 상황이 없는 평소 시간대에 돌려 쓰는 한마디. 시간 단위로 바뀌고 같은 시간엔 새로고침해도 같다. 의료 지시 없이 쉬라는 말만 담는다.
const CHEER_MORNING = [
  "오늘 할 일은 하나만 정해 봐요", "아침 챙기셨어요? 돌보는 사람이 먼저 든든해야 해요", "창문 열고 바람 한 번 쐬어요",
  "오늘도 천천히, 할 수 있는 만큼만요", "물 한 잔으로 하루를 시작해요", "씩씩이는 오늘도 옆에 있어요",
  "오늘 못 끝내도 괜찮아요. 내일 또 있어요", "컨디션 먼저 살피고 시작해요", "급한 일부터 하나, 나머지는 천천히요",
  "오늘 도움이 필요하면 가족에게 하나만 부탁해요", "잠깐 햇빛 보러 나가 봐요",
];
const CHEER_DAY = [
  "점심은 거르지 않았죠? 꼭 챙겨 드세요", "잠깐 앉아서 쉬어 가요", "오전에 한 일, 충분히 잘했어요",
  "물 한 잔 마시고 기지개 한 번 켜요", "할 일이 밀려도 괜찮아요. 하나씩 해요", "혼자 다 하려고 하지 않아도 돼요",
  "지금 쉬어도 늦지 않았어요", "잠깐 눈 감고 숨 크게 한 번 쉬어요", "모르는 건 씩씩이에게 물어봐요",
  "오늘 급한 것 하나만 보면 돼요", "오후도 천천히 가요",
];
const CHEER_EVENING = [
  "오늘 하루 고생했어요. 이제 좀 쉬어요", "저녁은 챙겨 드셨어요?", "오늘 한 일 중 하나만 떠올려 봐요. 충분히 했어요",
  "내일 할 일은 내일의 내가 해요", "따뜻한 물로 몸 풀고 쉬어요", "오늘도 무사히 지나갔어요",
  "하루 마무리, 10초만 기록하고 쉬어요", "불 끄기 전에 휴대폰은 내려놓아요", "가족에게 오늘 어땠는지 한마디 건네 봐요",
  "잘 쉬는 것도 돌봄이에요", "오늘 못 한 일은 내일 해도 돼요",
];
// seed가 없으면 항상 첫 줄(기본 문구). 있으면 기본 문구와 돌려 쓰는 문구 중 하나
const pickCheer = (first: string, pool: string[], seed?: string) => {
  if (!seed) return first;
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return [first, ...pool][h % (pool.length + 1)];
};

export function timeContextCheer(stage: "visit" | "pre" | "recovery", checkedToday: boolean, hour: number, daysSince?: number, isSelfCare = false, seed?: string) {
  if (hour >= 0 && hour < 6) return isSelfCare ? "늦은 밤 갑자기 아프면 망설이지 말고 119" : "늦은 밤 간병 힘내세요. 응급 시엔 119";
  if (stage === "visit") return hour < 12 ? (isSelfCare ? "오늘 외래 진료! 신분증과 카드 챙기기" : "오늘 외래 진료! 신분증 챙기기") : (isSelfCare ? "진료 잘 받으시고 조심히 귀가하세요" : "병원 진료 동행, 힘내세요");
  if (stage === "pre") {
    if (hour < 12) return isSelfCare ? "오늘 원무과에 요청할 서류 확인하기" : "오늘 챙길 서류와 질문 확인하기";
    if (hour >= 18) return isSelfCare ? "퇴원 준비, 씩씩이가 곁에서 챙겨요" : "퇴원 준비, 차근차근 같이 해요";
    return isSelfCare ? "퇴원 준비, 씩씩이와 같이 해요" : "퇴원 준비, 같이 해요";
  }
  // recovery (퇴원 후 회복)
  if (checkedToday) return isSelfCare ? "오늘 안부 기록 완료! 따뜻한 밤 보내세요" : "오늘 데일리 체크 완료! 푹 쉬세요";
  // 사후 가입자 배려: 퇴원 후 7일 이내 초기 회복기 보호자/환자에게 놓친 서류/지원금 점검 안내
  if (daysSince !== undefined && daysSince > 0 && daysSince <= 7) {
    if (hour >= 18) return isSelfCare ? `퇴원 ${daysSince}일째, 오늘 컨디션을 기록해 둘까요?` : `퇴원 ${daysSince}일째, 데일리 체크를 남겨보세요`;
    return isSelfCare ? `퇴원 ${daysSince}일째, 놓친 서류와 지원금부터 챙겨 드릴게요` : `퇴원 ${daysSince}일째, 놓친 서류와 미신청 지원금부터 점검해 드릴게요`;
  }
  const s = seed && `${seed}:${hour}`;
  if (hour >= 18) return pickCheer(isSelfCare ? "오늘 하루 고생 많으셨어요. 10초 안부를 남겨볼까요?" : "10초 데일리 체크를 남겨보세요", CHEER_EVENING, s || undefined);
  if (hour < 12) return pickCheer(isSelfCare ? "좋은 아침! 오늘 컨디션은 어떠세요?" : "좋은 아침! 밤새 편안하셨나요?", CHEER_MORNING, s || undefined);
  return pickCheer("오늘도 씩씩하게 회복해요", CHEER_DAY, s || undefined);
}

// 퇴원일 전후 주말 원무과·주민센터 휴무 사전 경고 (D-1 주말 보정)
export function weekendDischargeWarning(discharge: string | null, today: string): string | null {
  if (!discharge) return null;
  const d = dayDiff(discharge, today);
  if (d < 1 || d > 3) return null;

  const dischargeDay = new Date(`${discharge}T00:00:00Z`).getUTCDay(); // 0:일, 1:월, 6:토
  if (dischargeDay === 1) {
    return "퇴원 전날(D-1)은 일요일이라 원무과와 주민센터가 쉬어요. 서류 발급과 긴급 지원 신청은 금요일에 미리 확인해 두세요.";
  }
  if (dischargeDay === 0) {
    return "퇴원 당일(D-Day)과 전날은 주말이라 원무과 업무가 제한될 수 있어요. 필요한 서류는 금요일에 미리 챙겨두세요.";
  }
  return null;
}
