"use client";
import { useState } from "react";
import Link from "next/link";
import { searchAdditionalBenefitsAction, saveAiBenefitAction } from "@/app/scan-actions";
import type { AiBenefitItem } from "@/lib/ai-benefits";
import type { Auth } from "@/lib/db";
import Mascot from "@/components/Mascot";
import Icon from "@/components/Icon";

const EXTRA_TAGS = [
  "기초생활·차상위",
  "장애인 등록",
  "국가유공자",
  "한부모·다자녀",
  "직장인·소상공인",
  "특정 희귀·난치질환",
];

const CATEGORY_STYLE: Record<AiBenefitItem["category"], string> = {
  "상담 창구": "bg-accent-soft text-accent",
  공익재단: "bg-[#ffe9dc] text-[#9a3f12]",
  "공적 제도": "bg-[#e3f0ff] text-[#1f5aa6]",
};

export default function AiBenefitsExplorer({
  auth,
  region,
  reasonLabel,
  base,
}: {
  auth: Auth;
  base: string;
  region: string | null;
  reasonLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState<string>("");
  const [result, setResult] = useState<{ items: AiBenefitItem[]; basics: { id: string; name: string }[]; keywordHit: boolean; keyword: string } | null>(null);
  const items = result?.items ?? null;
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSearch = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await searchAdditionalBenefitsAction(auth, selectedTags, customKeyword);
      setResult({ ...res, keyword: customKeyword.trim() });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "추가 지원 사업을 불러오지 못했어요");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (it: AiBenefitItem) => {
    try {
      await saveAiBenefitAction(auth, it);
      setSavedIds((prev) => ({ ...prev, [it.id]: true }));
    } catch {
      alert("할 일에 담지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <div className="mt-4 rounded-2xl bg-card p-4 shadow-card">
      {/* 배너 헤더 */}
      <div className="flex items-start gap-3">
        <Mascot size={44} mood={items ? "cheer" : "idle"} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-ink">기본 지원 밖에서 더 알아볼 곳</p>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            기본 26개 제도 밖에서 우리 조건으로 더 물어볼 수 있는 기관과 제도를 알려드려요. {region ? <b>{region}</b> : "지역"} 자체 사업은 지역마다 달라서 확인하는 방법을 안내해요.
          </p>

          {!open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-3 flex items-center gap-1.5 rounded-full bg-accent-soft px-4 py-2 text-xs font-semibold text-accent hover:opacity-90"
            >
              더 알아볼 곳 보기
            </button>
          )}
        </div>
      </div>

      {/* 인라인 확장 패널 */}
      {open && (
        <div className="mt-4 border-t border-line pt-4">
          {/* 1단계: 조건 확인 및 추가 상황 선택 */}
          {!items && !loading && (
            <div>
              <div className="flex items-center gap-1 text-xs text-muted mb-2">
                <span>자동 반영 조건:</span>
                <span className="rounded-md bg-background px-2 py-0.5 font-semibold text-ink">
                  {region || "전국"}
                </span>
                <span className="rounded-md bg-background px-2 py-0.5 font-semibold text-ink">
                  {reasonLabel}
                </span>
              </div>

              <p className="text-xs font-semibold text-ink mt-3 mb-1.5">
                해당되는 특수 상황이 있다면 골라주세요 (선택):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {EXTRA_TAGS.map((tag) => {
                  const on = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      aria-pressed={on}
                      className={`rounded-full px-3 py-1 text-xs transition-colors ${
                        on
                          ? "bg-accent-soft font-semibold text-accent ring-1.5 ring-accent"
                          : "bg-card text-muted border border-line hover:border-ink/30"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>

              {/* 원하는 키워드 직접 입력창 */}
              <div className="mt-3.5">
                <label htmlFor="custom-kw" className="block text-xs font-semibold text-ink mb-1.5">
                  특별히 찾고 싶은 키워드가 있나요? (선택)
                </label>
                <div className="relative">
                  <input
                    id="custom-kw"
                    type="text"
                    value={customKeyword}
                    onChange={(e) => setCustomKeyword(e.target.value)}
                    placeholder="예: 휠체어 대여, 간병인 비용, 인공관절, 보청기 등"
                    className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-xs placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                  {customKeyword && (
                    <button
                      type="button"
                      onClick={() => setCustomKeyword("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted hover:text-ink"
                    >
                      지우기
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleSearch}
                  className="flex-1 flex items-center justify-center rounded-xl bg-primary py-2.5 text-xs font-semibold text-ink hover:opacity-95"
                >
                  우리 조건으로 찾기
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-line bg-card px-3 py-2.5 text-xs text-muted"
                >
                  닫기
                </button>
              </div>
            </div>
          )}

          {/* 2단계: 단계별 감성 로딩 화면 */}
          {loading && (
            <div className="py-6 flex flex-col items-center justify-center text-center">
              <span className="mascot-bob">
                <Mascot size={52} mood="cheer" />
              </span>
              <p className="mt-3 text-sm font-semibold text-ink animate-pulse">조건에 맞는 곳을 고르고 있어요</p>
            </div>
          )}

          {/* 에러 발생 안내 */}
          {err && (
            <div className="mt-2 rounded-xl bg-warn-soft p-3 text-xs text-warn">
              <p className="font-semibold">{err}</p>
              <button
                type="button"
                onClick={handleSearch}
                className="mt-2 inline-block rounded-md bg-card px-2.5 py-1 text-caption font-semibold text-warn border border-warn/30"
              >
                다시 시도하기
              </button>
            </div>
          )}

          {/* 3단계: 탐색 결과 리스트 */}
          {items && !loading && (
            <div className="space-y-3">
              {/* 상단 신뢰 안내 배너 */}
              <div className="rounded-xl bg-warn-soft p-3 text-xs text-warn">
                <p className="font-semibold">실제로 있는 기관·제도만 보여드려요</p>
                <p className="mt-0.5 opacity-90 leading-relaxed">
                  대상이 되는지, 얼마를 받는지는 각 기관의 심사로 정해져요. 내용이 해마다 바뀔 수 있으니 신청 전에 꼭 문의하세요.
                </p>
              </div>

              {result && result.basics.length > 0 && (
                <div className="rounded-xl bg-background p-3 text-xs">
                  <p className="font-semibold text-ink">‘{result.keyword}’ 관련 지원은 기본 목록에 이미 있어요</p>
                  <ul className="mt-1.5 space-y-1">
                    {result.basics.map((b) => (
                      <li key={b.id}>
                        <Link href={`${base}/benefits/${b.id}`} className="font-medium text-accent underline underline-offset-2">{b.name}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result && result.keyword && result.basics.length === 0 && !result.keywordHit && (
                <p className="rounded-xl bg-background p-3 text-xs leading-relaxed text-muted">
                  ‘{result.keyword}’에 맞는 확인된 기관·제도는 목록에 없어요. 아래 주민센터·129 상담으로 우리 지역에 있는지 물어보세요.
                </p>
              )}
              {items.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted">
                  조건에 맞는 곳을 찾지 못했어요. 기본 26가지 공공 지원을 먼저 확인해 보세요.
                </p>
              ) : (
                items.map((it) => {
                  const badge = CATEGORY_STYLE[it.category];
                  const isSaved = savedIds[it.id];
                  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(it.searchQuery)}`;

                  return (
                    <div key={it.id} className="rounded-xl bg-background p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-caption font-semibold ${badge}`}>
                            {it.category}
                          </span>
                          <h3 className="mt-1.5 text-sm font-semibold text-ink leading-snug">
                            {it.organization} · {it.title}
                          </h3>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-muted leading-relaxed">{it.summary}</p>

                      {/* 판정 근거 박스 */}
                      <div className="mt-2.5 rounded-lg bg-background px-3 py-2 text-xs text-muted">
                        <span className="font-semibold text-ink">보여드리는 이유 ·</span> {it.matchReason}
                      </div>

                      <p className="mt-2 text-caption text-muted">
                        <strong className="text-ink">확인처 ·</strong> {it.howToCheck}
                      </p>

                      {/* 하단 액션 버튼 */}
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5">
                        <a
                          href={searchUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-accent underline underline-offset-2 hover:opacity-80"
                        >
                          검색해서 확인하기 <Icon name="right" size={12} />
                        </a>

                        <button
                          type="button"
                          disabled={isSaved}
                          onClick={() => handleSave(it)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                            isSaved
                              ? "bg-line text-muted"
                              : "bg-accent-soft text-accent hover:opacity-90"
                          }`}
                        >
                          {isSaved ? "할 일에 담김 ✓" : "할 일에 담기"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}

              {/* 병원 사회사업실 연계 가이드 */}
              <div className="rounded-xl bg-background p-3 text-caption leading-relaxed text-muted">
                <p className="font-semibold text-ink">퇴원 전에 병원 의료사회복지팀에 이 화면을 보여주며 상담해 보세요</p>
                <p className="mt-0.5">
                  민간 재단의 의료비 지원은 병원 의료사회복지팀을 거쳐 신청하는 경우가 많아요.
                </p>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="text-xs text-muted underline hover:text-ink"
                >
                  조건 다시 변경해서 찾기
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
