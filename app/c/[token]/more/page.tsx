import Link from "next/link";
import { adminPage } from "@/lib/page-auth";
import { PACKET } from "@/lib/packet";
import { loadDaily } from "@/lib/daily";
import Icon, { type IconName } from "@/components/Icon";
import { Logo } from "@/components/Mascot";

export const metadata = { title: "전체 · 씩씩케어" };

type Tile = [href: string, icon: IconName, label: string, sub: string, tint: string];

// 하단 탭(홈·지원·씩씩이·일정)에 없는 기능만 쓰임새별로 묶는다. 지원은 하단 탭에 있어 여기엔 두지 않는다.
// 설정은 홈과 같이 오른쪽 위 톱니바퀴로 둔다. 타일마다 지금 상태를 한 줄로 보여주고, 한 묶음의 개수가 홀수면 마지막 타일을 가로로 넓혀 빈 칸이 생기지 않게 한다.
export default async function More(props: PageProps<"/c/[token]/more">) {
  const { token } = await props.params;
  const { actor, data, base } = await adminPage(token);
  const qLeft = data.tasks.filter((t) => t.kind === "question" && !t.done).length;
  const daily = await loadDaily(actor.caseId);
  const checkedToday = daily.some((c) => c.check_date === data.today);

  const groups: [string, Tile[]][] = [
    ["돌봄", [
      ...(data.isSelfCare ? [["/solo-guide", "heart", "퇴원 안심 가이드", "안심동행·긴급돌봄·119", "bg-[#ffe9dc] text-[#9a3f12]"] as Tile] : []),
      ["/daily", "heart", "데일리 체크",
        data.input.dailyCompleted ? "회복 완료로 기록을 마쳤어요" : checkedToday ? "오늘 기록했어요" : "오늘 아직 안 남겼어요", "bg-[#ffe4ea] text-[#a3324f]"],
      ["/questions", "help", "물어볼 것", qLeft ? `의료진에게 ${qLeft}개` : "회진·외래 때 보여주기", "bg-[#f1e9ff] text-[#5b3aa6]"],
      ["/report", "chart", "외래 리포트", "진료실에서 보여줄 한 장", "bg-[#e3f0ff] text-[#1f5aa6]"],
      data.alone
        ? ["/family", "users", "함께 챙길 사람 초대", "병원 동행·서류를 나눠 맡길 수 있어요", "bg-[#e3f0ff] text-[#1f5aa6]"]
        : ["/family", "users", data.isSelfCare ? "함께 챙기는 사람" : "가족과 나누기", `${data.members.length}명 참여 중`, "bg-[#ffe9dc] text-[#9a3f12]"],
    ]],
    ["서류", [
      ["/scan", "camera", "내 서류함", "안내문·약봉투·병원 문자를 찍어 넣어요", "bg-[#f1e9ff] text-[#5b3aa6]"],
      ["/docs", "file", "보험 청구 서류", `${data.packet.length}/${PACKET.length}개 준비`, "bg-[#fff4cc] text-[#7a5a00]"],
    ]],
    ["도움말", [
      ["/glossary", "book", "쉬운 용어 사전", "외래·산정특례·실손24…", "bg-[#dff7ec] text-[#0b7a57]"],
      ["/help", "help", "도움말·문의", "자주 묻는 질문", "bg-[#e3f0ff] text-[#1f5aa6]"],
    ]],
  ];

  return (
    <>
      <header className="flex items-center justify-between">
        <Logo />
        <Link href={`${base}/settings`} aria-label="설정" className="-mr-2 flex w-11 items-center justify-center text-muted"><Icon name="settings" size={20} /></Link>
      </header>
      <h1 className="mt-5 font-display text-title">전체</h1>
      {groups.map(([title, items]) => (
        <section key={title} className="mt-6" aria-label={title}>
          <h2 className="mb-2 text-sm font-semibold text-muted">{title}</h2>
          <ul className="grid grid-cols-2 gap-2">
            {items.map(([href, icon, label, sub, tint], i) => (
              <li key={href} className={items.length % 2 === 1 && i === items.length - 1 ? "col-span-2" : ""}>
                <Link href={base + href} className="flex h-full flex-col rounded-xl bg-card p-4 shadow-card">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tint}`}><Icon name={icon} size={20} /></span>
                  <span className="mt-3 font-semibold">{label}</span>
                  <span className="mt-0.5 text-xs text-muted">{sub}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="mt-8 flex justify-center gap-3 text-xs text-muted">
        <Link href="/privacy" className="flex min-h-0 items-center py-2 underline">개인정보처리방침</Link>
        <Link href="/terms" className="flex min-h-0 items-center py-2 underline">이용약관</Link>
        <Link href="/licenses" className="flex min-h-0 items-center py-2 underline">오픈소스 라이선스</Link>
      </p>
    </>
  );
}
