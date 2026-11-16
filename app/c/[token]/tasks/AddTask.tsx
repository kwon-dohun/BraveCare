"use client";
import { useState } from "react";
import { addTask } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { useAct } from "@/components/useAct";
import Icon from "@/components/Icon";
import Segmented from "@/components/Segmented";

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
    setTitle((prev) => (prev.trim() ? `${prev.trim()} · ${p}` : p));
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

  const field = "mt-1 w-full rounded-xl border border-line bg-card px-3.5 py-2.5";
  return (
    <form className={plain ? "" : "mt-2 rounded-xl bg-card p-4 shadow-card"} onSubmit={submit}>
      <Segmented
        label="무엇을 추가할까요"
        active={isSchedule ? 0 : 1}
        items={[{ label: "병원 일정", onClick: () => setTab("schedule") }, { label: "할 일", onClick: () => setTab("custom") }]}
      />

      <label htmlFor="nt" className="mt-3 block text-sm font-semibold">{isSchedule ? "어떤 진료·검사예요?" : "어떤 일이에요?"}</label>
      <input id="nt" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder={isSchedule ? "예: 정형외과 외래" : "예: 휠체어 대여 반납"} className={field} />
      {isSchedule && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {OUTPATIENT_PRESETS.map((p) => (
            <button key={p} type="button" onClick={() => onSelectPreset(p)} className="h-8 min-h-0 rounded-full bg-accent-soft px-3 text-xs font-medium text-accent">{p}</button>
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="nd" className="block text-sm font-semibold">날짜 <span className="font-normal text-muted">{isSchedule ? "(필수)" : "(선택)"}</span></label>
          <input id="nd" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="nh" className="block text-sm font-semibold">시간 <span className="font-normal text-muted">(선택)</span></label>
          <input id="nh" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} />
        </div>
      </div>
      {isSchedule && <p className="mt-2 text-xs text-muted">병원 가는 날 아침 홈에 의사에게 보여 줄 외래 리포트와 물어볼 것이 먼저 나와요.</p>}
      {err && <p role="alert" className="mt-2 text-sm text-warn">{err}</p>}
      <button
        type="submit"
        disabled={pending || !title.trim() || (isSchedule && !date)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-accent-soft px-4 py-3 font-semibold text-accent disabled:opacity-40"
      >
        <Icon name="plus" size={16} />{pending ? "넣는 중…" : isSchedule ? "병원 일정 넣기" : "할 일 넣기"}
      </button>
    </form>
  );
}
