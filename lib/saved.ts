import { BENEFITS } from "./benefits.ts";
import { extraById } from "./ai-benefits.ts";

// 찜 항목 키: 기본 지원은 b:<제도 id>, 추가 확인처는 x:<항목 id>. 화면에서 온 값은 목록에 있는지 확인하고 받는다.
export function isValidSaved(item: string) {
  const [kind, id = "", ...rest] = item.split(":");
  if (rest.length) return false;
  return kind === "b" ? BENEFITS.some((b) => b.id === id) : kind === "x" ? !!extraById(id) : false;
}
