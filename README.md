# 씩씩케어 (BraveCare)

> **수술·입원 후 퇴원 골든타임부터 정기 외래까지, 맞벌이 가족을 위한 회복 관리 및 역할 분담 플랫폼**

<p align="left">
  <img src="https://img.shields.io/badge/Next.js-16.0-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/React%20Native-Expo%2052-000020?style=flat-square&logo=expo" alt="React Native Expo" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel" alt="Vercel" />
</p>

- 🌐 **공식 배포 웹 서비스**: [https://bravecare-kr.vercel.app](https://bravecare-kr.vercel.app)
- 📋 **노션 기획서 (PRD v3.4)**: [BraveCare PRD Notion](https://app.notion.com/p/BraveCare-419575b2d5528070b2dcd256a85e373c)
- 📱 **모바일 앱 프로젝트**: `mobile/` (React Native Expo Android Shell)

---

## 💡 프로젝트 개요

병원은 보통 퇴원 전날(D-1) 오후나 당일 아침에 갑작스럽게 퇴원을 통보합니다.  
경황이 없는 환자와 맞벌이 보호자는 **"지금 당장 무슨 서류를 떼야 하는지, 어떤 정부 지원을 받을 수 있는지, 퇴원 후 간병은 가족끼리 어떻게 나눠야 하는지"** 혼란에 빠집니다.

**씩씩케어(BraveCare)**는 복잡한 회원가입이나 앱 설치의 장벽 없이, **단 5문항의 온보딩으로 우리 가족이 받을 수 있는 26종 복지 혜택과 퇴원 타임라인을 매칭**하고, **가족 간 역할을 링크 하나로 분담**하여 정기 외래 완치까지 함께 회복을 돕는 모바일 헬스케어 서비스입니다.

---

## ✨ 핵심 기능

### 1. 📋 5문항 온보딩 & 2026 복지 룰 엔진
- **부담 없는 5문항**: 입원 사유, 퇴원일(미정 가능), 연령·거주지, 낮 시간 돌봄 공백 여부, 대략의 소득 구간만 묻습니다.
- **26종 공공 복지 매칭**: 2026년 최신 보건복지부·지자체 가이드라인을 기반으로 `대상 가능성 높음` / `소득 확인 필요` / `해당 없음`을 즉시 판정합니다.
- **실손24 & 원무과 서류 4종 체크**: 퇴원 전 놓치면 재방문해야 하는 필수 서류를 자동으로 챙겨줍니다.

### 2. 📅 퇴원 골든타임 타임라인 & 캘린더 연동 (.ics)
- **4단계 회복 사이클**: `퇴원 전 준비` → `퇴원 당일` → `집에서 회복 및 첫 외래` → `정기 외래 및 재활`
- **퇴원일 미정 유연 대응**: 퇴원일이 확정되지 않아도 "퇴원 3일 전" 상대 일정으로 안내하며, 날짜 확정 시 일괄 자동 재계산됩니다.
- **개인정보 없는 스마트 캘린더**: 전화번호를 수집하지 않고, 담당 태스크를 `.ics` 파일로 다운로드하여 기기 캘린더에 **전날 20:00 및 당일 08:30 이중 알람(`VALARM`)**을 등록합니다.

### 3. 👨‍👩‍👧‍👦 가입 없는 가족 역할 분담 (Capability URL)
- 카카오톡 단톡방에 공유 링크(7일 유효)를 보내면, 다른 가족들은 **앱 설치나 로그인 없이** 브라우저에서 즉시 참여합니다.
- 가족들은 `[내가 할게]` 버튼으로 태스크를 맡고 완료 체크할 수 있으며, 환자 기본 정보는 훼손할 수 없도록 권한이 분리되어 있습니다.

### 4. 📸 비전 AI 서류 스캔 & 환각 차단 챗봇
- 퇴원 안내문·약봉투·영수증 사진(최대 3장) 또는 병원 안내 알림톡 문자를 분석하여 진료 일정과 할 일을 자동 추출합니다.
- **Fact Verification 파이프라인**: AI의 의료 판단을 원천 배제하며, 추출된 텍스트 원문에 실제로 존재하는 문장만 할 일로 등록됩니다.
- 응급 키워드 감지 시 119 긴급 안내를 최우선으로 출력합니다.

### 5. 📊 저녁 안부 체크 & 진료실 외래 리포트
- **10초 안부 체크**: 복약 여부, 체온, 통증 점수(0~10), 배변 상태를 하루 1회 기록합니다.
- **가로 모드 진료실 리포트**: 첫 외래 진료 시 의사 선생님께 스마트폰을 가로로 돌려 보여줄 수 있는 직관적인 1장 요약 리포트를 제공합니다.

### 6. 🔔 안드로이드 네이티브 앱 셸 (`mobile/`)
- 매일 저녁 8시, 복약 및 통증 체크를 잊지 않도록 **네이티브 로컬 푸시 알림**을 스케줄링합니다.
- 토스(Toss)식 하이브리드 앱 셸 구조로 웹의 유연성과 네이티브 하드웨어 알림의 장점을 결합했습니다.

---

## 🏗 시스템 아키텍처

```mermaid
flowchart TD
    subgraph Mobile ["📱 Mobile App (Android)"]
        ExpoApp["React Native Expo Shell\n(mobile/App.tsx)"]
        PushNotification["Local Push Notification\n(expo-notifications / 20:00)"]
    end

    subgraph Web ["🌐 Frontend & Server (Next.js 16)"]
        WebViewUI["Responsive Web UI\n(React 19 / Tailwind CSS)"]
        ServerActions["Next.js Server Actions\n(app/actions.ts, scan-actions.ts)"]
        WelfareEngine["26 Welfare Rule Engine\n(lib/benefits.ts)"]
        ICSGenerator["iCalendar Engine\n(lib/ics.ts / VALARM)"]
    end

    subgraph External ["☁️ Cloud & AI Services"]
        Supabase[("Supabase (PostgreSQL)\n5 Core Tables")]
        OpenAI["OpenAI GPT-4o\nVision OCR & Strict Verifier"]
    end

    ExpoApp -->|Webview Container| WebViewUI
    ExpoApp -->|Native Alarm| PushNotification
    WebViewUI --> ServerActions
    ServerActions --> WelfareEngine
    ServerActions --> ICSGenerator
    ServerActions -->|Secure Service Role| Supabase
    ServerActions -->|OCR & Fact Check| OpenAI
```

---

## 📂 디렉터리 구조

```text
bravecare/
├── app/                      # Next.js 16 App Router (페이지 및 서버 액션)
│   ├── actions.ts            # 케이스 관리 및 가족 분담 서버 액션
│   ├── scan-actions.ts       # 서류 비전 OCR 및 검증 서버 액션
│   ├── c/[token]/            # 관리자 메인 화면 (타임라인, 안부, 리포트)
│   ├── j/[token]/            # 가족 초대 진입 경로
│   └── m/[memberId]/         # 가족 전용 역할 분담 화면
├── components/               # 재사용 가능한 UI 컴포넌트
│   ├── daily-check.tsx       # 저녁 안부 체크 모달
│   ├── clinic-report.tsx     # 진료실 가로 모드 리포트
│   └── timeline.tsx          # 4단계 퇴원 타임라인
├── lib/                      # 핵심 비즈니스 로직 및 유틸리티
│   ├── benefits.ts           # 2026 복지 26종 결정론적 룰 엔진
│   ├── benefit-list.ts       # 26종 복지 제도 마스터 데이터
│   ├── ics.ts                # 스마트폰 캘린더 .ics 이중 알람 생성기
│   ├── extract.ts            # 서류 Vision OCR 및 환각 방지 검증기
│   └── chat.ts               # 서류 기반 안전 챗봇 로직
├── mobile/                   # Android Expo 네이티브 앱 프로젝트
│   ├── App.tsx               # 하이브리드 웹뷰 및 네이티브 푸시 알림
│   ├── app.json              # Expo 앱 설정 (패키지명, 권한)
│   └── package.json          # 모바일 종속성 (react-native-webview 등)
├── supabase/
│   └── schema.sql            # PostgreSQL 테이블 정의 및 인덱스
└── README.md
```

---

## 🛡 설계 원칙 (Security & Privacy)

1. **AI의 의료 판단 원천 배제**:
   - 서류 추출과 챗봇 모두 모델의 자유 생성을 불허하며, 원문 텍스트에 실제 존재하는 문장만 엄격히 통과시킵니다(`verifyItems`, `verifyAnswer`).
2. **Privacy-by-Design (사진 미저장)**:
   - 환자의 주민등록번호 뒷자리는 자동 마스킹되며, 원본 사진은 서버에 저장하지 않고 파싱된 텍스트만 보관합니다.
3. **결정론적 복지 룰 엔진**:
   - 복지 제도는 AI의 추론이 아닌 투명한 검증 규칙표(`lib/benefits.ts`)로만 판정합니다. 소득을 모를 경우 불이익을 주지 않고 `소득 확인 필요`로 분류합니다.
4. **No-Login Capability Token**:
   - 가입 절차 없이 난수 토큰 기반의 URL(`/c/<토큰>`, `/j/<토큰>`) 자체가 보안 키 역할을 수행합니다.

---

## 🚀 빠른 시작 (Getting Started)

### 1. 웹 서비스 (Web)

```bash
# 종속성 설치
npm install

# 환경 변수 설정 (.env.local 생성)
# NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# GPT_API_KEY=your-openai-api-key

# 개발 서버 실행
npm run dev
```

### 2. 안드로이드 모바일 앱 (Android App)

```bash
cd mobile

# 앱 종속성 설치
npm install

# Android 에뮬레이터 또는 실기기 실행
npx expo start --android
```

### 3. 테스트 실행

```bash
# 26종 복지 판정 규칙, 캘린더 생성, 서류 검증 등 29개 유닛 테스트 수행
npm test
```

---

## 📋 기획서(PRD v3.4) 대비 기술적 구현 차이

| 항목 | 기획서 (PRD 초안) | 실제 구현 (Production) | 엔지니어링 의사결정 사유 |
| :--- | :--- | :--- | :--- |
| **앱 아키텍처** | React Native 네이티브 컴포넌트 이원화 | Next.js 웹 코어 + Expo 네이티브 셸 | 단일 코드베이스로 빠른 UI 개선과 스토어 심사 없는 즉시 업데이트 보장 |
| **권한 관리** | Supabase Auth + RLS | Server Actions + Capability Token | 무가입 환자/가동 환경에 맞춰 공개 키 접근을 차단하고 서버 액션에서 안전하게 검증 |
| **서류 보관** | 암호화 스토리지 버킷 | 텍스트만 추출 후 원본 즉시 폐기 | 의료 서류 사진 유출 위험을 원천 차단하는 Privacy-by-Design 달성 |
| **복지 제도** | 기획 25종 | **공식 출처 재검증 26종** | 2026년 상병수당, 서울형 입원비 등 정부 공고 변경 사항을 전수 정밀 반영 |

---

## 📄 라이선스

This project is licensed under the MIT License.
