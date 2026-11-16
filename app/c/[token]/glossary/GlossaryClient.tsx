"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import Mascot from "@/components/Mascot";
import { type Term, searchGlossary } from "@/lib/glossary";

export default function GlossaryClient({ base, initialTerms }: { base: string; initialTerms: Term[] }) {
  const [q, setQ] = useState("");
  const filtered = searchGlossary(q, initialTerms);

  return (
    <div>
      {/* 띄어쓰기 무관 실시간 검색창 */}
      <div className="relative mt-4">
        <label htmlFor="glossary-search" className="sr-only">용어 검색</label>
        <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2.5 shadow-card focus-within:border-accent">
          <Icon name="search" size={18} className="shrink-0 text-muted" />
          <input
            id="glossary-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="궁금한 용어 검색 (예: 실손24, 산정특례, 발사)"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="p-1 text-xs text-muted hover:text-ink"
              aria-label="검색어 지우기"
            >
              지우기
            </button>
          )}
        </div>
      </div>

      {/* 검색 결과 목록 또는 빈 화면 가이드 */}
      {filtered.length > 0 ? (
        <ul className="mt-4 space-y-2.5">
          {filtered.map((t) => (
            <li key={t.word} className="rounded-xl bg-card p-4 shadow-card">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-ink">{t.word}</p>
                {t.when && (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-caption font-semibold text-accent">
                    {t.when}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-callout text-muted leading-relaxed">{t.plain}</p>
              <Link
                href={`${base}/chat?q=${encodeURIComponent(`${t.word}에 대해 더 알려줘`)}`}
                className="mt-2 inline-flex min-h-0 items-center gap-1 text-sm font-medium text-accent hover:underline"
              >
                <span>씩씩이에게 더 물어보기</span>
                <Icon name="right" size={14} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6 rounded-2xl bg-card p-6 text-center shadow-card border border-line">
          <div className="flex justify-center">
            <Mascot size={56} mood="idle" />
          </div>
          <p className="mt-3 font-semibold text-ink">&lsquo;{q}&rsquo; 용어를 찾지 못했어요</p>
          <p className="mt-1 text-sm text-muted">
            사전에 없는 어려운 병원·보험 용어는 씩씩이에게 바로 물어보세요.
          </p>
          <Link
            href={`${base}/chat?q=${encodeURIComponent(`${q}이(가) 무슨 뜻인지 쉽게 설명해줘`)}`}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-ink hover:opacity-95 shadow-sm"
          >
            씩씩이에게 물어보기
          </Link>
        </div>
      )}
    </div>
  );
}
