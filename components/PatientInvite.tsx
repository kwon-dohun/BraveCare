"use client";
import { useState } from "react";
import Icon from "./Icon";

export default function PatientInvite({ patientToken }: { patientToken: string }) {
  const [copied, setCopied] = useState(false);

  const copyPatientLink = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://bravecare-kr.vercel.app";
    const patientUrl = `${origin}/p/${patientToken}`;

    const text = [
      "[씩씩케어] 오늘 몸은 좀 어떠세요?",
      "아래 주소를 눌러 버튼 몇 번만 누르면 가족에게 오늘 상태가 전해져요. 설치나 가입은 필요 없어요.",
      "",
      patientUrl,
      "",
      "이 메시지를 채팅방 공지로 올려 두면 매일 찾기 쉬워요.",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {}
  };

  return (
    <section className="rounded-xl bg-card p-4 shadow-card">
      <h2 className="font-semibold">환자분께 안부 링크 보내기</h2>
      <p className="mt-1 text-sm text-muted">따로 지내시는 환자분께 카톡으로 보내 주세요. 약·열·통증·화장실만 눌러서 가족에게 알려요. 이 링크로는 안부만 남길 수 있고 다른 화면은 열리지 않아요.</p>
      <button
        type="button"
        onClick={copyPatientLink}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-accent-soft px-5 py-3 font-semibold text-accent"
      >
        {copied ? <><Icon name="check" size={16} />복사했어요. 카톡에 붙여 넣어 주세요</> : "안부 링크 복사하기"}
      </button>
    </section>
  );
}
