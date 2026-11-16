"use client";
import { useEffect, useRef, useState } from "react";
import { askChat } from "@/app/scan-actions";
import { addTask } from "@/app/actions";
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
  const [addingQ, setAddingQ] = useState(false);
  const [addedQ, setAddedQ] = useState<Record<string, boolean>>({});
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  // 글이 길어지면 아랫줄로 늘어나고, 6줄쯤 넘으면 그 안에서 스크롤
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

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

  const handleAddQuestion = async (qTitle: string) => {
    if (addingQ || addedQ[qTitle]) return;
    setAddingQ(true);
    try {
      await addTask(auth, qTitle, null, "question");
      setAddedQ((s) => ({ ...s, [qTitle]: true }));
    } catch {
      // ignore
    } finally {
      setAddingQ(false);
    }
  };

  // 홈의 질문창에서 넘어온 질문은 들어오자마자 묻는다
  const started = useRef(false);
  useEffect(() => {
    if (initial && !started.current) { started.current = true; ask(initial); }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 처음 한 번만
  }, []);

  return (
    <div className="flex flex-1 flex-col justify-between pt-3">
      {/* 위험 신호는 대화보다 먼저 */}
      {urgent && (
        <aside className="mb-4 rounded-xl bg-warn-soft p-4 text-warn" role="alert">
          <p className="text-sm font-semibold">이럴 땐 기다리지 말고 119·응급실</p>
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {RED_FLAGS.map((f) => <li key={f}>· {f}</li>)}
          </ul>
          <a href="tel:119" className="mt-3 flex items-center justify-center rounded-full bg-warn px-4 py-2.5 text-sm font-semibold text-white">119에 전화하기</a>
        </aside>
      )}

      <div className="space-y-4" aria-live="polite">
        <Bot>
          <p>안녕하세요, 씩씩이예요. 우리 집 일정과 할 일, 받을 수 있는 지원{docCount ? `, 보관한 서류 ${docCount}장` : ""}을 보고 답해 드려요.</p>
          <p className="mt-1 text-sm text-muted">진단이나 약 처방은 하지 않아요. 몸 상태는 꼭 의료진에게 확인해 주세요.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <button key={c} disabled={busy} onClick={() => ask(c)} className="h-8 min-h-0 rounded-full bg-accent-soft px-3 text-xs font-medium text-accent disabled:opacity-50">{c}</button>
            ))}
          </div>
        </Bot>

        {turns.map((t, i) => (
          <div key={i} className="view-in space-y-3">
            <p className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-callout text-ink">{t.q}</p>
            {t.a ? (
              <Bot>
                <p className="font-semibold leading-relaxed">{t.a.summary}</p>
                {t.a.sourceQuote ? (
                  <div className="mt-2.5 rounded-lg bg-background px-3 py-2">
                    <p className="text-caption font-semibold text-accent">근거 · {t.a.source}</p>
                    <p className="mt-0.5 text-xs text-ink/80">“{t.a.sourceQuote}”</p>
                  </div>
                ) : t.a.unverified && (
                  <p className="mt-2.5 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">자료에서 근거 문장을 찾지 못했어요. 참고만 하고 꼭 병원에 확인해 주세요.</p>
                )}
                {t.a.advice && <p className="mt-2.5 text-xs text-muted leading-relaxed">{t.a.advice}</p>}

                {/* 민감한 의료 질문 발생 시 -> 의료진에게 물어볼 질문 리스트 추가 연결 */}
                {t.a.suggestDoctorQuestion && (
                  <div className="mt-3 rounded-xl border border-primary/40 bg-accent-soft p-3">
                    <p className="text-caption font-semibold text-accent">진료실에서 의료진에게 여쭤볼 수 있어요</p>
                    <p className="mt-1 text-xs font-medium text-ink">“{t.a.suggestDoctorQuestion}”</p>
                    {addedQ[t.a.suggestDoctorQuestion] ? (
                      <p className="mt-2 text-caption font-semibold text-accent">✓ 의료진에게 물어볼 질문에 등록했어요 (외래 리포트에도 나와요)</p>
                    ) : (
                      <button
                        type="button"
                        disabled={addingQ}
                        onClick={() => handleAddQuestion(t.a!.suggestDoctorQuestion!)}
                        className="mt-2 flex items-center gap-1 rounded-full bg-card px-3 py-1 text-xs font-semibold text-accent shadow-card hover:bg-accent-soft disabled:opacity-50"
                      >
                        <Icon name="plus" size={13} /> 질문 리스트에 추가
                      </button>
                    )}
                  </div>
                )}
              </Bot>
            ) : t.err ? (
              <Bot><p className="text-sm text-warn">{t.err}</p></Bot>
            ) : (
              <ThinkingBubble />
            )}
          </div>
        ))}
        <div ref={end} className="scroll-mb-36" />
      </div>

      {/* 입력창은 하단 탭 바로 위에 mt-auto로 붙어 항상 최하단에 위치 */}
      <form className="sticky bottom-[4.5rem] z-10 mt-6 flex items-end gap-2 rounded-[1.5rem] border border-line bg-card/95 p-1.5 pl-4 shadow-lg backdrop-blur-md transition-colors focus-within:border-accent" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
        <label htmlFor="cq" className="sr-only">씩씩이에게 질문</label>
        {/* 16px 글씨라 휴대폰이 입력할 때 화면을 확대하지 않는다. 컴퓨터에서는 Enter로 보내고 Shift+Enter로 줄바꿈, 휴대폰은 Enter가 줄바꿈 */}
        <textarea id="cq" ref={box} rows={1} value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder="무엇이든 물어보세요"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) { e.preventDefault(); ask(text); }
          }}
          className="min-h-0 min-w-0 flex-1 resize-none bg-transparent py-2 text-base leading-6 outline-none" />
        <button disabled={busy || !text.trim()} aria-label="보내기" className="flex h-10 w-10 min-h-0 shrink-0 items-center justify-center rounded-full bg-primary text-ink disabled:opacity-30"><Icon name="send" size={18} /></button>
      </form>
    </div>
  );
}

function Bot({ children, mascotClass }: { children: React.ReactNode; mascotClass?: string }) {
  return (
    <div className="flex items-start gap-2">
      <Mascot size={36} className={`mt-1 ${mascotClass ?? ""}`} />
      <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-card px-4 py-3 shadow-card">{children}</div>
    </div>
  );
}

function ThinkingBubble() {
  const [delayed, setDelayed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDelayed(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Bot mascotClass="mascot-bob">
      <div className="py-1">
        <div className="flex items-center gap-1.5" aria-label="답을 작성하는 중">
          <span className="dot-bounce h-2.5 w-2.5 rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
          <span className="dot-bounce h-2.5 w-2.5 rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
          <span className="dot-bounce h-2.5 w-2.5 rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
        </div>
        {delayed && (
          <p className="mt-2 text-xs text-muted transition-opacity duration-300">
            답변을 준비하고 있어요. 조금만 기다려 주세요.
          </p>
        )}
      </div>
    </Bot>
  );
}
