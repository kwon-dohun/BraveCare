import { NextResponse } from "next/server";
import { searchSilsonHospitals } from "@/lib/silson";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  if (q.trim().length < 2) {
    return NextResponse.json({ ok: false, message: "검색어를 2글자 이상 입력해주세요", hospitals: [] });
  }

  try {
    const res = await searchSilsonHospitals(q);
    return NextResponse.json({ ok: true, ...res });
  } catch {
    return NextResponse.json({ ok: false, message: "조회 중 오류가 발생했어요", hospitals: [] }, { status: 500 });
  }
}
