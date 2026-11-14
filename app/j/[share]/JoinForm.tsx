"use client";
import { useState, useTransition } from "react";
import { joinCase } from "@/app/actions";

export default function JoinForm({ share }: { share: string }) {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="mt-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          try { await joinCase(share, name); } catch (x) {
            if (x instanceof Error && x.message.includes("NEXT_REDIRECT")) throw x;
            setErr(x instanceof Error ? x.message : "문제가 생겼어요");
          }
        });
      }}
    >
      <label htmlFor="jn" className="font-bold">내 이름</label>
      <input id="jn" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} placeholder="예: 동생" className="mt-2 w-full rounded-xl border border-line bg-card px-4 py-3 text-lg" />
      {err && <p role="alert" className="mt-2 text-warn">{err}</p>}
      <button disabled={pending || !name.trim()} className="mt-5 w-full rounded-xl bg-accent px-5 py-4 text-lg font-bold text-white disabled:opacity-40">참여하기</button>
    </form>
  );
}
