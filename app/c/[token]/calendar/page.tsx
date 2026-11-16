import { redirect } from "next/navigation";

export const metadata = { title: "일정·할 일 · 씩씩케어" };

// 기존 /calendar 경로 호환: 일정과 할 일이 통합된 /tasks?view=calendar 로 리다이렉트
export default async function CalendarRedirect(props: PageProps<"/c/[token]/calendar">) {
  const { token } = await props.params;
  const sp = await props.searchParams;
  const q = new URLSearchParams();
  q.set("view", "calendar");
  if (sp.d && typeof sp.d === "string") q.set("d", sp.d);
  if (sp.m && typeof sp.m === "string") q.set("m", sp.m);
  redirect(`/c/${token}/tasks?${q.toString()}`);
}
