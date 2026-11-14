"use client";
import { useState } from "react";

export default function InviteButton({ path }: { path: string }) {
  const [msg, setMsg] = useState("");
  const share = async () => {
    const url = `${location.origin}${path}`;
    try {
      if (navigator.share) { await navigator.share({ title: "퇴원노트", text: "퇴원 준비를 같이 나눠서 해요. 링크로 들어와 이름만 입력하면 돼요.", url }); return; }
      await navigator.clipboard.writeText(url);
      setMsg("링크를 복사했어요. 카카오톡이나 문자에 붙여넣어 보내세요.");
    } catch {
      setMsg(url); // 공유·복사가 막힌 환경에서는 링크를 그대로 보여준다
    }
  };
  return (
    <div>
      <button onClick={share} className="flex w-full items-center justify-center rounded-xl bg-accent px-5 py-4 text-lg font-bold text-white">초대 링크 보내기</button>
      {msg && <p role="status" className="mt-2 break-all text-sm text-muted">{msg}</p>}
    </div>
  );
}
