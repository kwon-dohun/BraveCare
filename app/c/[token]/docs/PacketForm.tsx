"use client";
import { useState } from "react";
import { savePacket } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { PACKET, SILSON24_URL } from "@/lib/packet";
import type { SilsonHospital } from "@/lib/silson";
import { useAct } from "@/components/useAct";

const S24 = [["yes", "전산 청구가 돼요"], ["no", "안 돼요"], ["", "아직 몰라요"]] as const;

export default function PacketForm({ auth, hospital, silson24, checked }: { auth: Auth; hospital: string; silson24: "yes" | "no" | null; checked: string[] }) {
  const [name, setName] = useState(hospital);
  const [s24, setS24] = useState<string>(silson24 ?? "");
  const [sel, setSel] = useState(checked);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SilsonHospital[] | null>(null);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);

  const { run, pending, err } = useAct();
  const save = (h: string, s: string, c: string[]) => run(() => savePacket(auth, h, s || null, c));

  const toggle = (id: string) => {
    const next = sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id];
    setSel(next);
    save(name, s24, next);
  };

  const handleSearch = async () => {
    const q = name.trim();
    if (q.length < 2) {
      setSearchMsg("병원 이름을 2글자 이상 입력해 주세요");
      return;
    }
    setSearching(true);
    setSearchMsg(null);
    setSearchResults(null);

    try {
      const res = await fetch(`/api/silson?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!data.ok) {
        setSearchMsg(data.message || "조회에 실패했어요");
        return;
      }

      const list: SilsonHospital[] = data.hospitals ?? [];
      setSearchResults(list);

      if (list.length === 1) {
        // 정확히 1개 매칭 시 자동 선택
        const target = list[0];
        setName(target.name);
        setS24("yes");
        save(target.name, "yes", sel);
        setSearchMsg(`✅ '${target.name}'은(는) 실손24 전산 청구 지원 병원입니다`);
      } else if (list.length > 1) {
        setSearchMsg(`실손24 참여 병원 ${list.length}곳이 검색되었어요. 해당 병원을 선택해 주세요.`);
      } else {
        setS24("no");
        save(name, "no", sel);
        setSearchMsg("⚠️ 실손24 참여 목록에 없습니다. 미참여 병원이면 퇴원 전 서류 4종을 꼭 받아두세요.");
      }
    } catch {
      setSearchMsg("일시적으로 조회가 원활하지 않아요. 수동으로 선택하거나 공식 사이트를 확인해 주세요.");
    } finally {
      setSearching(false);
    }
  };

  const pickHospital = (h: SilsonHospital) => {
    setName(h.name);
    setS24("yes");
    save(h.name, "yes", sel);
    setSearchResults(null);
    setSearchMsg(`✅ '${h.name}' 실손24 전산 청구 가능 병원으로 등록되었어요`);
  };

  return (
    <>
      <section className="mt-6" aria-labelledby="p1">
        <div className="flex items-center justify-between">
          <h2 id="p1" className="font-semibold">1. 실손24 전산 청구가 되는 병원인가요?</h2>
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">공공데이터 연동</span>
        </div>
        <p className="mt-1 text-sm text-muted">입원한 병원을 검색하면 실손24 참여 여부를 1초 만에 확인해 드려요.</p>

        <label htmlFor="hn" className="mt-3 block text-sm font-medium">입원한 병원</label>
        <div className="mt-1 flex gap-2">
          <input
            id="hn"
            value={name}
            maxLength={40}
            onChange={(e) => {
              setName(e.target.value);
              setSearchResults(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            onBlur={() => name !== hospital && save(name, s24, sel)}
            placeholder="예: 서울대병원, 아산병원, 세브란스"
            className="min-w-0 flex-1 rounded-xl border border-line bg-card px-4 py-3 text-ink outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="shrink-0 rounded-xl bg-primary px-4 py-3 font-semibold text-ink shadow-sm active:opacity-80 disabled:opacity-50"
          >
            {searching ? "조회 중…" : "실손24 조회"}
          </button>
        </div>

        {searchMsg && (
          <p role="status" className={`mt-2 rounded-xl p-3 text-sm ${s24 === "yes" ? "bg-accent-soft text-accent" : s24 === "no" ? "bg-warn-soft text-warn" : "bg-card text-muted shadow-card"}`}>
            {searchMsg}
          </p>
        )}

        {/* 검색 결과 다건 목록 */}
        {searchResults && searchResults.length > 1 && (
          <div className="mt-2 divide-y divide-line rounded-xl border border-line bg-card shadow-card">
            <p className="px-3 py-2 text-xs font-medium text-muted">검색된 실손24 참여 병원 중 선택해 주세요:</p>
            {searchResults.map((h, idx) => (
              <button
                key={`${h.name}-${idx}`}
                type="button"
                onClick={() => pickHospital(h)}
                className="flex w-full flex-col items-start px-3 py-2.5 text-left hover:bg-accent-soft/50"
              >
                <span className="font-semibold text-ink">{h.name} <span className="ml-1 text-xs text-accent">[{h.type || "참여 요양기관"}]</span></span>
                {h.address && <span className="text-xs text-muted">{h.address}</span>}
              </button>
            ))}
          </div>
        )}

        <div role="radiogroup" aria-label="실손24 지원 여부" className="mt-3 grid grid-cols-3 gap-2">
          {S24.map(([v, l]) => (
            <button
              key={l}
              role="radio"
              aria-checked={s24 === v}
              onClick={() => {
                setS24(v);
                save(name, v, sel);
              }}
              className={`rounded-xl px-2 py-3 text-sm transition-all ${
                s24 === v ? "bg-accent-soft font-semibold text-accent ring-[1.5px] ring-primary" : "bg-card shadow-card"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {s24 === "yes" && (
          <p role="status" className="mt-3 rounded-xl bg-accent-soft p-3 text-sm text-accent">
            🎉 퇴원 후 실손24 앱에서 종이 서류 없이 간편하게 청구할 수 있어요. 그래도 진료비 영수증과 세부내역서는 다른 보험 청구를 위해 챙겨두면 좋아요.
          </p>
        )}
        {s24 === "no" && (
          <p role="status" className="mt-3 rounded-xl bg-warn-soft p-3 text-sm text-warn font-medium">
            ⚠️ 실손24 미지원 병원입니다. 퇴원 날 원무과에서 아래 서류 4종 패키지를 떼지 않으면 보험금을 받지 못하고 병원을 다시 찾아야 해요!
          </p>
        )}
        {s24 === "" && (
          <p className="mt-3 text-sm text-muted">
            확인이 어렵다면 공식 사이트에서 검색해 보시거나, 퇴원 시 아래 서류를 받아두는 쪽이 안전해요.
          </p>
        )}

        <a
          href={SILSON24_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center justify-center rounded-full bg-card border border-line px-4 py-2.5 text-xs font-medium text-muted hover:text-ink shadow-sm"
        >
          실손24 공식 사이트에서 직접 확인하기 ↗
        </a>
      </section>

      <section className="mt-8" aria-labelledby="p2">
        <h2 id="p2" className="font-semibold">
          2. 원무과에서 받을 서류 ({sel.length}/{PACKET.length})
        </h2>
        <ul className={`mt-2 divide-y divide-line rounded-xl bg-card shadow-card ${pending ? "opacity-70" : ""}`}>
          {PACKET.map((p) => (
            <li key={p.id}>
              <label className="flex items-start gap-3 px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sel.includes(p.id)}
                  onChange={() => toggle(p.id)}
                  className="mt-1 h-5 w-5 shrink-0 accent-primary"
                />
                <span>
                  <span className={`font-medium ${sel.includes(p.id) ? "text-muted line-through" : ""}`}>{p.name}</span>
                  <span className="block text-sm text-muted">{p.note}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-muted">
          창구에서 이 화면을 보여주고 &ldquo;이 서류들 발급해 주세요&rdquo;라고 하면 돼요. 발급비는 병원마다 달라요.
        </p>
        {err && <p role="alert" className="mt-2 text-warn">{err}</p>}
      </section>
    </>
  );
}
