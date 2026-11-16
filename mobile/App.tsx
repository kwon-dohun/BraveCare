// 씩씩케어 Android 앱. 화면은 웹(Next.js)을 그대로 보여주고, 앱만 할 수 있는 일(저녁 8시 알림, 알림에서 바로 기록)만 여기서 한다.
// 화면을 한 벌만 유지하려는 선택이다. 디자인을 바꿀 때 웹만 고치면 앱도 같이 바뀐다.
import { useEffect, useRef } from 'react';
import { BackHandler, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// 개발 중에는 mobile/.env의 EXPO_PUBLIC_WEB_URL로 바꾼다 (에뮬레이터에서 내 PC는 http://10.0.2.2:3100)
const BASE = (process.env.EXPO_PUBLIC_WEB_URL ?? 'https://bravecare-kr.vercel.app').replace(/\/$/, '');
const KEY = 'bravecare:path'; // 내 화면 주소(/c/<토큰 또는 구성원 ID>). 로그인이 없어서 이 주소가 열쇠다
const OK = 'allgood';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

async function setUpReminder() {
  // Android 13 이상은 채널이 있어야 권한 창이 뜬다
  await Notifications.setNotificationChannelAsync('daily', { name: '저녁 안부 체크', importance: Notifications.AndroidImportance.HIGH });
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  await Notifications.setNotificationCategoryAsync('daily', [
    // 버튼을 누르면 앱이 열리면서 기록된다. 앱을 열지 않고 기록하는 방식은 앱이 꺼져 있을 때 누락될 수 있어 쓰지 않았다
    { identifier: OK, buttonTitle: '약 다 먹었고 특이사항 없음', options: { opensAppToForeground: true } },
  ]);
  await Notifications.cancelAllScheduledNotificationsAsync(); // 켤 때마다 다시 잡아 중복을 막는다
  await Notifications.scheduleNotificationAsync({
    content: { title: '씩씩케어', body: '오늘 하루는 어땠나요? 저녁 안부 체크를 남겨주세요.', categoryIdentifier: 'daily' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 20, minute: 0, channelId: 'daily' },
  });
}

// 웹이 기억해 둔 마지막 화면 주소를 앱으로 넘긴다
const REPORT_PATH = `try { var v = JSON.parse(localStorage.getItem('toewon:last') || 'null'); if (v && v.path) window.ReactNativeWebView.postMessage(v.path); } catch (e) {} true;`;

export default function App() {
  const web = useRef<WebView>(null);
  const canGoBack = useRef(false);

  useEffect(() => {
    setUpReminder().catch(() => {});

    const onResponse = async (r: Notifications.NotificationResponse) => {
      const path = await AsyncStorage.getItem(KEY);
      if (!path?.startsWith('/c/')) return;
      if (r.actionIdentifier === OK) {
        await fetch(`${BASE}/api/quick-check`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: path.slice(3) }),
        }).catch(() => {});
      }
      web.current?.injectJavaScript(`location.href = ${JSON.stringify(`${BASE}${path}/daily`)}; true;`);
    };
    // 앱이 꺼진 상태에서 알림을 눌러 켜진 경우
    const last = Notifications.getLastNotificationResponse();
    if (last) setTimeout(() => onResponse(last), 1500);
    const sub = Notifications.addNotificationResponseReceivedListener(onResponse);

    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack.current) return false;
      web.current?.goBack();
      return true;
    });
    return () => { sub.remove(); back.remove(); };
  }, []);

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
          onMessage={(e) => { const p = e.nativeEvent.data; if (/^\/c\/([0-9a-f]{32}|[0-9a-f-]{36})$/.test(p)) AsyncStorage.setItem(KEY, p); }}
          // 전화·문자·외부 사이트·캘린더 파일은 휴대폰의 기본 앱으로 넘긴다
          onShouldStartLoadWithRequest={(req) => {
            const inside = req.url.startsWith(BASE) && !req.url.includes('/ics/');
            if (!inside && req.url !== 'about:blank') Linking.openURL(req.url).catch(() => {});
            return inside || req.url === 'about:blank';
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
  offline: { ...StyleSheet.absoluteFillObject, backgroundColor: '#f4faf7', alignItems: 'center', justifyContent: 'center', padding: 32 },
  face: { width: 96, height: 88, borderRadius: 48, backgroundColor: '#62deae', alignItems: 'center', justifyContent: 'center' },
  eyes: { flexDirection: 'row', gap: 20, marginTop: 6 },
  eye: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#0b3d2e' },
  title: { marginTop: 24, fontSize: 20, fontWeight: '700', color: '#15302a' },
  body: { marginTop: 8, fontSize: 15, lineHeight: 22, color: '#5f716a', textAlign: 'center' },
  button: { marginTop: 24, alignSelf: 'stretch', borderRadius: 999, backgroundColor: '#62deae', paddingVertical: 14, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#0b3d2e' },
});
