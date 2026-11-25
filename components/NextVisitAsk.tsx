"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

// 퇴원 직후(당일~이틀)에만 홈에서 한 번 묻는다. "아직 몰라요"를 누르면 이 기기에서는 다시 묻지 않는다.
export default function NextVisitAsk({ base }: { base: string }) {
  const key = `bc-visit-ask:${base}`;
  const [hide, setHide] = useState(true); // 저장값을 읽기 전에는 숨겨 깜빡임을 막는다
  useEffect(() => {
    try { setHide(localStorage.getItem(key) === "1"); } catch { setHide(false); }
  }, [key]);
  if (hide) return null;
  return (
    <section className="mt-4 rounded-xl bg-card p-4 shadow-card" aria-label="다음 외래 날짜">
      <h2 className="font-semibold">다음 외래 날짜가 정해졌나요?</h2>
      <p className="mt-1 text-sm text-muted">퇴원 안내문이나 접수 때 들은 날짜를 넣어 두면 달력에 표시되고, 가는 날 아침 홈에서 챙겨 드려요.</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <Link href={`${base}/tasks?add=visit`} className="flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-ink">외래 날짜 넣기</Link>
        <button type="button" onClick={() => { try { localStorage.setItem(key, "1"); } catch {} setHide(true); }} className="min-h-11 px-2 text-sm text-muted underline underline-offset-2">아직 몰라요</button>
      </div>
    </section>
  );
}
