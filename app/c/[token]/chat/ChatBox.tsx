"use client";
import { useEffect, useRef, useState } from "react";
import { askChat } from "@/app/scan-actions";
import type { Auth } from "@/lib/db";
import { isEmergency, type ChatAnswer } from "@/lib/chat";
import Mascot from "@/components/Mascot";
import Icon from "@/components/Icon";

interface Turn { q: string; a?: ChatAnswer; err?: string }

const RED_FLAGS = ["숨쉬기 힘들어요", "가슴이 아프거나 답답해요", "의식이 흐리거나 쓰러졌어요", "말이 어눌하거나 한쪽이 마비돼요", "피가 멈추지 않아요", "열이 38도 이상이에요"];

// 메신저처럼 위에서 아래로 쌓이는 대화. 질문은 오른쪽 민트, 씩씩이 답은 왼쪽 흰 말풍선.
export default function ChatBox({ auth, chips, docCount, initial }: { auth: Auth; chips: string[]; docCount: number; initial: string }) {
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns, busy]);

  const ask = async (q: string) => {
    q = q.trim();
    if (!q || busy) return;
    if (isEmergency(q)) setUrgent(true);
    setText("");
    setBusy(true);
    setTurns((t) => [...t, { q }]);
    try {
      const a = await askChat(auth, q);
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, a } : x)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "문제가 생겼어요";
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, err: msg } : x)));
    } finally {
      setBusy(false);
    }
  };

  // 홈의 질문창에서 넘어온 질문은 들어오자마자 묻는다
  const started = useRef(false);
  useEffect(() => {
    if (initial && !started.current) { started.current = true; ask(initial); }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 처음 한 번만
  }, []);

  return (
    <>
      {/* 위험 신호는 대화보다 먼저 */}
      <details open={urgent} className="mt-4 rounded-xl bg-warn-soft px-4 text-warn">
        <summary className="cursor-pointer text-sm font-semibold">이럴 땐 기다리지 말고 119·응급실</summary>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1 pb-3 text-sm">
          {RED_FLAGS.map((f) => <li key={f}>· {f}</li>)}
        </ul>
        <a href="tel:119" className="mb-4 flex items-center justify-center rounded-full bg-warn px-4 py-2.5 text-sm font-semibold text-white">119에 전화하기</a>
      </details>

      <div className="mt-5 space-y-4" aria-live="polite">
        <Bot>
          <p>안녕하세요, 씩씩이예요. 우리 집 퇴원 일정과 할 일, 받을 수 있는 지원{docCount ? `, 보관한 서류 ${docCount}장` : ""}을 보고 답해 드려요.</p>
          <p className="mt-1 text-sm text-muted">진단이나 약 처방은 하지 않아요. 몸 상태는 꼭 의료진에게 확인해 주세요.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <button key={c} disabled={busy} onClick={() => ask(c)} className="h-9 min-h-0 rounded-full bg-accent-soft px-3 text-sm font-medium text-accent disabled:opacity-50">{c}</button>
            ))}
          </div>
        </Bot>

        {turns.map((t, i) => (
          <div key={i} className="space-y-4">
            <p className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-callout text-ink">{t.q}</p>
            {t.a ? (
              <Bot>
                <p className="font-semibold">{t.a.summary}</p>
                {t.a.sourceQuote ? (
                  <div className="mt-2.5 rounded-lg bg-background px-3 py-2">
                    <p className="text-caption font-semibold text-accent">근거 · {t.a.source}</p>
                    <p className="mt-0.5 text-sm">“{t.a.sourceQuote}”</p>
                  </div>
                ) : (
                  <p className="mt-2.5 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">자료에서 근거 문장을 찾지 못했어요. 참고만 하고 꼭 병원에 확인해 주세요.</p>
                )}
                <p className="mt-2.5 text-sm text-muted">{t.a.advice}</p>
              </Bot>
            ) : t.err ? (
              <Bot><p className="text-sm text-warn">{t.err}</p></Bot>
            ) : (
              <Bot><span className="flex gap-1 py-1.5" aria-label="답을 찾는 중">{[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 animate-pulse rounded-full bg-primary" style={{ animationDelay: `${d * 120}ms` }} />)}</span></Bot>
            )}
          </div>
        ))}
        <div ref={end} className="scroll-mb-40" />
      </div>

      {/* 입력창은 하단 탭 위에 붙어 있다 */}
      <form className="sticky bottom-[5.25rem] mt-6 flex items-center gap-2 rounded-full bg-card p-1.5 pl-4 shadow-card" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
        <label htmlFor="cq" className="sr-only">씩씩이에게 질문</label>
        <input id="cq" value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder="무엇이든 물어보세요" className="min-h-0 min-w-0 flex-1 bg-transparent py-2 outline-none" />
        <button disabled={busy || !text.trim()} aria-label="보내기" className="flex h-10 w-10 min-h-0 items-center justify-center rounded-full bg-primary text-ink"><Icon name="send" size={18} /></button>
      </form>
    </>
  );
}

function Bot({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Mascot size={36} className="mt-1" />
      <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-card px-4 py-3 shadow-card">{children}</div>
    </div>
  );
}
