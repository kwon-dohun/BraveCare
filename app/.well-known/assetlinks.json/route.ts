// Android 앱 링크: 초대 링크(/j/…)와 내 화면(/c/…)을 앱이 깔려 있으면 앱으로 연다.
// ANDROID_CERT_SHA256에는 앱 서명 인증서 지문을 넣는다(`eas credentials`에서 확인, 여러 개면 쉼표로).
export function GET() {
  const prints = (process.env.ANDROID_CERT_SHA256 ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return Response.json(prints.length ? [{
    relation: ["delegate_permission/common.handle_all_urls"],
    target: { namespace: "android_app", package_name: "app.bravecare.mobile", sha256_cert_fingerprints: prints },
  }] : []);
}
