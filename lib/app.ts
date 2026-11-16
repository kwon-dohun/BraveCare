import { useSyncExternalStore } from "react";

// 앱(웹뷰) 안에서 열렸을 때만 쓰는 통로. 앱만 할 수 있는 일(밝기, 문서 스캐너, 공유창)을 부탁한다.
type Msg = { t: "bright"; on: boolean } | { t: "scan"; max: number } | { t: "share"; text: string; url: string };
type W = Window & { ReactNativeWebView?: { postMessage(s: string): void } };

export const inApp = () => typeof window !== "undefined" && !!(window as W).ReactNativeWebView;
export const toApp = (m: Msg) => (window as W).ReactNativeWebView?.postMessage(JSON.stringify(m));
// 서버에서 그린 화면과 어긋나지 않게, 앱 안인지는 화면이 뜬 뒤에 안다
export const useInApp = () => useSyncExternalStore(() => () => {}, inApp, () => false);
