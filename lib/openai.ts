import "server-only";

const MODEL = process.env.GPT_MODEL ?? "gpt-4o"; // 이 모델이 계정에서 안 되면 .env.local에 GPT_MODEL로 바꾼다
// 서류 사진 읽기는 따로 고른 모델을 쓴다(흐린 사진의 약 이름 정확도 비교에서 gpt-4o 68% → gpt-4.1-mini 89%). 챗봇은 MODEL 그대로.
const SCAN_MODEL = process.env.SCAN_MODEL ?? "gpt-4.1-mini";
export const hasModel = () => !!process.env.GPT_API_KEY;

type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "high" } };

// askJson과 같은 호출을 스트리밍으로 받는다. 글자가 올 때마다 지금까지 받은 전체를 onText로 알린다.
// 사람이 사진 한 장에 오래 기다리지 않게: 첫 글자가 FIRST_MS 안에 안 오면 멈춘 연결로 보고 한 번 다시 건다. 어떻게 해도 전체 TOTAL_MS를 넘기지 않는다.
const FIRST_MS = 6_000;
const TOTAL_MS = 18_000;

export async function streamJson(system: string, user: Part[], onText: (acc: string) => void): Promise<string | null> {
  const deadline = Date.now() + TOTAL_MS;
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await streamOnce(system, user, onText, deadline, attempt === 0 ? FIRST_MS : 0);
    if (r !== "STALL") return r;
  }
  return null;
}

async function streamOnce(system: string, user: Part[], onText: (acc: string) => void, deadline: number, firstMs: number): Promise<string | null | "STALL"> {
  const ctl = new AbortController();
  let stalled = false;
  const total = setTimeout(() => ctl.abort(), Math.max(1, deadline - Date.now()));
  let first = firstMs > 0 ? setTimeout(() => { stalled = true; ctl.abort(); }, firstMs) : undefined;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GPT_API_KEY}` },
      body: JSON.stringify({
        model: SCAN_MODEL, temperature: 0, response_format: { type: "json_object" }, stream: true,
        max_tokens: 4000, // 정상 서류는 1,000토큰 안쪽. 읽을 게 없거나 엉킨 사진에서 끝없이 쓰는 걸 막는 상한
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
      signal: ctl.signal,
    });
    if (!res.ok || !res.body) {
      console.error("OpenAI 호출 실패", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", acc = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) {
        if (!l.startsWith("data: ") || l.startsWith("data: [DONE]")) continue;
        const d = JSON.parse(l.slice(6)).choices?.[0]?.delta?.content;
        if (d) { clearTimeout(first); first = undefined; acc += d; onText(acc); }
      }
    }
    return acc;
  } catch (e) {
    if (stalled) return "STALL";
    console.error("OpenAI 호출 실패", e instanceof Error ? e.name : "unknown");
    return null;
  } finally {
    clearTimeout(total);
    clearTimeout(first);
  }
}

// JSON 응답을 강제한 한 번의 호출. 실패하면 null. 키·이미지·질문 내용은 로그에 남기지 않는다.
export async function askJson(system: string, user: Part[]): Promise<string | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GPT_API_KEY}` },
      body: JSON.stringify({
        model: MODEL, temperature: 0, response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(40_000),
    });
    if (!res.ok) {
      console.error("OpenAI 호출 실패", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    return (await res.json()).choices?.[0]?.message?.content ?? "";
  } catch (e) {
    console.error("OpenAI 호출 실패", e instanceof Error ? e.name : "unknown");
    return null;
  }
}
