"use client";
import { useEffect } from "react";
import { markSeen } from "@/app/actions";
import type { Auth } from "@/lib/db";

// 화면을 실제로 열었을 때만 '봤음'으로 바꾼다 (미리 불러오기로는 바뀌지 않게 클라이언트에서 부른다)
export default function MarkSeen({ auth }: { auth: Auth }) {
  const { k, v } = auth;
  useEffect(() => { markSeen({ k, v }).catch(() => {}); }, [k, v]);
  return null;
}
