// iOS 유니버설 링크. APPLE_TEAM_ID는 애플 개발자 계정의 팀 ID.
export function GET() {
  const team = process.env.APPLE_TEAM_ID;
  return Response.json({
    applinks: { details: team ? [{ appIDs: [`${team}.app.bravecare.mobile`], components: [{ "/": "/j/*" }, { "/": "/c/*" }] }] : [] },
  });
}
