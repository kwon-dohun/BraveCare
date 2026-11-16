"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { renewShareLink, removeMember } from "@/app/actions";
import type { Auth } from "@/lib/db";
import Sheet from "./Sheet";
import { useAct } from "./useAct";
import Icon from "@/components/Icon";
import { toApp, useInApp } from "@/lib/app";

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
interface KakaoSdk { isInitialized(): boolean; init(key: string): void; Share: { sendDefault(o: object): void } }
// 카카오톡 공유는 버튼을 처음 누를 때 SDK를 받아온다
async function kakaoShare(text: string, url: string) {
  const w = window as Window & { Kakao?: KakaoSdk };
  if (!w.Kakao) await new Promise((ok, no) => {
    const s = document.createElement("script");
    s.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
    s.onload = ok; s.onerror = no;
    document.head.append(s);
  });
  if (!w.Kakao!.isInitialized()) w.Kakao!.init(KAKAO_KEY!);
  w.Kakao!.Share.sendDefault({ objectType: "text", text, link: { mobileWebUrl: url, webUrl: url }, buttonTitle: "참여하기" });
}

const TEXT = "가족 퇴원 준비를 씩씩케어에서 같이 나눠서 해요. 링크로 들어와 이름만 입력하면 돼요.";

export function Invite({ auth, path, expiresAt, expired }: { auth: Auth; path: string; expiresAt: string; expired: boolean }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [qr, setQr] = useState("");
  const { run, pending, err } = useAct();
  const url = () => `${location.origin}${path}`;
  const app = useInApp();
  const canShare = app || (typeof navigator !== "undefined" && !!navigator.share);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url()); setMsg("링크를 복사했어요. 카카오톡 대화방에 붙여넣어 보내세요."); }
    catch { setMsg(url()); } // 복사가 막힌 환경에서는 링크를 그대로 보여준다
  };
  const share = async () => {
    if (app) return void toApp({ t: "share", text: TEXT, url: url() }); // 앱에서는 휴대폰 공유창
    try { await navigator.share({ title: "씩씩케어", text: TEXT, url: url() }); } catch {}
  };
  // QR은 이 기기 안에서 만든다. 외부 QR 서비스에 맡기면 초대 링크(=열쇠)가 그쪽으로 넘어간다.
  useEffect(() => {
    if (!open || expired) return;
    QRCode.toDataURL(`${location.origin}${path}`, { margin: 1, width: 240, color: { dark: "#0b3d2e", light: "#ffffff" } }).then(setQr).catch(() => setQr(""));
  }, [open, expired, path]);
  const row = "flex w-full items-center justify-between rounded-xl bg-card shadow-card px-4 py-3 text-left";

  return (
    <>
      <button onClick={() => { setMsg(""); setOpen(true); }} className="flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3.5 font-semibold text-ink">가족 초대하기</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="초대 링크 보내기">
        {expired ? (
          <p className="rounded-xl bg-warn-soft p-3 text-warn">초대 링크가 만료됐어요. 새 링크를 만들어 보내주세요.</p>
        ) : (
          <div className="space-y-2">
            {KAKAO_KEY && !app && <button onClick={() => kakaoShare(TEXT, url()).catch(() => setMsg("카카오톡을 열지 못했어요. 링크 복사를 써 주세요."))} className={row}><span>카카오톡으로 보내기</span><Icon name="right" size={18} className="text-muted" /></button>}
            {canShare && <button onClick={share} className={row}><span>{KAKAO_KEY && !app ? "다른 앱으로 보내기" : "카카오톡·다른 앱으로 보내기"}</span><Icon name="right" size={18} className="text-muted" /></button>}
            <button onClick={() => { location.href = `sms:?&body=${encodeURIComponent(`${TEXT} ${url()}`)}`; }} className={row}><span>문자로 보내기</span><Icon name="right" size={18} className="text-muted" /></button>
            <button onClick={copy} className={row}><span>링크 복사</span><Icon name="right" size={18} className="text-muted" /></button>
            {qr && (
              <details className="rounded-xl bg-card px-4 shadow-card">
                <summary className="cursor-pointer font-medium">QR 코드로 보여주기</summary>
                {/* eslint-disable-next-line @next/next/no-img-element -- 이 기기에서 만든 data URL이라 최적화할 것이 없다 */}
                <img src={qr} alt="가족 초대 QR 코드" width={240} height={240} className="mx-auto my-3 rounded-lg" />
                <p className="pb-3 text-center text-sm text-muted">가족이 휴대폰 카메라로 비추면 참여 화면이 열려요. 옆에 있는 가족에게 바로 보여줄 때 편해요.</p>
              </details>
            )}
          </div>
        )}
        {msg && <p role="status" className="mt-3 break-all text-sm text-accent">{msg}</p>}
        <p className="mt-4 text-sm text-muted">
          {expired ? "" : `이 링크는 ${new Date(expiresAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}까지 쓸 수 있어요. `}
          링크를 가진 사람은 누구나 참여할 수 있으니 가족에게만 보내세요.
        </p>
        {err && <p role="alert" className="mt-2 text-warn">{err}</p>}
        <button disabled={pending} onClick={() => run(() => renewShareLink(auth), () => setMsg("새 링크를 만들었어요. 이전 링크는 더 이상 쓸 수 없어요."))} className="mt-3 w-full rounded-xl border border-line px-4 text-sm text-muted">
          {pending ? "만드는 중…" : "새 링크 만들기 (이전 링크 무효)"}
        </button>
      </Sheet>
    </>
  );
}

export function RemoveMember({ auth, memberId, name }: { auth: Auth; memberId: string; name: string }) {
  const [ask, setAsk] = useState(false);
  const { run, pending, err } = useAct();
  if (!ask) return <button onClick={() => setAsk(true)} className="px-2 text-sm text-muted underline" aria-label={`${name} 내보내기`}>내보내기</button>;
  return (
    <span className="flex items-center gap-2 text-sm">
      {err && <span role="alert" className="text-warn">{err}</span>}
      <button onClick={() => setAsk(false)} className="h-9 min-h-0 rounded-full bg-background px-3.5 font-medium">취소</button>
      <button disabled={pending} onClick={() => run(() => removeMember(auth, memberId))} className="h-9 min-h-0 rounded-full bg-warn px-3.5 font-semibold text-white">내보내기</button>
    </span>
  );
}
