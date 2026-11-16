"use client";
import { useState } from "react";
import { addTask } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { useAct } from "@/components/useAct";
import Icon from "@/components/Icon";

const OUTPATIENT_PRESETS = ["외래 진료", "실밥 제거(발사)", "혈액·영상 검사", "소독·드레싱", "재활 치료"];

export default function AddTask({
  auth,
  defaultDate = "",
  plain = false,
  defaultVisit = false,
}: {
  auth: Auth;
  defaultDate?: string;
  plain?: boolean;
  defaultVisit?: boolean;
}) {
  const [tab, setTab] = useState<"schedule" | "custom">(defaultVisit ? "schedule" : "custom");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("");
  const { run, pending, err } = useAct();

  const isSchedule = tab === "schedule";

  const onSelectPreset = (p: string) => {
    setTitle((prev) => (prev ? `${prev} (${p})` : p));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (isSchedule && !date) return;
    run(
      () => addTask(auth, title, date || null, isSchedule ? "schedule" : "custom", time || null),
      () => {
        setTitle("");
        setDate(defaultDate);
        setTime("");
      }
    );
  };

  return (
    <form className={plain ? "" : "mt-2 rounded-xl bg-card p-4 shadow-card"} onSubmit={submit}>
      {/* 탭 전환: [외래·병원 일정] | [가족 할 일] */}
      <div className="flex rounded-xl bg-background p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setTab("schedule")}
          className={`flex-1 rounded-lg py-1.5 transition-colors ${isSchedule ? "bg-card text-accent shadow-sm" : "text-muted hover:text-ink"}`}
        >
          🏥 외래·병원 일정
        </button>
        <button
          type="button"
          onClick={() => setTab("custom")}
          className={`flex-1 rounded-lg py-1.5 transition-colors ${!isSchedule ? "bg-card text-accent shadow-sm" : "text-muted hover:text-ink"}`}
        >
          📋 가족 할 일
        </button>
      </div>

      <div className="mt-3">
        <label htmlFor="nt" className="block text-xs font-semibold text-ink">
          {isSchedule ? "외래 진료·병원 일정 내용" : "할 일 내용"}
        </label>
        <input
          id="nt"
          value={title}
          maxLength={100}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isSchedule ? "예: 정형외과 외래 (실밥 제거)" : "예: 휠체어 대여 반납"}
          className="mt-1.5 w-full rounded-xl border border-line bg-card px-3.5 py-2 text-sm"
          autoFocus={!plain}
        />

        {isSchedule && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {OUTPATIENT_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onSelectPreset(p)}
                className="rounded-lg bg-background px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent-soft"
              >
                +{p}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="nd" className="block text-xs font-semibold text-ink">
            날짜 {isSchedule ? "(필수)" : "(선택)"}
          </label>
          <input
            id="nd"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2 text-xs"
          />
        </div>
        <div>
          <label htmlFor="nh" className="block text-xs font-semibold text-ink">
            시간 (선택)
          </label>
          <input
            id="nh"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2 text-xs"
          />
        </div>
      </div>

      {isSchedule && (
        <p className="mt-2 text-[11px] text-accent leading-relaxed">
          💡 외래 날짜를 등록해 두시면, 당일 아침에 의사에게 보여줄 &lsquo;외래 리포트&rsquo;와 질문 리스트가 자동으로 준비돼요.
        </p>
      )}

      {err && <p role="alert" className="mt-2 text-xs text-warn">{err}</p>}

      <button
        type="submit"
        disabled={pending || !title.trim() || (isSchedule && !date)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-accent-soft px-4 py-2.5 text-xs font-semibold text-accent transition-colors hover:opacity-90 disabled:opacity-40"
      >
        <Icon name="plus" size={14} />
        {isSchedule ? "외래 일정 등록하기" : "할 일 추가하기"}
      </button>
    </form>
  );
}
