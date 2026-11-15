"use client";
import { useEffect } from "react";

// 로그인이 없어서 주소가 곧 열쇠다. 같은 기기에서 다시 찾을 수 있게 마지막 노트 주소를 기억한다.
export default function Remember({ path, label }: { path: string; label: string }) {
  useEffect(() => {
    try { localStorage.setItem("toewon:last", JSON.stringify({ path, label })); } catch {}
  }, [path, label]);
  return null;
}
