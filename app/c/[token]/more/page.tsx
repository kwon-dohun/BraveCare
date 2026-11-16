import Link from "next/link";
import { adminPage } from "@/lib/page-auth";
import { PACKET } from "@/lib/packet";
import Icon, { type IconName } from "@/components/Icon";
import { Logo } from "@/components/Mascot";

export const metadata = { title: "전체 · 씩씩케어" };

// 하단 탭에 다 못 넣은 기능을 쓰임새별로 묶어 한 화면에. 타일마다 지금 상태를 한 줄로 보여준다.
export default async function More(props: PageProps<"/c/[token]/more">) {
  const { token } = await props.params;
  const { data, base } = await adminPage(token);
  const high = data.results.filter((r) => r.verdict === "high").length;
  const qLeft = data.tasks.filter((t) => t.kind === "question" && !t.done).length;
  const applied = Object.values(data.status).filter((s) => s === "applied" || s === "approved").length;

  const groups: [string, [string, IconName, string, string, string][]][] = [
    ["돌봄", [
      ["/benefits", "gift", "받을 수 있는 지원", high ? `가능성 높음 ${high}개 · 신청 ${applied}개` : `확인해 볼 지원 ${data.results.filter((r) => r.verdict === "check").length}개`, "bg-[#dff7ec] text-[#0b7a57]"],
      ["/family", "users", "가족과 나누기", `${data.members.length}명 참여 중`, "bg-[#ffe9dc] text-[#9a3f12]"],
      ["/daily", "heart", "데일리 체크", "약·체온·통증 하루 상태 기록", "bg-[#ffe4ea] text-[#a3324f]"],
      ["/questions", "help", "물어볼 것", qLeft ? `의료진에게 ${qLeft}개` : "회진·외래 때 보여주기", "bg-[#f1e9ff] text-[#5b3aa6]"],
      ["/report", "chart", "외래 리포트", "진료실에서 보여줄 한 장", "bg-[#e3f0ff] text-[#1f5aa6]"],
    ]],
    ["서류", [
      ["/docs", "file", "보험 청구 서류", `${data.packet.length}/${PACKET.length}개 준비`, "bg-[#fff4cc] text-[#7a5a00]"],
      ["/scan", "camera", "서류 찍어서 정리", "안내문·약봉투·병원 문자", "bg-[#f1e9ff] text-[#5b3aa6]"],
    ]],
    ["도움말", [
      ["/glossary", "book", "쉬운 용어 사전", "외래·산정특례·실손24…", "bg-[#dff7ec] text-[#0b7a57]"],
      ["/help", "help", "도움말·문의", "자주 묻는 질문", "bg-[#e3f0ff] text-[#1f5aa6]"],
      ["/settings", "settings", "설정", "퇴원일·글자 크기·주소", "bg-[#eef1f0] text-[#45524d]"],
    ]],
  ];

  return (
    <>
      <Logo />
      <h1 className="mt-5 font-display text-title">전체</h1>
      {groups.map(([title, items]) => (
        <section key={title} className="mt-6" aria-label={title}>
          <h2 className="mb-2 text-sm font-semibold text-muted">{title}</h2>
          <ul className="grid grid-cols-2 gap-2">
            {items.map(([href, icon, label, sub, tint]) => (
              <li key={href}>
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
      </p>
    </>
  );
}
