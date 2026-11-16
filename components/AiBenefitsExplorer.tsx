"use client";
import { useState, useEffect } from "react";
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

const CATEGORY_STYLE: Record<AiBenefitItem["category"], { label: string; badge: string }> = {
  지자체_조례: { label: "지자체 조례", badge: "bg-[#f3e8ff] text-[#7e22ce] border border-[#d8b4fe]" },
  민간_공익재단: { label: "민간 공익재단", badge: "bg-[#ffedd5] text-[#c2410c] border border-[#fed7aa]" },
  특수_바우처: { label: "특수 바우처", badge: "bg-[#dbeafe] text-[#1d4ed8] border border-[#bfdbfe]" },
};

export default function AiBenefitsExplorer({
  auth,
  region,
  reasonLabel,
}: {
  auth: Auth;
  region: string | null;
  reasonLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState<string>("");
  const [items, setItems] = useState<AiBenefitItem[] | null>(null);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);

  // 단계별 로딩 문구 전환 (0~2초, 2~5초, 5초+)
  useEffect(() => {
    let t1: NodeJS.Timeout, t2: NodeJS.Timeout;
    if (loading) {
      setLoadingStep(0);
      t1 = setTimeout(() => setLoadingStep(1), 2000);
      t2 = setTimeout(() => setLoadingStep(2), 5000);
    }
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [loading]);

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
      setItems(res);
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

  const loadingText =
    loadingStep === 0
      ? customKeyword.trim()
        ? `‘${customKeyword.trim()}’ 관련 특화 지원 사업을 살펴보고 있어요`
        : `${region || "우리 동네"} 특화 복지 조례를 살펴보고 있어요`
      : loadingStep === 1
      ? "공익재단과 민간 의료비 지원 사업을 대조하고 있어요"
      : "거의 다 찾았어요. 신청 조건을 정리하고 있어요";

  return (
    <div className="mt-4 rounded-2xl border border-[#b2e2d0] bg-[#f0faf5] p-4 shadow-sm transition-all">
      {/* 배너 헤더 */}
      <div className="flex items-start gap-3">
        <Mascot size={44} mood={items ? "cheer" : "idle"} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="rounded-full bg-[#2fb383] px-2 py-0.5 text-caption font-bold text-white">AI 맞춤 탐색</span>
            <p className="font-semibold text-ink">지자체 조례 및 민간 재단 추가 지원</p>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            기본 26개 공공 제도 외에, {region ? <b>{region}</b> : "거주 지역"} 특화 복지 및 공익재단(아산·삼성·혈액암협회 등)의 숨은 지원금을 AI가 찾아드려요.
          </p>

          {!open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-3 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-ink shadow-sm hover:opacity-90"
            >
              추가 지원 사업 찾아보기
            </button>
          )}
        </div>
      </div>

      {/* 인라인 확장 패널 */}
      {open && (
        <div className="mt-4 border-t border-[#c6ecd9] pt-4">
          {/* 1단계: 조건 확인 및 추가 상황 선택 */}
          {!items && !loading && (
            <div>
              <div className="flex items-center gap-1 text-xs text-muted mb-2">
                <span>자동 반영 조건:</span>
                <span className="rounded-md bg-white px-2 py-0.5 font-semibold text-ink border border-line">
                  {region || "전국"}
                </span>
                <span className="rounded-md bg-white px-2 py-0.5 font-semibold text-ink border border-line">
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
                          : "bg-white text-muted border border-line hover:border-ink/30"
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
                    className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs placeholder:text-muted focus:border-accent focus:outline-none shadow-xs"
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
                  className="flex-1 flex items-center justify-center rounded-xl bg-primary py-2.5 text-xs font-semibold text-ink shadow-sm hover:opacity-95"
                >
                  우리 조건으로 추가 지원 찾기
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-line bg-white px-3 py-2.5 text-xs text-muted"
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
              <p className="mt-3 text-sm font-semibold text-ink animate-pulse">{loadingText}</p>
              <p className="mt-1 text-caption text-muted">기존 26개 제도와 중복되지 않는 실제 사업만 선별하고 있어요</p>
            </div>
          )}

          {/* 에러 발생 안내 */}
          {err && (
            <div className="mt-2 rounded-xl bg-warn-soft p-3 text-xs text-warn">
              <p className="font-semibold">{err}</p>
              <button
                type="button"
                onClick={handleSearch}
                className="mt-2 inline-block rounded-md bg-white px-2.5 py-1 text-caption font-semibold text-warn border border-warn/30"
              >
                다시 시도하기
              </button>
            </div>
          )}

          {/* 3단계: 탐색 결과 리스트 */}
          {items && !loading && (
            <div className="space-y-3">
              {/* 상단 신뢰 안내 배너 */}
              <div className="rounded-xl bg-[#fff8eb] p-3 text-xs text-[#8a5300] border border-[#f5dfb8]">
                <p className="font-semibold">💡 AI가 탐색한 추가 참고 정보예요</p>
                <p className="mt-0.5 opacity-90 leading-relaxed">
                  지자체 조례 및 민간 재단 지원은 예산 소진 여부와 세부 심사에 따라 변동될 수 있습니다. 신청 전 해당 기관에 꼭 문의하세요.
                </p>
              </div>

              {items.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted">
                  입력하신 조건에 딱 맞는 추가 민간·조례 지원을 찾지 못했어요. 기본 26가지 공공 지원을 먼저 확인해 보세요.
                </p>
              ) : (
                items.map((it) => {
                  const cat = CATEGORY_STYLE[it.category] || CATEGORY_STYLE.민간_공익재단;
                  const isSaved = savedIds[it.id];
                  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(it.searchQuery)}`;

                  return (
                    <div key={it.id} className="rounded-xl bg-card p-4 shadow-card border border-line">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-caption font-semibold ${cat.badge}`}>
                            {cat.label}
                          </span>
                          <h3 className="mt-1.5 text-sm font-semibold text-ink leading-snug">
                            {it.organization} · {it.title}
                          </h3>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-muted leading-relaxed">{it.summary}</p>

                      {/* 판정 근거 박스 */}
                      <div className="mt-2.5 rounded-lg bg-background px-3 py-2 text-xs text-muted">
                        <span className="font-semibold text-ink">판정 근거 ·</span> {it.matchReason}
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
                          공식 안내 검색하기 <Icon name="right" size={12} />
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
                          {isSaved ? "할 일에 담김 ✓" : "내 지원 목록에 담기"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}

              {/* 병원 사회사업실 연계 가이드 */}
              <div className="rounded-xl bg-card/80 p-3 text-caption text-muted border border-line leading-relaxed">
                <p className="font-semibold text-ink">💡 퇴원 전 병원 원무과·사회사업실에 이 화면을 보여주며 상담해 보세요</p>
                <p className="mt-0.5">
                  민간 공익재단 의료비 지원은 개인이 직접 신청하는 것보다 병원 의료사회복지사의 추천서가 있을 때 선정 확률이 가장 높습니다.
                </p>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setItems(null)}
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
