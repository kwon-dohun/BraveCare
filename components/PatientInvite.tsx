"use client";
import { useState } from "react";

export default function PatientInvite({ patientToken }: { patientToken: string }) {
  const [copied, setCopied] = useState(false);

  const copyPatientLink = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://bravecare-kr.vercel.app";
    const patientUrl = `${origin}/p/${patientToken}`;

    const text = `[씩씩케어] 오늘 하루 컨디션은 어떠셨어요? 🌱
매일 저녁 버튼 4개만 눌러 가족에게 안부를 알려주세요.
(앱 설치나 가입 없이 바로 열려요)

👉 바로 안부 보내기:
${patientUrl}

💡 카톡 채팅방 상단에 '공지'로 등록해 두시면 매일 누르기 편해요!`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {}
  };

  return (
    <section className="rounded-2xl border border-line bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
            환자 전용 안부 링크
          </span>
          <h2 className="mt-1 font-semibold text-ink">환자분께 안부 링크 보내기</h2>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            멀리 살거나 따로 지내시는 환자분께 카톡으로 보내주세요. 복잡한 화면 없이 <strong>약·열·통증·배변</strong> 4가지를 10초 만에 가족에게 전달할 수 있어요.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={copyPatientLink}
        className={`mt-3 w-full rounded-xl py-3 text-sm font-semibold transition-colors shadow-sm ${
          copied ? "bg-accent-soft text-accent" : "bg-primary text-ink hover:opacity-90"
        }`}
      >
        {copied ? "✓ 환자용 안부 메시지가 복사되었어요!" : "환자용 안부 체크 링크 복사하기"}
      </button>

      {copied && (
        <p className="mt-2 text-center text-xs text-accent font-medium">
          카카오톡에 붙여넣어 환자분께 전송하세요. 채팅방 상단에 공지로 고정해 두시면 더 좋아요!
        </p>
      )}
    </section>
  );
}
