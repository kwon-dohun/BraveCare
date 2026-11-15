"use client";
import { useState } from "react";
import { askChat } from "@/app/scan-actions";
import type { Auth } from "@/lib/db";
import { isEmergency, type ChatAnswer } from "@/lib/chat";
import { useAct } from "@/components/useAct";

interface Turn { q: string; a: ChatAnswer }

export default function ChatBox({ auth, chips, docs }: { auth: Auth; chips: string[]; docs: { id: string; label: string; transcript: string }[] }) {
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [urgent, setUrgent] = useState(false);
  const { run, pending, err } = useAct();

  const ask = (q: string) => {
    if (!q.trim() || pending) return;
    if (isEmergency(q)) setUrgent(true);
    run(async () => {
      const a = await askChat(auth, q);
      setTurns((t) => [{ q, a }, ...t]);
      setText("");
    });
  };

  return (
    <>
      {urgent && (
        <p role="alert" className="mt-4 rounded-xl border-2 border-warn bg-warn-soft p-4 font-semibold text-warn">
          숨쉬기 힘들거나, 가슴이 아프거나, 의식이 흐려지거나, 열이 높으면 여기서 답을 기다리지 말고 119나 병원 응급실에 바로 연락하세요.
        </p>
      )}

      <div className="mt-5 space-y-2">
        {chips.map((c) => (
          <button key={c} disabled={pending} onClick={() => ask(c)} className="w-full rounded-xl bg-card shadow-card px-4 py-3 text-left disabled:opacity-40">{c}</button>
        ))}
      </div>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
        <label htmlFor="cq" className="sr-only">질문</label>
        <input id="cq" value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder="직접 물어보기" className="min-w-0 flex-1 rounded-xl border border-line bg-card px-4 py-3" />
        <button disabled={pending || !text.trim()} className="rounded-xl bg-primary px-5 font-semibold text-ink disabled:opacity-40">묻기</button>
      </form>
      {pending && <p role="status" className="mt-3 text-muted">서류에서 찾는 중…</p>}
      {err && <p role="alert" className="mt-3 rounded-xl bg-warn-soft p-3 text-warn">{err}</p>}

      <ul className="mt-5 space-y-4" aria-live="polite">
        {turns.map((t, i) => (
          <li key={turns.length - i} className="rounded-xl bg-card shadow-card p-4">
            <p className="text-sm text-muted">{t.q}</p>
            <p className="mt-2 text-[1.0625rem] font-semibold">{t.a.summary}</p>
            <div className="mt-3 rounded-lg bg-background p-3">
              <p className="text-sm font-medium text-muted">내 서류에 적힌 문장</p>
              <p className="mt-1">{t.a.sourceQuote ? `“${t.a.sourceQuote}”` : "서류에서 근거 문장을 찾지 못했어요. 위 답은 참고만 하고 꼭 병원에 확인하세요."}</p>
            </div>
            <p className="mt-3 text-sm">{t.a.advice}</p>
          </li>
        ))}
      </ul>

      <details className="mt-8">
        <summary className="cursor-pointer font-semibold">보관한 서류 글자 직접 보기 ({docs.length})</summary>
        <ul className="mt-3 space-y-3">
          {docs.map((d) => (
            <li key={d.id} className="rounded-xl bg-card shadow-card p-3">
              <p className="text-sm font-medium text-accent">{d.label}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{d.transcript}</p>
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
