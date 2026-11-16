"use client";
import { useState, useMemo } from "react";
import { deadlineScore, type Result } from "@/lib/benefits";
import BenefitCard from "./BenefitCard";
import Icon from "./Icon";
import Mascot from "./Mascot";

const FILTERS = [
  { key: "", label: "전체" },
  { key: "high", label: "가능성 높음" },
  { key: "check", label: "확인 필요" },
  { key: "no", label: "해당 없음" },
] as const;

export default function BenefitsFilterView({
  results,
  status,
  base,
  initialFilter = "",
}: {
  results: Result[];
  status: Record<string, string>;
  base: string;
  initialFilter?: string;
}) {
  const [filter, setFilter] = useState<string>(initialFilter);
  const [search, setSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<"deadline" | "verdict">("deadline");

  const highCount = results.filter((r) => r.verdict === "high").length;
  const checkCount = results.filter((r) => r.verdict === "check").length;
  const noCount = results.filter((r) => r.verdict === "no").length;

  const countMap: Record<string, number> = {
    "": results.length,
    high: highCount,
    check: checkCount,
    no: noCount,
  };

  // 1차: 탭 필터링
  const tabFiltered = useMemo(() => {
    if (filter === "high") return results.filter((r) => r.verdict === "high");
    if (filter === "check") return results.filter((r) => r.verdict === "check");
    if (filter === "no") return results.filter((r) => r.verdict === "no");
    return results;
  }, [results, filter]);

  // 2차: 검색어 필터링 (이름, 요약, 비용, 신청처, 판정근거, 필요서류 통합 매칭)
  const searchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tabFiltered;
    const words = q.split(/\s+/);
    return tabFiltered.filter((r) => {
      const target = [
        r.benefit.name,
        r.benefit.summary,
        r.benefit.operator,
        r.benefit.cost,
        r.benefit.apply.place,
        r.reason,
        r.benefit.docs.join(" "),
      ].join(" ").toLowerCase();
      return words.every((w) => target.includes(w));
    });
  }, [tabFiltered, search]);

  // 3차: 가능성순은 서버가 준 순서(sortResults) 그대로, 마감 임박순만 다시 정렬
  // '해당 없음'은 마감이 가까워도 맨 뒤로: 대상이 아닌 제도가 위에 뜨면 헷갈린다
  const sortedList = useMemo(
    () => sortBy === "verdict" ? searchFiltered : [...searchFiltered].sort((a, b) => Number(a.verdict === "no") - Number(b.verdict === "no") || deadlineScore(a) - deadlineScore(b)),
    [searchFiltered, sortBy],
  );

  const card = (r: Result) => (
    <li key={r.benefit.id}>
      <BenefitCard r={r} href={`${base}/benefits/${r.benefit.id}`} status={status[r.benefit.id]} />
    </li>
  );

  const noRow = (r: Result) => (
    <li key={r.benefit.id} className="px-4 py-3">
      <p className="font-medium">{r.benefit.name}</p>
      <p className="text-sm text-muted">{r.reason}</p>
    </li>
  );

  return (
    <div className="mt-4">
      {/* 탭 필터 칩 */}
      <nav aria-label="지원 필터" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={active}
              className={`flex shrink-0 items-center rounded-full border px-4 py-1.5 text-sm transition-colors ${
                active
                  ? "border-foreground bg-foreground font-semibold text-white"
                  : "border-line bg-card text-muted hover:border-ink/30"
              }`}
            >
              {label} <span className="ml-1 tabular-nums">{countMap[key]}</span>
            </button>
          );
        })}
      </nav>

      {/* 키워드 검색창 */}
      <div className="relative mt-3">
        <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="필요한 키워드로 찾기 (예: 휠체어, 간병, 긴급, 식사)"
          className="w-full rounded-2xl border border-line bg-card py-2.5 pl-10 pr-12 text-sm placeholder:text-muted focus:border-accent focus:outline-none shadow-card"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted hover:text-ink"
          >
            지우기
          </button>
        )}
      </div>

      {/* 정렬 및 검색 안내 바 */}
      <div className="mt-3 flex items-center justify-between px-1">
        <span className="text-xs text-muted">
          {search.trim() ? (
            <>‘{search.trim()}’ 검색 결과 <strong className="text-ink tabular-nums">{sortedList.length}개</strong></>
          ) : (
            <>총 <strong className="text-ink tabular-nums">{sortedList.length}개</strong> 지원 제도</>
          )}
        </span>
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setSortBy("deadline")}
            className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
              sortBy === "deadline"
                ? "bg-foreground font-semibold text-white"
                : "border border-line bg-card text-muted hover:text-ink"
            }`}
          >
            마감 임박순
          </button>
          <button
            type="button"
            onClick={() => setSortBy("verdict")}
            className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
              sortBy === "verdict"
                ? "bg-foreground font-semibold text-white"
                : "border border-line bg-card text-muted hover:text-ink"
            }`}
          >
            가능성순
          </button>
        </div>
      </div>

      {/* 검색 결과가 없을 때 */}
      {sortedList.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl bg-card p-6 text-center shadow-card">
          <Mascot size={48} mood="rest" />
          <p className="mt-3 font-semibold text-ink">일치하는 지원 제도가 없어요</p>
          <p className="mt-1 text-xs text-muted">
            {search ? `‘${search}’ 키워드 대신 다른 단어로 검색하거나 상단의 AI 맞춤 탐색을 이용해 보세요.` : "조건에 맞는 제도가 없어요."}
          </p>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="mt-3 rounded-full bg-accent-soft px-4 py-1.5 text-xs font-semibold text-accent"
            >
              검색어 지우기
            </button>
          )}
        </div>
      ) : filter === "no" ? (
        <ul className="mt-4 divide-y divide-line rounded-xl bg-card shadow-card">
          {sortedList.map(noRow)}
        </ul>
      ) : sortBy === "deadline" ? (
        /* 마감 임박순: 기한이 급한 지원부터 최우선 노출 */
        <>
          <ul className="mt-4 space-y-3">
            {filter === "" && !search.trim()
              ? sortedList.filter((r) => r.verdict !== "no").map(card)
              : sortedList.map(card)}
          </ul>
          {filter === "" && !search.trim() && noCount > 0 && (
            <details className="mt-6 rounded-xl bg-card shadow-card">
              <summary className="cursor-pointer p-4 font-semibold text-sm text-muted">해당 없음 ({noCount})</summary>
              <ul className="divide-y divide-line border-t border-line">
                {results.filter((r) => r.verdict === "no").map(noRow)}
              </ul>
            </details>
          )}
        </>
      ) : filter === "high" || filter === "check" || search.trim() ? (
        /* 가능성순 단일 탭 / 검색 플랫 리스트 */
        <ul className="mt-4 space-y-3">
          {sortedList.map(card)}
        </ul>
      ) : (
        /* 전체 탭 & 가능성순: 섹션별 묶음 표시 */
        <>
          <section className="mt-5">
            <h2 className="mb-2 font-semibold text-sm text-accent">대상 가능성 높음 ({highCount})</h2>
            <ul className="space-y-3">
              {sortedList.filter((r) => r.verdict === "high").length ? (
                sortedList.filter((r) => r.verdict === "high").map(card)
              ) : (
                <li className="rounded-xl bg-card p-4 text-sm text-muted shadow-card">아직 없어요</li>
              )}
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="mb-2 font-semibold text-sm text-warn">확인 필요 ({checkCount})</h2>
            <ul className="space-y-3">
              {sortedList.filter((r) => r.verdict === "check").length ? (
                sortedList.filter((r) => r.verdict === "check").map(card)
              ) : (
                <li className="rounded-xl bg-card p-4 text-sm text-muted shadow-card">없어요</li>
              )}
            </ul>
          </section>

          {noCount > 0 && (
            <details className="mt-6 rounded-xl bg-card shadow-card">
              <summary className="cursor-pointer p-4 font-semibold text-sm text-muted">해당 없음 ({noCount})</summary>
              <ul className="divide-y divide-line border-t border-line">
                {results.filter((r) => r.verdict === "no").map(noRow)}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
