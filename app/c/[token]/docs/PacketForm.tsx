"use client";
import { useState } from "react";
import { savePacket } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { PACKET, SILSON24_URL } from "@/lib/packet";
import { useAct } from "@/components/useAct";

const S24 = [["yes", "전산 청구가 돼요"], ["no", "안 돼요"], ["", "아직 몰라요"]] as const;

export default function PacketForm({ auth, hospital, silson24, checked }: { auth: Auth; hospital: string; silson24: "yes" | "no" | null; checked: string[] }) {
  const [name, setName] = useState(hospital);
  const [s24, setS24] = useState<string>(silson24 ?? "");
  const [sel, setSel] = useState(checked);
  const { run, pending, err } = useAct();
  const save = (h: string, s: string, c: string[]) => run(() => savePacket(auth, h, s || null, c));
  const toggle = (id: string) => {
    const next = sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id];
    setSel(next);
    save(name, s24, next);
  };

  return (
    <>
      <section className="mt-6" aria-labelledby="p1">
        <h2 id="p1" className="font-semibold">1. 실손24 전산 청구가 되는 병원인가요?</h2>
        <p className="mt-1 text-sm text-muted">되는 병원이면 종이 서류 없이 실손24 앱에서 청구할 수 있어요. 안 되는 병원이면 아래 서류를 꼭 받아두세요.</p>
        <label htmlFor="hn" className="mt-3 block text-sm font-medium">입원한 병원</label>
        <input id="hn" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} onBlur={() => name !== hospital && save(name, s24, sel)} placeholder="예: 서울OO병원" className="mt-1 w-full rounded-xl border border-line bg-card px-4 py-3" />
        <a href={SILSON24_URL} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center rounded-full bg-accent-soft px-4 py-3 font-semibold text-accent">실손24에서 병원 찾아보기</a>
        <div role="radiogroup" aria-label="실손24 지원 여부" className="mt-3 grid grid-cols-3 gap-2">
          {S24.map(([v, l]) => (
            <button key={l} role="radio" aria-checked={s24 === v} onClick={() => { setS24(v); save(name, v, sel); }}
              className={`rounded-xl px-2 py-3 text-sm ${s24 === v ? "bg-accent-soft font-semibold text-accent ring-[1.5px] ring-primary" : "bg-card shadow-card"}`}>{l}</button>
          ))}
        </div>
        {s24 === "yes" && <p role="status" className="mt-3 rounded-xl bg-accent-soft p-3 text-sm text-accent">퇴원 후 실손24 앱에서 청구할 수 있어요. 그래도 영수증과 세부내역서는 받아두면 다른 보험 청구에 쓸 수 있어요.</p>}
        {s24 === "no" && <p role="status" className="mt-3 rounded-xl bg-warn-soft p-3 text-sm text-warn">종이 서류로 청구해야 해요. 퇴원 당일 아래 서류를 원무과에서 받아두세요.</p>}
        {s24 === "" && <p className="mt-3 text-sm text-muted">확인이 어려우면 아래 서류를 받아두는 쪽이 안전해요.</p>}
      </section>

      <section className="mt-8" aria-labelledby="p2">
        <h2 id="p2" className="font-semibold">2. 원무과에서 받을 서류 ({sel.length}/{PACKET.length})</h2>
        <ul className={`mt-2 divide-y divide-line rounded-xl bg-card shadow-card ${pending ? "opacity-70" : ""}`}>
          {PACKET.map((p) => (
            <li key={p.id}>
              <label className="flex items-start gap-3 px-4 py-3">
                <input type="checkbox" checked={sel.includes(p.id)} onChange={() => toggle(p.id)} className="mt-1 h-5 w-5 shrink-0" />
                <span><span className={`font-medium ${sel.includes(p.id) ? "text-muted line-through" : ""}`}>{p.name}</span><span className="block text-sm text-muted">{p.note}</span></span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-muted">창구에서 이 화면을 보여주고 &ldquo;이 서류들 발급해 주세요&rdquo;라고 하면 돼요. 발급비는 병원마다 달라요.</p>
        {err && <p role="alert" className="mt-2 text-warn">{err}</p>}
      </section>
    </>
  );
}
