"use client";
import { useState, useTransition } from "react";

// 서버 액션 실행 공통: 진행 상태와 사용자에게 보여줄 오류 문구
export function useAct() {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const run = (fn: () => Promise<unknown>, after?: () => void) =>
    start(async () => {
      setErr("");
      try {
        await fn();
        after?.();
      } catch (e) {
        if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e; // redirect()는 예외로 동작한다
        setErr(e instanceof Error ? e.message : "문제가 생겼어요. 다시 시도해주세요");
      }
    });
  return { run, pending, err, setErr };
}
