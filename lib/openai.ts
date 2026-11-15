import "server-only";

const MODEL = process.env.GPT_MODEL ?? "gpt-4o"; // 이 모델이 계정에서 안 되면 .env.local에 GPT_MODEL로 바꾼다
export const hasModel = () => !!process.env.GPT_API_KEY;

type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "high" } };

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
