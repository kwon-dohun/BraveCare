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
  const { data } = await db.from("documents").select("id,doc_type,transcript").eq("case_id", actor.caseId).order("created_at", { ascending: false }).limit(5);
  const docs = (data ?? []) as { id: string; doc_type: DocType; transcript: string }[];
  const isPre = !caseData.input.dischargeDate || caseData.today <= caseData.input.dischargeDate;

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-title">씩씩이에게 물어보기</h1>
          <p className="mt-0.5 text-xs text-muted">일정·지원·보관한 서류를 바탕으로 답해요</p>
        </div>
        <Link href={`${base}/scan`} className="flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-accent shadow-card hover:bg-accent-soft">
          <Icon name="camera" size={14} />서류 찍기
        </Link>
      </div>

      {docs.length > 0 && (
        <details className="mt-3 rounded-xl bg-card shadow-card">
          <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold text-muted">보관한 서류 ({docs.length}장) 내용 보기</summary>
          <ul className="space-y-2 px-4 pb-3">
            {docs.map((d) => (
              <li key={d.id} className="rounded-lg bg-background p-2.5">
                <p className="text-caption font-semibold text-accent">{DOC_TYPE_LABEL[d.doc_type]}</p>
                <p className="mt-0.5 whitespace-pre-wrap text-xs text-ink/80">{d.transcript.slice(0, 150)}{d.transcript.length > 150 ? "…" : ""}</p>
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
