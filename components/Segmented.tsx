"use client";
import { useState } from "react";
import Link from "next/link";

// 알약 모양 2~3칸 전환. 누르는 즉시 배경이 미끄러져 가고, 화면은 뒤따라 바뀐다.
export default function Segmented({ items, active, label, inline = false }: {
  items: { label: string; href?: string; onClick?: () => void }[];
  active: number; label: string; inline?: boolean;
}) {
  const [sel, setSel] = useState(active);
  const [prev, setPrev] = useState(active);
  if (prev !== active) { setPrev(active); setSel(active); } // 뒤로가기 등 바깥에서 바뀐 경우

  return (
    <nav aria-label={label} className={`${inline ? "inline-grid" : "grid"} relative auto-cols-fr grid-flow-col rounded-full bg-card p-1 shadow-card`}>
      <span
        aria-hidden
        className="seg-thumb absolute inset-y-1 left-1 rounded-full bg-accent-soft"
        style={{ width: `calc((100% - 0.5rem) / ${items.length})`, transform: `translateX(${Math.max(sel, 0) * 100}%)` }}
      />
      {items.map((it, i) => {
        const on = i === sel;
        const cls = `relative flex items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors duration-200 ${on ? "text-accent" : "text-muted hover:text-ink"}`;
        return it.href ? (
          <Link key={it.label} href={it.href} onClick={() => setSel(i)} aria-current={on ? "page" : undefined} className={cls}>{it.label}</Link>
        ) : (
          <button key={it.label} type="button" onClick={() => { setSel(i); it.onClick?.(); }} aria-pressed={on} className={cls}>{it.label}</button>
        );
      })}
    </nav>
  );
}
