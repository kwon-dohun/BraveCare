"use client";
import { useState } from "react";
import { addTask } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { useAct } from "@/components/useAct";
import Icon from "@/components/Icon";
import Segmented from "@/components/Segmented";

const OUTPATIENT_PRESETS = ["외래 진료", "실밥 제거(발사)", "혈액·영상 검사", "소독·드레싱", "재활 치료"];

// 새로 넣을 때도 고칠 때와 같은 항목(반복·담당자·메모)을 입력할 수 있다. 기본 입력은 제목·날짜·시간만 보이고 나머지는 "더 자세히"에 접어 둔다.
export default function AddTask({
  auth,
  defaultDate = "",
  plain = false,
  defaultVisit = false,
  members = [],
  solo = false,
  meId = "",
  onAdded,
}: {
  auth: Auth;
  defaultDate?: string;
  plain?: boolean;
  defaultVisit?: boolean;
  members?: { id: string; name: string }[];
  solo?: boolean;
  meId?: string; // 담당 기본값(나)
  onAdded?: () => void;
}) {
  const [tab, setTab] = useState<"schedule" | "custom">(defaultVisit ? "schedule" : "custom");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("");
  const [repeat, setRepeat] = useState("");
  const [assignee, setAssignee] = useState(meId);
  const [memo, setMemo] = useState("");
  const { run, pending, err } = useAct();

  const isSchedule = tab === "schedule";
  const showAssignee = !solo && members.length > 0;

  const onSelectPreset = (p: string) => {
    setTitle((prev) => (prev.trim() ? `${prev.trim()} · ${p}` : p));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (isSchedule && !date) return;
    run(
      () => addTask(auth, title, date || null, isSchedule ? "schedule" : "custom", time || null, {
        repeat: !isSchedule && date ? repeat || null : null,
        assigneeId: assignee || null,
        memo,
      }),
      () => {
        setTitle("");
        setDate(defaultDate);
        setTime("");
        setRepeat("");
        setAssignee(meId);
        setMemo("");
        onAdded?.();
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

      <details className="mt-3 rounded-xl bg-background">
        <summary className="cursor-pointer px-3.5 py-2.5 text-sm font-semibold">
          더 자세히 입력하기 <span className="font-normal text-muted">({[!isSchedule && date && "반복", showAssignee && "담당자", "메모"].filter(Boolean).join("·")})</span>
        </summary>
        <div className="space-y-3 px-3.5 pb-3.5">
          {!isSchedule && date && (
            <div>
              <label htmlFor="nr" className="block text-sm font-semibold">반복</label>
              <select id="nr" value={repeat} onChange={(e) => setRepeat(e.target.value)} className={field}>
                <option value="">안 함</option><option value="weekly">매주</option>
              </select>
              {repeat && <p className="mt-1 text-xs text-muted">끝냈다고 체크하면 다음 {repeat === "daily" ? "날" : "주"} 할 일이 자동으로 생겨요.</p>}
            </div>
          )}
          {showAssignee && (
            <div>
              <label htmlFor="na" className="block text-sm font-semibold">담당자</label>
              <select id="na" value={assignee} onChange={(e) => setAssignee(e.target.value)} className={field}>
                {members.map((m) => <option key={m.id} value={m.id}>{m.id === meId ? `${m.name} (나)` : m.name}</option>)}
                <option value="">담당자 없음 (가족이 맡아 주세요)</option>
              </select>
              {assignee && assignee !== meId && <p className="mt-1 text-xs text-muted">정하면 가족에게 알려줘요.</p>}
            </div>
          )}
          <div>
            <label htmlFor="nm" className="block text-sm font-semibold">메모</label>
            <textarea id="nm" rows={3} maxLength={500} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder={solo ? "메모 (예: 진료 예약증은 냉장고 옆에 있어요)" : "가족에게 남길 말 (예: 진료 예약증은 냉장고 옆에 있어요)"} className={`${field} field-sizing-content max-h-72`} />
          </div>
        </div>
      </details>

      {err && <p role="alert" className="mt-2 text-sm text-warn">{err}</p>}
      <button
        type="submit"
        disabled={pending || !title.trim() || (isSchedule && !date)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-3 font-semibold text-ink disabled:opacity-40"
      >
        <Icon name="plus" size={16} />{pending ? "넣는 중…" : isSchedule ? "병원 일정 넣기" : "할 일 넣기"}
      </button>
    </form>
  );
}
