"use client";
import { useState, useMemo } from "react";
import { deadlineScore, type Result } from "@/lib/benefits";
import type { Auth } from "@/lib/db";
import BenefitCard from "./BenefitCard";
import Icon from "./Icon";
import Mascot from "./Mascot";

const FILTERS = [
  { key: "", label: "전체" },
  { key: "high", label: "가능성 높음" },
  { key: "check", label: "확인 필요" },
] as const;

export default function BenefitsFilterView({
  results,
  status,
  base,
  auth,
  saved,
  initialFilter = "",
}: {
  results: Result[]; // '해당 없음'은 빼고 받는다(지역이 다른 제도 등이 내 목록에 보이면 오해를 산다)
  status: Record<string, string>;
  base: string;
  auth: Auth;
  saved: string[];
  initialFilter?: string;
}) {
  const [filter, setFilter] = useState<string>(initialFilter);
  const [search, setSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<"deadline" | "verdict">("deadline");

  const sort = filter ? "deadline" : sortBy; // 가능성 높음·확인 필요 탭 안에서는 가능성순이 의미 없다
  const highCount = results.filter((r) => r.verdict === "high").length;
  const checkCount = results.filter((r) => r.verdict === "check").length;

  const countMap: Record<string, number> = {
    "": results.length,
    high: highCount,
    check: checkCount,
  };

  // 1차: 탭 필터링
  const tabFiltered = useMemo(() => {
    if (filter === "high") return results.filter((r) => r.verdict === "high");
    if (filter === "check") return results.filter((r) => r.verdict === "check");
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
  const sortedList = useMemo(
    () => sort === "verdict" ? searchFiltered : [...searchFiltered].sort((a, b) => deadlineScore(a) - deadlineScore(b)),
    [searchFiltered, sort],
  );

  const card = (r: Result) => (
    <li key={r.benefit.id}>
      <BenefitCard r={r} href={`${base}/benefits/${r.benefit.id}`} status={status[r.benefit.id]} auth={auth} saved={saved.includes(`b:${r.benefit.id}`)} />
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
        {!filter && <div className="flex items-center gap-1 text-xs">
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
        </div>}
      </div>

      {/* 필터·정렬을 바꾸면 목록이 살짝 떠오르며 바뀐다 (검색은 글자마다 흔들리지 않게 제외) */}
      <div key={filter + sort} className="view-in">
      {/* 검색 결과가 없을 때 */}
      {sortedList.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl bg-card p-6 text-center shadow-card">
          <Mascot size={48} mood="rest" />
          <p className="mt-3 font-semibold text-ink">{search ? "검색한 지원을 찾지 못했어요" : results.length ? "이 분류에는 지원이 없어요" : "지금은 보여 드릴 지원이 없어요"}</p>
          <p className="mt-1 text-xs text-muted">
            {search ? `‘${search}’ 대신 다른 단어로 찾아보거나 위의 '더 알아볼 곳'을 확인해 보세요.`
              : results.length ? "'전체'를 누르면 확인해 볼 지원을 모두 볼 수 있어요."
              : "병원 의료사회복지팀이나 주민센터에 퇴원 후 받을 수 있는 지원을 물어보세요. 위 '더 알아볼 곳'에 물어볼 곳을 정리해 두었어요."}
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
      ) : sort === "deadline" ? (
        /* 마감 임박순: 기한이 급한 지원부터 최우선 노출 */
        <>
          <ul className="mt-4 space-y-3">{sortedList.map(card)}</ul>
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

        </>
      )}
      </div>
    </div>
  );
}
