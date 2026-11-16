import { redirect } from "next/navigation";

export const metadata = { title: "일정 · 씩씩케어" };

// 기존 /calendar 경로 호환: 일정 탭(/tasks)으로 리다이렉트
export default async function CalendarRedirect(props: PageProps<"/c/[token]/calendar">) {
  const { token } = await props.params;
  const sp = await props.searchParams;
  const q = new URLSearchParams();
  if (sp.d && typeof sp.d === "string") q.set("d", sp.d);
  if (sp.m && typeof sp.m === "string") q.set("m", sp.m);
  const qs = q.toString();
  redirect(`/c/${token}/tasks${qs ? `?${qs}` : ""}`);
}
