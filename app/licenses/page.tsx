import Link from "next/link";
import { Logo } from "@/components/Mascot";

export const metadata = { title: "오픈소스 라이선스 · 씩씩케어" };

// 웹(package.json)과 앱(mobile/package.json)의 런타임 의존성. 의존성을 더하거나 빼면 여기도 고친다.
const LIBS: [string, string, string][] = [
  ["Next.js", "MIT", "https://github.com/vercel/next.js"],
  ["React · React DOM", "MIT", "https://github.com/facebook/react"],
  ["Tailwind CSS", "MIT", "https://github.com/tailwindlabs/tailwindcss"],
  ["Supabase JS", "MIT", "https://github.com/supabase/supabase-js"],
  ["node-qrcode", "MIT", "https://github.com/soldair/node-qrcode"],
  ["server-only", "MIT", "https://www.npmjs.com/package/server-only"],
  ["Expo (expo, expo-notifications, expo-brightness, expo-status-bar)", "MIT", "https://github.com/expo/expo"],
  ["React Native", "MIT", "https://github.com/facebook/react-native"],
  ["React Native WebView", "MIT", "https://github.com/react-native-webview/react-native-webview"],
  ["React Native Async Storage", "MIT", "https://github.com/react-native-async-storage/async-storage"],
  ["React Native Safe Area Context", "MIT", "https://github.com/AppAndFlow/react-native-safe-area-context"],
  ["React Native Document Scanner Plugin", "MIT", "https://github.com/websitebeaver/react-native-document-scanner-plugin"],
];

const FONTS: [string, string, string][] = [
  ["Pretendard", "SIL Open Font License 1.1", "https://github.com/orioncactus/pretendard"],
  ["나눔스퀘어라운드 (네이버)", "SIL Open Font License 1.1", "https://hangeul.naver.com/font"],
];

const DATA: [string, string][] = [
  ["건강보험심사평가원 상병마스터", "공공데이터포털, 공공누리 제1유형(출처표시)"],
  ["식약처 의약품 제품 허가정보 · 의약품개요정보(e약은요) · DUR 품목정보", "공공데이터포털 Open API"],
  ["보험개발원 실손24 참여 요양기관", "공공데이터포털 Open API"],
];

const MIT = `Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

function List({ title, rows }: { title: string; rows: [string, string, string?][] }) {
  return (
    <section>
      <h2 className="font-semibold">{title}</h2>
      <ul className="mt-2 divide-y divide-line/60">
        {rows.map(([name, license, url]) => (
          <li key={name} className="py-2.5">
            {url ? <a href={url} target="_blank" rel="noreferrer" className="text-callout font-medium text-accent underline">{name}</a> : <p className="text-callout font-medium">{name}</p>}
            <p className="text-sm text-muted">{license}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Licenses() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-8">
      <Link href="/" className="inline-flex"><Logo /></Link>
      <h1 className="mt-6 font-display text-title">오픈소스 라이선스</h1>
      <p className="mt-1 text-sm text-muted">씩씩케어는 아래 오픈소스와 공공데이터를 사용해요. 각 저작권은 원저작자에게 있어요.</p>
      <div className="mt-6 space-y-8">
        <List title="소프트웨어" rows={LIBS} />
        <List title="글꼴" rows={FONTS} />
        <List title="공공데이터" rows={DATA} />
        <section>
          <h2 className="font-semibold">MIT License 전문</h2>
          <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-muted">{MIT}</p>
        </section>
      </div>
      <Link href="/terms" className="mt-8 inline-flex text-sm font-medium text-accent">이용약관 보기</Link>
    </main>
  );
}
