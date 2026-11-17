import { extractImage } from "@/lib/scan";

export const maxDuration = 30;

// 서류 사진을 읽는 동안 진행 상황을 한 줄(JSON)씩 흘려 보낸다. 진행 줄: {p:{docType,chars,sorting}}, 끝: {done:결과}, 실패: {err:메시지}
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const auth = body?.auth;
  const image = body?.image;
  if (!auth || (auth.k !== "c" && auth.k !== "m") || typeof auth.v !== "string" || typeof image !== "string") {
    return Response.json({ err: "요청이 올바르지 않아요" }, { status: 400 });
  }
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctl) {
      const send = (o: unknown) => ctl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      let last = 0;
      try {
        const done = await extractImage({ k: auth.k, v: auth.v }, image, (p) => {
          if (p.chars - last >= 30 || p.sorting) { last = p.chars; send({ p }); }
        });
        send({ done });
      } catch (e) {
        send({ err: e instanceof Error ? e.message : "읽지 못했어요. 다시 촬영해주세요" });
      }
      ctl.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
