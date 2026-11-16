"use client";
import { useEffect } from "react";
import { logOpen } from "@/app/actions";
import { inApp } from "@/lib/app";

// 하루에 한 번만 '열었다'를 남긴다 (KPI G7). 기기 기준이라 저장소가 막힌 환경에서는 열 때마다 남는다.
export default function Opened({ k, v }: { k: "c" | "m"; v: string }) {
  useEffect(() => {
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
    try {
      if (localStorage.getItem("bc:opened") === today) return;
      localStorage.setItem("bc:opened", today);
    } catch {}
    logOpen({ k, v }, inApp()).catch(() => {});
  }, [k, v]);
  return null;
}
