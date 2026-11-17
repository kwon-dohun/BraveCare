"use client";
import { cameFromApp } from "@/components/BackLink";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTask, deleteTask } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { useAct } from "@/components/useAct";
import { helpRequestText } from "@/lib/task-help";
import { krDate, krTime } from "@/lib/format";

interface Props {
  auth: Auth; back: string; members: { id: string; name: string }[];
  task: { id: string; title: string; due_date: string | null; rel_day: number | null; assignee_id: string | null; memo: string | null; due_time: string | null; repeat: "daily" | "weekly" | null };
}

export default function TaskForm({ auth, back, members, task, solo = false, onSaved }: Props & { solo?: boolean; onSaved?: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(task.title);
  const [date, setDate] = useState(task.due_date ?? "");
  const [time, setTime] = useState(task.due_time ?? "");
  const [repeat, setRepeat] = useState<string>(task.repeat ?? "");
  const [assignee, setAssignee] = useState(task.assignee_id ?? "");
  const [memo, setMemo] = useState(task.memo ?? "");
  const [confirmDel, setConfirmDel] = useState(false);
  const [copiedHelp, setCopiedHelp] = useState(false);
  const { run, pending, err } = useAct();

  const copyHelp = async () => {
    const when = date ? `${krDate(date)}${time ? ` ${krTime(time)}` : ""}` : "날짜 미정";
    const text = helpRequestText({ title, when, memo }, window.location.origin);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedHelp(true);
      setTimeout(() => setCopiedHelp(false), 2500);
    } catch {}
  };
  // 저장·삭제 뒤에는 이 화면을 연 곳(홈·일정 등)으로 돌아간다. 바로 열어서 온 곳이 없으면 일정으로
  const done = () => (cameFromApp() ? router.back() : router.push(back));
  const field = "mt-1 w-full rounded-xl border border-line bg-card px-4 py-3";

  return (
    <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); run(() => updateTask(auth, task.id, { title, dueDate: date || null, dueTime: time || null, repeat: repeat || null, assigneeId: assignee || null, memo }), onSaved ?? done); }}>
      <div>
        <label htmlFor="tt" className="font-semibold">할 일</label>
        <textarea id="tt" rows={2} maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
      </div>
      <div>
        <label htmlFor="td" className="font-semibold">날짜</label>
        <input id="td" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        {task.rel_day !== null && (
          <p className="mt-1 text-sm text-muted">지금은 퇴원일 기준으로 자동 계산돼요. 날짜를 직접 바꾸면 퇴원일이 바뀌어도 이 날짜는 그대로 유지돼요.</p>
        )}
      </div>
      {date && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="th" className="font-semibold">시간 <span className="text-sm font-normal text-muted">(선택)</span></label>
            <input id="th" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="tr" className="font-semibold">반복</label>
            <select id="tr" value={repeat} onChange={(e) => setRepeat(e.target.value)} className={field}>
              <option value="">안 함</option><option value="daily">매일</option><option value="weekly">매주</option>
            </select>
          </div>
          {repeat && <p className="col-span-2 text-sm text-muted">끝냈다고 체크하면 다음 {repeat === "daily" ? "날" : "주"} 할 일이 자동으로 생겨요.</p>}
        </div>
      )}
      {!solo && <div>
        <label htmlFor="ta" className="font-semibold">담당자</label>
        <select id="ta" value={assignee} onChange={(e) => setAssignee(e.target.value)} className={field}>
          <option value="">담당자 없음</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <p className="mt-1 text-sm text-muted">다른 가족의 일도 바꿀 수 있어요. 바꾸면 가족에게 알려줘요.</p>
        {!assignee && (
          <button
            type="button"
            onClick={copyHelp}
            className="mt-2 text-xs text-muted underline hover:text-ink"
          >
            {copiedHelp ? "도움 요청 문구가 복사되었어요" : "가족에게 도움 요청 문구 복사하기"}
          </button>
        )}
      </div>}
      <div>
        <label htmlFor="tm" className="font-semibold">메모</label>
        <textarea id="tm" rows={3} maxLength={500} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder={solo ? "메모 (예: 진료 예약증은 냉장고 옆에 있어요)" : "가족에게 남길 말 (예: 진료 예약증은 냉장고 옆에 있어요)"} className={field} />
      </div>
      {err && <p role="}alert" className="text-warn">{err}</p>}
      <button disabled={pending || !title.trim()} className="w-full rounded-xl bg-primary px-5 py-3.5 font-semibold text-ink disabled:opacity-40">{pending ? "저장하는 중…" : "저장"}</button>

      <div className="pt-6">
        {confirmDel ? (
          <div className="rounded-xl border border-warn bg-warn-soft p-4">
            <p className="text-warn">이 할 일을 삭제할까요? 되돌릴 수 없어요.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setConfirmDel(false)} className="flex-1 rounded-xl bg-card shadow-card px-4">취소</button>
              <button type="button" disabled={pending} onClick={() => run(() => deleteTask(auth, task.id), done)} className="flex-1 rounded-xl bg-warn px-4 font-semibold text-white">삭제</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDel(true)} className="w-full text-sm text-muted underline">이 할 일 삭제</button>
        )}
      </div>
    </form>
  );
}
