"use client";
import { useEffect } from "react";
import { markSeen } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { NEWS_SEEN_KEY } from "@/components/RefreshIfSeen";

// 화면을 실제로 열었을 때만 '봤음'으로 바꾼다 (미리 불러오기로는 바뀌지 않게 클라이언트에서 부른다)
export default function MarkSeen({ auth }: { auth: Auth }) {
  const { k, v } = auth;
  useEffect(() => {
    // 봤음이 저장된 뒤에 표시를 남겨, 뒤로 간 홈이 스스로 새로 불러오게 한다
    markSeen({ k, v }).then(() => { try { sessionStorage.setItem(NEWS_SEEN_KEY, "1"); } catch {} }).catch(() => {});
  }, [k, v]);
  return null;
}
