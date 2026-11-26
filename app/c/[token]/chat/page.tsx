import Link from "next/link";
import { adminPage } from "@/lib/page-auth";
import { db } from "@/lib/db";
import { chips } from "@/lib/chat";
import { DOC_TYPE_LABEL, type DocType } from "@/lib/extract";
import Icon from "@/components/Icon";
import ChatBox from "./ChatBox";

export const maxDuration = 60; // 씩씩이 답변도 AI 호출

export const metadata = { title: "씩씩이에게 물어보기 · 씩씩케어" };

export default async function Chat(props: PageProps<"/c/[token]/chat">) {
  const { token } = await props.params;
  const { actor, auth, data: caseData, base } = await adminPage(token);
  const q = (await props.searchParams).q;
  // 서류 글자는 이 화면에서 쓰지 않는다(답은 서버가 읽는다). 종류만 가져와 서류함 요약과 추천 질문에 쓴다
  const { data } = await db.from("documents").select("doc_type").eq("case_id", actor.caseId).order("created_at", { ascending: false });
  const docs = (data ?? []) as { doc_type: DocType }[];
  const byType = docs.reduce((m, d) => m.set(d.doc_type, (m.get(d.doc_type) ?? 0) + 1), new Map<DocType, number>());
  const isPre = !caseData.input.dischargeDate || caseData.today <= caseData.input.dischargeDate;

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-title">씩씩이에게 물어보기</h1>
          <p className="mt-0.5 text-xs text-muted">일정·지원·내 서류함을 바탕으로 답해요</p>
        </div>
        <Link href={`${base}/scan`} className="flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-accent shadow-card hover:bg-accent-soft">
          <Icon name="camera" size={14} />서류 찍기
        </Link>
      </div>

      {docs.length > 0 && (
        <details className="mt-3 rounded-xl bg-card shadow-card">
          <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold text-muted">내 서류함</summary>
          <ul className="divide-y divide-line px-4 pb-1">
            {[...byType].map(([type, n]) => (
              <li key={type}>
                <Link href={`${base}/scan#kp`} className="flex min-h-11 items-center justify-between text-sm">
                  <span>{DOC_TYPE_LABEL[type]} <span className="tabular-nums text-muted">{n}장</span></span>
                  <Icon name="right" size={16} className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}

      <ChatBox
        auth={auth}
        chips={chips(docs.map((d) => d.doc_type), isPre)}
        docCount={docs.length}
        initial={typeof q === "string" ? q.slice(0, 300) : ""}
      />
    </div>
  );
}
