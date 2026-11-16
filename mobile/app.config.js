// app.json 위에 얹는 설정. EAS 클라우드 빌드에서는 깃에 없는 google-services.json을 비밀 파일 변수(GOOGLE_SERVICES_JSON)로 받는다.
// 내 PC에서 빌드할 때는 변수가 없어 mobile/google-services.json을 쓴다.
module.exports = ({ config }) => ({
  ...config,
  android: { ...config.android, googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json' },
});
