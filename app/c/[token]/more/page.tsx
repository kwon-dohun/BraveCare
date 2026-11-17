import Link from "next/link";
import { adminPage } from "@/lib/page-auth";
import { PACKET } from "@/lib/packet";
import { loadDaily } from "@/lib/daily";
import Icon, { type IconName } from "@/components/Icon";
import { Logo } from "@/components/Mascot";

export const metadata = { title: "전체 · 씩씩케어" };

type Row = [href: string, icon: IconName, label: string, sub: string];

// 하단 탭(홈·지원·씩씩이·일정)에 없는 기능만 쓰임새별로 묶는다. 지원은 하단 탭에 있어 여기엔 두지 않는다.
// 한 줄에 하나씩, 지금 상태를 한 줄로 보여준다(한 손으로 훑어 읽기 쉽고, 칸이 비는 일이 없다).
export default async function More(props: PageProps<"/c/[token]/more">) {
  const { token } = await props.params;
  const { actor, data, base } = await adminPage(token);
  const qLeft = data.tasks.filter((t) => t.kind === "question" && !t.done).length;
  const daily = await loadDaily(actor.caseId);
  const checkedToday = daily.some((c) => c.check_date === data.today);

  const groups: [string, Row[]][] = [
    ["진료 준비", [
      ["/daily", "heart", "데일리 체크",
        data.input.dailyCompleted ? "회복 완료로 기록을 마쳤어요" : checkedToday ? "오늘 기록했어요" : "오늘 아직 안 남겼어요 · 약·체온·통증 10초"],
      ["/questions", "help", "물어볼 것", qLeft ? `의료진에게 ${qLeft}개` : "회진·외래 때 보여주기"],
      ["/report", "chart", "외래 리포트", "진료실에서 보여줄 한 장"],
    ]],
    ["함께하기", [
      ...(data.isSelfCare ? [["/solo-guide", "heart", "퇴원 안심 가이드", "안심동행·긴급돌봄·119"] as Row] : []),
      data.alone
        ? ["/family", "users", "함께 챙길 사람 초대", "병원 동행·서류를 나눠 맡길 수 있어요"]
        : ["/family", "users", data.isSelfCare ? "함께 챙기는 사람" : "가족과 나누기", `${data.members.length}명 참여 중`],
    ]],
    ["서류", [
      ["/scan", "camera", "서류 찍어서 정리", "안내문·약봉투·병원 문자"],
      ["/docs", "file", "보험 청구 서류", `${data.packet.length}/${PACKET.length}개 준비`],
    ]],
    ["설정·도움말", [
      ["/glossary", "book", "쉬운 용어 사전", "외래·산정특례·실손24…"],
      ["/help", "help", "도움말·문의", "자주 묻는 질문"],
      ["/settings", "settings", "설정", "퇴원일·글자 크기·주소"],
    ]],
  ];

  return (
    <>
      <Logo />
      <h1 className="mt-5 font-display text-title">전체</h1>
      {groups.map(([title, items]) => (
        <section key={title} className="mt-6" aria-label={title}>
          <h2 className="mb-2 text-sm font-semibold text-muted">{title}</h2>
          <ul className="divide-y divide-line rounded-xl bg-card shadow-card">
            {items.map(([href, icon, label, sub]) => (
              <li key={href}>
                <Link href={base + href} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent"><Icon name={icon} size={20} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{label}</span>
                    <span className="block truncate text-xs text-muted">{sub}</span>
                  </span>
                  <Icon name="right" size={18} className="shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="mt-8 flex justify-center gap-3 text-xs text-muted">
        <Link href="/privacy" className="flex min-h-0 items-center py-2 underline">개인정보처리방침</Link>
        <Link href="/terms" className="flex min-h-0 items-center py-2 underline">이용약관</Link>
      </p>
    </>
  );
}
