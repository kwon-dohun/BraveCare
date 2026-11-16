"use client";
import { useSyncExternalStore } from "react";
import { inApp } from "@/lib/app";

const PLAY = process.env.NEXT_PUBLIC_PLAY_URL;
const APPLE = process.env.NEXT_PUBLIC_APPSTORE_URL;
// 앱이 깔려 있으면 초대 링크가 앱으로 바로 열린다. 여기까지 왔다면 앱이 없는 것이라 스토어로 안내한다.
const store = () => (inApp() ? "" : /iPhone|iPad/.test(navigator.userAgent) ? APPLE ?? "" : /Android/.test(navigator.userAgent) ? PLAY ?? "" : "");

export default function GetApp() {
  const href = useSyncExternalStore(() => () => {}, store, () => "");
  if (!href) return null;
  return (
    <a href={href} className="mt-4 flex items-center justify-center rounded-full bg-accent-soft px-5 py-3 text-sm font-semibold text-accent">
      씩씩케어 앱 받기 (알림을 받을 수 있어요)
    </a>
  );
}
