"use client";
import { useState, useTransition, useEffect } from "react";
import Mascot from "@/components/Mascot";
import { submitPatientDailyCheck, type PatientDailyInput } from "@/app/patient-actions";
import type { Daily } from "@/lib/report";

export default function PatientCheckFlow({
  patientToken,
  todayStr,
  initialDaily,
}: {
  patientToken: string;
  todayStr: string;
  initialDaily: Daily | null;
}) {
  const [morning, setMorning] = useState(initialDaily?.med_morning ?? true);
  const [lunch, setLunch] = useState(initialDaily?.med_lunch ?? true);
  const [dinner, setDinner] = useState(initialDaily?.med_dinner ?? true);

  const [hasFeverOrWound, setHasFeverOrWound] = useState(
    initialDaily ? initialDaily.temp !== "normal" || initialDaily.wound_issue : false,
  );
  const [temp, setTemp] = useState<"normal" | "mild" | "high">(initialDaily?.temp ?? "normal");
  const [woundIssue, setWoundIssue] = useState(initialDaily?.wound_issue ?? false);

  const [painLevel, setPainLevel] = useState<number>(initialDaily ? initialDaily.pain : 1);
  const [bowel, setBowel] = useState<"good" | "constipation" | "diarrhea">(initialDaily?.bowel ?? "good");
  const [note, setNote] = useState(initialDaily?.notes ?? "");

  const [submitted, setSubmitted] = useState(!!initialDaily);
  const [err, setErr] = useState("");
  const [isPending, startTransition] = useTransition();

  const [isKakao, setIsKakao] = useState(false);
  const [showNoticeGuide, setShowNoticeGuide] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent.toLowerCase();
      setIsKakao(ua.includes("kakaotalk"));
    }
  }, []);

  const handleAllMeds = () => {
    setMorning(true);
    setLunch(true);
    setDinner(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const payload: PatientDailyInput = {
      med_morning: morning,
      med_lunch: lunch,
      med_dinner: dinner,
      temp: hasFeverOrWound ? temp : "normal",
      wound_issue: hasFeverOrWound ? woundIssue : false,
      pain: painLevel,
      bowel,
      notes: note,
    };

    startTransition(async () => {
      try {
        await submitPatientDailyCheck(patientToken, payload);
        setSubmitted(true);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "전송하지 못했어요. 다시 눌러주세요");
      }
    });
  };

  const btnBase = "min-h-[58px] flex-1 rounded-2xl border-2 px-3 py-3 text-center font-bold transition-all text-base";
  const btnActive = "border-primary bg-primary/20 text-ink shadow-sm";
  const btnInactive = "border-line bg-card text-muted hover:border-line/80";

  return (
    <div className="mx-auto max-w-lg px-4 py-6 font-sans">
      {/* 상단 씩씩이 마스코트 & 환영 인사 */}
      <header className="mb-6 text-center">
        <div className="flex justify-center">
          <Mascot size={64} mood={submitted ? "cheer" : "idle"} className="mascot-bob" />
        </div>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-ink">
          오늘 하루 컨디션은 어떠셨어요?
        </h1>
        <p className="mt-1 text-base font-medium text-muted">
          {todayStr} · 버튼을 누르고 안부를 보내주세요
        </p>
      </header>

      {/* 카카오톡 인앱 브라우저 안내 배너 */}
      {isKakao && (
        <aside className="mb-6 rounded-2xl bg-[#fff9df] p-4 text-xs text-[#735200] border border-[#f5e6a3]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-sm">💡 매일 편하게 안부 남기는 방법</p>
              <p className="mt-1 leading-relaxed">
                카카오톡 채팅방 상단에 이 주소를 <strong>[공지]</strong>로 올려두시면 매일 잊지 않고 1초 만에 여실 수 있어요!
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNoticeGuide(!showNoticeGuide)}
              className="shrink-0 rounded-lg bg-card px-2.5 py-1.5 font-bold shadow-sm"
            >
              {showNoticeGuide ? "닫기" : "공지 등록법"}
            </button>
          </div>
          {showNoticeGuide && (
            <div className="mt-3 border-t border-[#ecd98e] pt-2 text-[11px] leading-relaxed space-y-1">
              <p>1. 가족과의 카톡 채팅방에서 이 링크 메시지를 <strong>길게 누릅니다</strong>.</p>
              <p>2. 메뉴에서 <strong>&lsquo;공지&rsquo;</strong>를 선택하면 채팅방 맨 위에 항상 고정됩니다.</p>
            </div>
          )}
        </aside>
      )}

      {submitted ? (
        <section className="rounded-3xl border border-primary/40 bg-accent-soft p-6 text-center shadow-card">
          <span className="inline-block rounded-full bg-card px-3 py-1 text-sm font-bold text-accent shadow-sm">
            오늘 안부 전송 완료!
          </span>
          <h2 className="mt-3 text-xl font-black text-ink">
            가족에게 안부를 잘 전해드렸어요 🌿
          </h2>
          <p className="mt-2 text-base leading-relaxed text-ink/80">
            가족들이 확인하고 안심하고 있어요.<br />
            오늘 밤도 따뜻하고 편안하게 쉬세요!
          </p>

          <div className="mt-6 rounded-2xl bg-card p-4 text-left text-sm space-y-2 border border-line shadow-sm">
            <p className="font-bold text-ink border-b border-line pb-2">📋 오늘 기록한 안부 요약</p>
            <div className="flex justify-between text-muted">
              <span>처방약</span>
              <span className="font-semibold text-ink">
                {[morning && "아침", lunch && "점심", dinner && "저녁"].filter(Boolean).join(" · ") || "복용 안 함"}
              </span>
            </div>
            <div className="flex justify-between text-muted">
              <span>열·상처</span>
              <span className="font-semibold text-ink">
                {!hasFeverOrWound ? "이상 없음 (정상)" : temp !== "normal" ? "열감 있음" : "상처 불편"}
              </span>
            </div>
            <div className="flex justify-between text-muted">
              <span>통증 수준</span>
              <span className="font-semibold text-ink">
                {painLevel <= 2 ? "거의 안 아픔" : painLevel <= 5 ? "조금 아픔" : "많이 아픔"}
              </span>
            </div>
            <div className="flex justify-between text-muted">
              <span>배변 활동</span>
              <span className="font-semibold text-ink">
                {bowel === "good" ? "편안함" : bowel === "constipation" ? "변비·답답함" : "설사"}
              </span>
            </div>
            {note && (
              <p className="mt-2 text-xs text-ink/80 bg-background p-2 rounded-lg">
                메모: {note}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-6 w-full rounded-2xl border border-line bg-card py-3.5 text-base font-bold text-muted hover:text-ink shadow-sm"
          >
            기록 내용 수정하기
          </button>
        </section>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {err && (
            <div role="alert" className="rounded-2xl bg-warn-soft p-4 text-sm font-bold text-warn">
              {err}
            </div>
          )}

          {/* 1. 복약 체크 */}
          <div className="rounded-3xl bg-card p-5 shadow-card border border-line">
            <div className="flex items-center justify-between mb-3">
              <label className="text-lg font-black text-ink">
                1. 오늘 약 챙겨 드셨나요?
              </label>
              <button
                type="button"
                onClick={handleAllMeds}
                className="text-xs font-bold text-accent underline underline-offset-2"
              >
                다 먹었어요
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMorning(!morning)}
                className={`${btnBase} ${morning ? btnActive : btnInactive}`}
              >
                {morning ? "✓ " : ""}아침
              </button>
              <button
                type="button"
                onClick={() => setLunch(!lunch)}
                className={`${btnBase} ${lunch ? btnActive : btnInactive}`}
              >
                {lunch ? "✓ " : ""}점심
              </button>
              <button
                type="button"
                onClick={() => setDinner(!dinner)}
                className={`${btnBase} ${dinner ? btnActive : btnInactive}`}
              >
                {dinner ? "✓ " : ""}저녁
              </button>
            </div>
          </div>

          {/* 2. 열 및 수술 부위 이상 */}
          <div className="rounded-3xl bg-card p-5 shadow-card border border-line">
            <label className="block text-lg font-black text-ink mb-3">
              2. 열이나 수술 부위는 어떠세요?
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  setHasFeverOrWound(false);
                  setTemp("normal");
                  setWoundIssue(false);
                }}
                className={`${btnBase} ${!hasFeverOrWound ? btnActive : btnInactive}`}
              >
                {!hasFeverOrWound ? "✓ " : ""}괜찮아요 (열 없음)
              </button>
              <button
                type="button"
                onClick={() => setHasFeverOrWound(true)}
                className={`${btnBase} ${hasFeverOrWound ? "border-warn bg-warn-soft text-warn" : btnInactive}`}
              >
                {hasFeverOrWound ? "✓ " : ""}열이나 상처 이상 있어요
              </button>
            </div>
            {hasFeverOrWound && (
              <div className="mt-3 rounded-2xl bg-background p-3.5 space-y-3 border border-line">
                <p className="text-xs font-bold text-warn">자세한 이상 증상을 선택해 주세요</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTemp("mild")}
                    className={`flex-1 rounded-xl py-2.5 text-xs font-bold border ${temp === "mild" ? "border-warn bg-card text-warn" : "border-line bg-card text-muted"}`}
                  >
                    미열 (37.5도 이상)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemp("high")}
                    className={`flex-1 rounded-xl py-2.5 text-xs font-bold border ${temp === "high" ? "border-warn bg-card text-warn" : "border-line bg-card text-muted"}`}
                  >
                    고열 (38도 이상)
                  </button>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={woundIssue}
                    onChange={(e) => setWoundIssue(e.target.checked)}
                    className="h-4 w-4 rounded accent-warn"
                  />
                  <span>수술 부위가 붓거나 진물·통증이 있어요</span>
                </label>
              </div>
            )}
          </div>

          {/* 3. 통증 수준 */}
          <div className="rounded-3xl bg-card p-5 shadow-card border border-line">
            <label className="block text-lg font-black text-ink mb-3">
              3. 지금 통증은 어느 정도인가요?
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setPainLevel(1)}
                className={`${btnBase} ${painLevel <= 2 ? btnActive : btnInactive}`}
              >
                {painLevel <= 2 ? "✓ " : ""}거의 안 아파요
                <span className="block text-xs font-normal opacity-80 mt-0.5">편안함</span>
              </button>
              <button
                type="button"
                onClick={() => setPainLevel(4)}
                className={`${btnBase} ${painLevel > 2 && painLevel <= 6 ? "border-[#e6a817] bg-[#fff8e6] text-[#8a5b00]" : btnInactive}`}
              >
                {painLevel > 2 && painLevel <= 6 ? "✓ " : ""}조금 아파요
                <span className="block text-xs font-normal opacity-80 mt-0.5">참을 만함</span>
              </button>
              <button
                type="button"
                onClick={() => setPainLevel(8)}
                className={`${btnBase} ${painLevel > 6 ? "border-warn bg-warn-soft text-warn" : btnInactive}`}
              >
                {painLevel > 6 ? "✓ " : ""}많이 아파요
                <span className="block text-xs font-normal opacity-80 mt-0.5">진통제 필요</span>
              </button>
            </div>
          </div>

          {/* 4. 배변 활동 */}
          <div className="rounded-3xl bg-card p-5 shadow-card border border-line">
            <label className="block text-lg font-black text-ink mb-3">
              4. 오늘 화장실은 편하셨나요?
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setBowel("good")}
                className={`${btnBase} ${bowel === "good" ? btnActive : btnInactive}`}
              >
                {bowel === "good" ? "✓ " : ""}편하게 갔어요
              </button>
              <button
                type="button"
                onClick={() => setBowel("constipation")}
                className={`${btnBase} ${bowel === "constipation" ? "border-[#e6a817] bg-[#fff8e6] text-[#8a5b00]" : btnInactive}`}
              >
                {bowel === "constipation" ? "✓ " : ""}변비·답답해요
              </button>
              <button
                type="button"
                onClick={() => setBowel("diarrhea")}
                className={`${btnBase} ${bowel === "diarrhea" ? "border-warn bg-warn-soft text-warn" : btnInactive}`}
              >
                {bowel === "diarrhea" ? "✓ " : ""}설사해요
              </button>
            </div>
          </div>

          {/* 한 줄 메모 (선택) */}
          <div className="rounded-3xl bg-card p-5 shadow-card border border-line">
            <label htmlFor="pmemo" className="block text-base font-bold text-ink mb-2">
              가족에게 남길 말씀 (선택)
            </label>
            <input
              id="pmemo"
              type="text"
              maxLength={100}
              placeholder="예: 오늘은 낮에 죽 한 그릇 다 먹었단다"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-line bg-background px-4 py-3 text-base text-ink outline-none focus:border-accent"
            />
          </div>

          {/* 안부 전송 CTA 버튼 */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full min-h-[64px] rounded-2xl bg-primary px-6 py-4 text-xl font-black text-ink shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? "가족에게 안부 보내는 중…" : "🌿 가족에게 오늘 안부 보내기"}
          </button>
        </form>
      )}

      {/* 하단 119 긴급 전화 버튼 */}
      <footer className="mt-10 border-t border-line pt-6 text-center">
        <a
          href="tel:119"
          className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-[#fee2e2] px-5 py-3 text-sm font-bold text-[#b91c1c] shadow-sm hover:bg-[#fecaca] transition-colors"
        >
          🚨 갑자기 숨이 차거나 너무 아프신가요? 119 누르기
        </a>
        <p className="mt-3 text-xs text-muted">
          씩씩케어는 의료 지시나 진단을 대신하지 않으며 응급 시에는 즉시 119로 연락하세요.
        </p>
      </footer>
    </div>
  );
}
