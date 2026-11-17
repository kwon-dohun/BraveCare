// 씩씩케어 앱. 화면은 웹(Next.js)을 그대로 보여주고, 앱만 할 수 있는 일(알림, 초대 링크 열기, 화면 밝기, 문서 스캐너, 공유창)만 여기서 한다.
// 화면을 한 벌만 유지하려는 선택이다. 디자인을 바꿀 때 웹만 고치면 앱도 같이 바뀐다.
import { useEffect, useRef } from 'react';
import { AppState, BackHandler, Linking, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Brightness from 'expo-brightness';

// Expo Go 등 네이티브 스캐너 모듈이 없는 환경을 위한 안전한 로드
let DocumentScanner: any = null;
let ResponseType: any = { Base64: 'base64' };
try {
  const mod = require('react-native-document-scanner-plugin');
  DocumentScanner = mod.default ?? mod;
  if (mod.ResponseType) ResponseType = mod.ResponseType;
} catch {
  // Expo Go에서는 웹 브라우저의 사진 선택(input type=file)으로 자동 대체됨
}

// 개발 중에는 mobile/.env의 EXPO_PUBLIC_WEB_URL로 바꾼다 (에뮬레이터에서 내 PC는 http://10.0.2.2:3100)
const BASE = (process.env.EXPO_PUBLIC_WEB_URL ?? 'https://bravecare-kr.vercel.app').replace(/\/$/, '');
const KEY = 'bravecare:path'; // 내 화면 주소(/c/<토큰 또는 구성원 ID>). 로그인이 없어서 이 주소가 열쇠다
const OK = 'allgood';
const inside = (url: string) => url === BASE || url.startsWith(`${BASE}/`);

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

async function setUpNotifications() {
  // Android 13 이상은 채널이 있어야 권한 창이 뜬다. 종류별로 나눠 두면 휴대폰 설정에서 따로 끌 수 있다.
  await Notifications.setNotificationChannelAsync('daily', { name: '데일리 체크', importance: Notifications.AndroidImportance.HIGH });
  await Notifications.setNotificationChannelAsync('tasks', { name: '할 일·지원 마감', importance: Notifications.AndroidImportance.HIGH });
  await Notifications.setNotificationChannelAsync('family', { name: '가족 소식', importance: Notifications.AndroidImportance.DEFAULT });
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  await Notifications.setNotificationCategoryAsync('daily', [
    // 버튼을 누르면 앱이 열리면서 기록된다. 앱을 열지 않고 기록하는 방식은 앱이 꺼져 있을 때 누락될 수 있어 쓰지 않았다
    { identifier: OK, buttonTitle: '약 다 먹었고 특이사항 없음', options: { opensAppToForeground: true } },
  ]);
  await sync();
}

// 예약 알림을 다시 잡는다: 매일 저녁 8시 안부 + 서버가 알려 준 할 일·지원 마감. 앱을 켤 때와 다시 돌아올 때마다 부른다.
// 휴대폰에 예약해 두는 방식이라 푸시 서버 없이도 제시간에 울린다. 가족이 방금 한 일만 서버 푸시로 온다.
async function sync() {
  if ((await Notifications.getPermissionsAsync()).status !== 'granted') return;
  const path = await AsyncStorage.getItem(KEY);
  let reminders: { title: string; body: string; at: string; path: string }[] = [];
  let daily = true;
  if (path) {
    let pushToken: string | undefined;
    try { pushToken = (await Notifications.getExpoPushTokenAsync()).data; } catch {} // 푸시 설정(FCM·APNs) 전이면 예약 알림만 쓴다
    const r = await fetch(`${BASE}/api/app`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: path.slice(3), pushToken }),
    }).then((x) => x.json()).catch(() => null);
    if (!r?.ok) return; // 인터넷이 없으면 잡아 둔 알림을 그대로 둔다
    reminders = r.reminders;
    daily = r.daily !== false; // 예전 서버는 이 값을 안 보내므로 없으면 켠다
  }
  await Notifications.cancelAllScheduledNotificationsAsync(); // 매번 다시 잡아 중복을 막는다
  if (daily) await Notifications.scheduleNotificationAsync({
    content: { title: '씩씩케어', body: '오늘 하루는 어땠나요? 데일리 체크를 남겨주세요.', categoryIdentifier: 'daily' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 20, minute: 0, channelId: 'daily' },
  });
  for (const m of reminders) {
    await Notifications.scheduleNotificationAsync({
      content: { title: m.title, body: m.body, data: { path: m.path } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(m.at), channelId: 'tasks' },
    });
  }
}

// 외래 리포트를 보여주는 동안만 화면을 가장 밝게
let dimmer = 0.5;
async function bright(on: boolean) {
  try {
    if (on) { dimmer = await Brightness.getBrightnessAsync(); await Brightness.setBrightnessAsync(1); }
    else if (Platform.OS === 'android') await Brightness.restoreSystemBrightnessAsync();
    else await Brightness.setBrightnessAsync(dimmer);
  } catch {}
}

// 웹이 기억해 둔 마지막 화면 주소를 앱으로 넘긴다
const REPORT_PATH = `try { var v = JSON.parse(localStorage.getItem('toewon:last') || 'null'); if (v && v.path) window.ReactNativeWebView.postMessage(v.path); } catch (e) {} true;`;

export default function App() {
  const web = useRef<WebView>(null);
  const canGoBack = useRef(false);

  useEffect(() => {
    setUpNotifications().catch(() => {});
    const go = (url: string) => web.current?.injectJavaScript(`location.href = ${JSON.stringify(url)}; true;`);

    const onResponse = async (r: Notifications.NotificationResponse) => {
      const path = await AsyncStorage.getItem(KEY);
      if (!path?.startsWith('/c/')) return;
      if (r.actionIdentifier === OK) {
        await fetch(`${BASE}/api/quick-check`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: path.slice(3) }),
        }).catch(() => {});
      }
      // 할 일·지원 마감·가족 소식 알림은 그 화면으로, 저녁 안부 알림은 안부 화면으로
      const sub = r.notification.request.content.data?.path;
      go(`${BASE}${path}${typeof sub === 'string' && sub.startsWith('/') ? sub : '/daily'}`);
    };
    // 앱이 꺼진 상태에서 알림을 눌러 켜진 경우
    const last = Notifications.getLastNotificationResponse();
    if (last) setTimeout(() => onResponse(last), 1500);
    const sub = Notifications.addNotificationResponseReceivedListener(onResponse);

    // 초대 링크(/j/…)나 내 화면 링크를 눌러 앱이 열린 경우
    const open = (url?: string | null) => { if (url && inside(url)) go(url); };
    Linking.getInitialURL().then((u) => setTimeout(() => open(u), 1500)).catch(() => {});
    const link = Linking.addEventListener('url', (e) => open(e.url));
    // 다른 앱에 갔다 돌아오면 그사이 바뀐 할 일로 알림을 다시 잡는다
    const state = AppState.addEventListener('change', (st) => { if (st === 'active') sync().catch(() => {}); });

    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack.current) return false;
      web.current?.goBack();
      return true;
    });
    return () => { sub.remove(); back.remove(); link.remove(); state.remove(); };
  }, []);

  // 휴대폰의 문서 스캐너(가장자리를 찾아 반듯하게 잘라 줌)로 찍어 웹 화면에 넘긴다
  const scan = async (max: number) => {
    try {
      if (!DocumentScanner?.scanDocument) return;
      const r = await DocumentScanner.scanDocument({ maxNumDocuments: max, responseType: ResponseType.Base64, croppedImageQuality: 70 });
      const shots = (r.scannedImages ?? []).slice(0, max);
      if (shots.length) web.current?.injectJavaScript(`window.dispatchEvent(new CustomEvent('bravecare:scan', { detail: ${JSON.stringify(shots)} })); true;`);
    } catch {}
  };

  const onMessage = (data: string) => {
    if (/^\/c\/([0-9a-f]{32}|[0-9a-f-]{36})$/.test(data)) {
      // 내 화면 주소가 처음 정해지거나 바뀌면 알림을 그 가족 기준으로 다시 잡는다
      AsyncStorage.getItem(KEY).then((prev) => { if (prev !== data) AsyncStorage.setItem(KEY, data).then(sync).catch(() => {}); });
      return;
    }
    let m: { t?: string; on?: boolean; max?: number; text?: string; url?: string };
    try { m = JSON.parse(data); } catch { return; }
    if (m.t === 'bright') bright(!!m.on);
    else if (m.t === 'scan') scan(Math.min(3, Number(m.max) || 3));
    else if (m.t === 'share' && typeof m.url === 'string' && inside(m.url)) Share.share({ message: `${m.text ?? ''} ${m.url}`.trim() }).catch(() => {});
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.fill}>
        <StatusBar style="dark" />
        <WebView
          ref={web}
          source={{ uri: BASE }}
          style={styles.fill}
          domStorageEnabled
          injectedJavaScript={REPORT_PATH}
          onLoadEnd={() => web.current?.injectJavaScript(REPORT_PATH)}
          onNavigationStateChange={(s) => { canGoBack.current = s.canGoBack; web.current?.injectJavaScript(REPORT_PATH); }}
          onMessage={(e) => onMessage(e.nativeEvent.data)}
          // 전화·문자·외부 사이트·캘린더 파일은 휴대폰의 기본 앱으로 넘긴다
          onShouldStartLoadWithRequest={(req) => {
            // 카카오 로그인 화면은 앱 안에서 열어야 로그인 뒤 다시 돌아온다
            const stay = (inside(req.url) && !req.url.includes('/ics/')) || /^https:\/\/(kauth|accounts|logins)\.kakao\.com\//.test(req.url);
            if (!stay && req.url !== 'about:blank') Linking.openURL(req.url).catch(() => {});
            return stay || req.url === 'about:blank';
          }}
          // 인터넷이 끊기면 웹뷰 기본 오류 화면 대신 씩씩케어 안내를 보여준다
          renderError={() => <Offline onRetry={() => web.current?.reload()} />}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Offline({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.offline}>
      {/* 씩씩이를 원 두 개와 점으로 단순하게: 웹의 SVG 캐릭터와 같은 색 */}
      <View style={styles.face}>
        <View style={styles.eyes}><View style={styles.eye} /><View style={styles.eye} /></View>
      </View>
      <Text style={styles.title}>인터넷 연결을 확인해 주세요</Text>
      <Text style={styles.body}>와이파이나 데이터가 켜져 있는지 본 다음 다시 시도해 주세요. 남긴 기록은 그대로 있어요.</Text>
      <Pressable onPress={onRetry} style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]} accessibilityRole="button">
        <Text style={styles.buttonText}>다시 시도하기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#f4faf7' },
  offline: { ...StyleSheet.absoluteFill, backgroundColor: '#f4faf7', alignItems: 'center', justifyContent: 'center', padding: 32 },
  face: { width: 96, height: 88, borderRadius: 48, backgroundColor: '#62deae', alignItems: 'center', justifyContent: 'center' },
  eyes: { flexDirection: 'row', gap: 20, marginTop: 6 },
  eye: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#0b3d2e' },
  title: { marginTop: 24, fontSize: 20, fontWeight: '700', color: '#15302a' },
  body: { marginTop: 8, fontSize: 15, lineHeight: 22, color: '#5f716a', textAlign: 'center' },
  button: { marginTop: 24, alignSelf: 'stretch', borderRadius: 999, backgroundColor: '#62deae', paddingVertical: 14, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#0b3d2e' },
});
