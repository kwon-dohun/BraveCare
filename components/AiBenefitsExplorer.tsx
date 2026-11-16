"use client";
import { useState } from "react";
import { exploreExtraBenefits, type ExtraBenefitSuggestion } from "@/app/scan-actions";
import type { Auth } from "@/lib/db";
import Mascot from "@/components/Mascot";
import Icon from "@/components/Icon";

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
  const [items, setItems] = useState<ExtraBenefitSuggestion[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handleExplore = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await exploreExtraBenefits(auth);
      setItems(res);
      setOpen(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "추천 지원을 불러오지 못했어요");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-[#b2e2d0] bg-[#f0faf5] p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Mascot size={42} mood={items ? "cheer" : "idle"} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-[#2fb383] px-2 py-0.5 text-caption font-bold text-white">AI 맞춤 탐색</span>
            <p className="font-semibold text-ink">지자체 조례 및 민간 재단 추가 지원</p>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            기본 25개 공공 제도 외에, {region ? <b>{region}</b> : "거주 지역"} 특화 복지 및 공익재단(아산·삼성·혈액암협회 등)의 숨은 지원금을 AI가 찾아드려요.
          </p>

          {!open && (
            <button
              type="button"
              disabled={loading}
              onClick={handleExplore}
              className="mt-3 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-ink shadow-sm hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "지역 및 재단 지원 사업을 찾는 중…" : "추가 지원 사업 찾아보기"}
            </button>
          )}
        </div>
      </div>

      {err && <p className="mt-3 rounded-lg bg-warn-soft p-2.5 text-xs text-warn">{err}</p>}

      {open && items && (
        <div className="mt-4 space-y-3 border-t border-[#c6ecd9] pt-3">
          <p className="text-xs font-semibold text-accent">
            {region ? `${region} · ` : ""}{reasonLabel} 맞춤 추가 지원 {items.length}선
          </p>

          {items.length === 0 ? (
            <p className="text-xs text-muted">현재 조건에 맞는 추가 민간 지원을 찾지 못했어요. 관할 주민센터 복지과나 병원 사회사업팀에 직접 문의해 보세요.</p>
          ) : (
            items.map((it, idx) => (
              <div key={idx} className="rounded-xl bg-card p-3.5 shadow-card border border-line">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm text-ink">{it.name}</h3>
                  <span className="shrink-0 rounded-md bg-accent-soft px-2 py-0.5 text-caption font-semibold text-accent">{it.agency}</span>
                </div>
                <div className="mt-2 space-y-1 text-xs text-muted">
                  <p><b className="text-ink">대상:</b> {it.target}</p>
                  <p><b className="text-ink">내용:</b> {it.content}</p>
                  <p><b className="text-ink">신청처:</b> {it.howToApply}</p>
                  {it.tip && <p className="text-accent"><b className="text-accent">참고:</b> {it.tip}</p>}
                </div>
              </div>
            ))
          )}

          <div className="rounded-lg bg-card/60 p-2.5 text-caption text-muted leading-relaxed">
            지자체 조례 및 민간 재단 지원금은 연간 예산 소진 여부와 모집 시기에 따라 유동적일 수 있습니다. 신청 전 해당 기관이나 병원 사회사업팀에 반드시 유선 확인해 주세요.
          </div>
        </div>
      )}
    </div>
  );
}
