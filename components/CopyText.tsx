"use client";
import { useState } from "react";

// 전화·방문 때 읽을 문장을 한 번에 복사한다(복사가 막힌 브라우저에서는 조용히 넘어간다)
export default function CopyText({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); } catch {} }}
      className="mt-2 min-h-0 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-accent shadow-card"
    >
      {done ? "복사했어요" : "문장 복사하기"}
    </button>
  );
}
