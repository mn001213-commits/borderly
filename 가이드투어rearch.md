# Borderly 가이드 투어 시스템 — 완전 분석 보고서

> 작성일: 2026-04-06  
> 분석 대상: `app/components/GuideTour.tsx`, `app/components/AuthProvider.tsx`, `app/components/AuthLayout.tsx`, `app/onboarding/page.tsx`, `app/components/OnboardingSuccess.tsx`, `app/settings/page.tsx`, `app/signup/page.tsx`

---

## 1. 전체 구조 개요

Borderly의 신규 사용자 경험(NUX)은 **3단계 파이프라인**으로 구성된다.

```
[1단계] 회원가입(signup)
        ↓
[2단계] 온보딩 마법사(onboarding)  →  OnboardingSuccess 모달
        ↓
[3단계] 가이드 투어(GuideTour)     →  4스텝 인터랙티브 오버레이
```

각 단계는 **localStorage 플래그(`borderly_guide_pending`)** 와 **Supabase user_metadata(`guide_tour_completed`)** 두 가지 저장소로 상태를 공유한다.

---

## 2. 관련 파일 전체 목록

| 파일 경로 | 역할 |
|-----------|------|
| `app/components/GuideTour.tsx` | 가이드 투어 오버레이 UI (429줄) |
| `app/components/AuthProvider.tsx` | 인증 컨텍스트 + guideTourCompleted 상태 관리 (131줄) |
| `app/components/AuthLayout.tsx` | GuideTour 마운트 위치, 온보딩 리다이렉트 제어 (66줄) |
| `app/components/OnboardingSuccess.tsx` | 온보딩 완료 축하 모달 (95줄) |
| `app/onboarding/page.tsx` | 5~6단계 프로필 설정 마법사 (871줄) |
| `app/onboarding/ngo/page.tsx` | NGO 단체 신청 폼 |
| `app/onboarding/ngo/pending/page.tsx` | NGO 승인 대기 페이지 |
| `app/onboarding/purpose/page.tsx` | 추가 사용 목적 선택 (선택사항) |
| `app/signup/page.tsx` | 회원가입 폼 (플래그 최초 설정 포함) |
| `app/settings/page.tsx` | 가이드 투어 재시작 기능 |
| `app/api/ngo-onboarding/route.ts` | NGO 신청 API |
| `app/api/ngo-approve/route.ts` | NGO 승인/거절 API |
| `app/api/ngo-request/route.ts` | 관리자 이메일 알림 API |

---

## 3. 상태 저장소 설계

### 3.1 localStorage 플래그

```
키:  "borderly_guide_pending"
값:  "true" (문자열)
```

- **쓰는 곳 3곳**:
  1. `app/signup/page.tsx:355` — 이메일 회원가입 완료 시 (NGO 제외)
  2. `app/onboarding/page.tsx:270` — 이미 완성된 프로필로 `/onboarding` 진입 시 (엣지 케이스)
  3. `app/onboarding/page.tsx:433` — 온보딩 마법사 최종 완료 시 (주 경로)
  4. `app/settings/page.tsx:119` — 사용자가 "Restart Guide Tour" 클릭 시

- **읽는 곳**: `GuideTour.tsx:88` — 투어 시작 조건 판단
- **삭제 시점**: `GuideTour.tsx:92` — 투어가 활성화될 때 즉시 제거 (중복 실행 방지)

### 3.2 Supabase user_metadata

```
키:  guide_tour_completed
값:  true (boolean)
저장: supabase.auth.updateUser({ data: { guide_tour_completed: true } })
읽기: authUser.user_metadata?.guide_tour_completed === true
```

- **쓰는 곳**: `AuthProvider.tsx:41` (`completeGuideTour` 함수 내부)
- **리셋**: `settings/page.tsx:118` — `guide_tour_completed: false` 로 덮어씀
- **특성**: 계정에 바인딩 → 다른 기기에서도 완료 상태 유지

### 3.3 React 컴포넌트 상태 (in-memory)

| 변수 | 위치 | 역할 |
|------|------|------|
| `user.guideTourCompleted` | AuthProvider state | 투어 표시 여부 결정 |
| `active` | GuideTour state | 투어 오버레이 마운트 여부 |
| `visible` | GuideTour state | CSS opacity (fade in/out) |
| `currentStep` | GuideTour state | 현재 스텝 인덱스 (0~3) |
| `isDesktop` | GuideTour state | 반응형 분기 (≥1280px) |
| `navRect` | GuideTour state | 하이라이트할 nav 아이템 위치 |
| `checkedRef` | GuideTour ref | 중복 체크 방지 (한 번만 실행) |

---

## 4. 컴포넌트 계층 구조

```
RootLayout (layout.tsx)
  └─ LangProvider
       └─ AuthProvider         ← user.guideTourCompleted 관리
            └─ AuthLayout      ← 온보딩 리다이렉트 + GuideTour 마운트
                 ├─ TopBar
                 ├─ <children>  (페이지 본문)
                 ├─ OnlineSidebar
                 ├─ BottomNav
                 └─ GuideTour   ← showFullLayout && !isChatRoom 조건
```

**AuthLayout.tsx:59** — `GuideTour`는 로그인 상태이고 채팅방이 아닌 모든 페이지에 마운트된다.

```tsx
// AuthLayout.tsx:55-61
{showFullLayout && !isChatRoom && (
  <>
    <OnlineSidebar />
    <BottomNav />
    <GuideTour />      {/* 항상 DOM에 존재하되, active=false면 null 반환 */}
  </>
)}
```

---

## 5. GuideTour.tsx 동작 완전 분석

### 5.1 투어 스텝 데이터 (`TOUR_STEPS`)

```typescript
const TOUR_STEPS: TourStep[] = [
  {
    titleKey: "guideTour.step1.title",   // "Community Feed"
    descKey:  "guideTour.step1.desc",
    mobileIcon: "🏠",
    desktopLabelKey: "nav.home",
    href: "/browse",
    anchorDesktop: "right-top",
    mobileNavIndex: 1,                   // BottomNav의 두 번째 아이템
  },
  {
    titleKey: "guideTour.step2.title",   // "Meet People"
    mobileIcon: "📅",
    desktopLabelKey: "nav.meet",
    href: "/meet",
    mobileNavIndex: 2,
  },
  {
    titleKey: "guideTour.step3.title",   // "Find Support"
    mobileIcon: "🏢",
    desktopLabelKey: "nav.ngo",
    href: "/ngo",
    mobileNavIndex: 4,                   // BottomNav의 다섯 번째 아이템
  },
  {
    titleKey: "guideTour.step4.title",   // "Your Profile"
    mobileIcon: "👤",
    desktopLabelKey: "nav.profile",
    href: "/profile",
    mobileNavIndex: -1,                  // 프로필은 TopBar에 있어 하이라이트 없음
  },
];
```

### 5.2 초기화 로직 (첫 번째 useEffect)

```typescript
// GuideTour.tsx:77-99
useEffect(() => {
  if (!user) return;              // 1. 사용자 로드 대기
  if (checkedRef.current) return; // 2. 중복 실행 방지 (ref로 한 번만)
  checkedRef.current = true;

  if (user.guideTourCompleted) return;  // 3. 이미 완료한 계정 제외

  const pending = localStorage.getItem("borderly_guide_pending") === "true";
  if (!pending) return;           // 4. 트리거 플래그 없으면 종료

  localStorage.removeItem("borderly_guide_pending");  // 5. 플래그 즉시 제거
  setActive(true);                // 6. 투어 활성화
  
  // 7. 반응형 상태 초기화
  const check = () => setIsDesktop(window.innerWidth >= 1280);
  check();
  window.addEventListener("resize", check);
  return () => window.removeEventListener("resize", check);
}, [user]);
```

**핵심 설계 원칙**:
- `checkedRef`를 사용해 `user` 객체가 리렌더링되어도 **단 한 번만** 체크
- localStorage 플래그를 **즉시 삭제**해 페이지 새로고침 시 재표시 방지
- `user.guideTourCompleted`는 Supabase에서 로드되므로 **계정-바운드** 완료 상태

### 5.3 투명도 애니메이션 (두 번째 useEffect)

```typescript
// GuideTour.tsx:101-105
useEffect(() => {
  if (!active) return;
  const t = setTimeout(() => setVisible(true), 100);  // 100ms 딜레이 후 fade in
  return () => clearTimeout(t);
}, [active]);
```

### 5.4 네비 아이템 위치 측정 (세 번째 useEffect)

```typescript
// GuideTour.tsx:107-134
useEffect(() => {
  if (!active || isDesktop) return;  // 모바일에서만 측정

  const navIndex = TOUR_STEPS[currentStep]?.mobileNavIndex;
  if (navIndex < 0) {
    // Step4 (프로필) — nav 아이템 없음, 중앙 정렬
    setNavRect(null);
    return;
  }

  const measure = () => {
    const el = document.getElementById(`bottom-nav-${navIndex}`);  // BottomNav DOM
    if (el) {
      const r = el.getBoundingClientRect();
      setNavRect({ left: r.left, width: r.width });
    }
    setViewportW(window.innerWidth);
  };

  const timer = setTimeout(measure, 50);  // 라우팅 후 DOM 렌더링 대기
  window.addEventListener("resize", measure);
  return () => { clearTimeout(timer); window.removeEventListener("resize", measure); };
}, [active, currentStep, isDesktop]);
```

**의존성**: BottomNav의 각 아이템이 `id="bottom-nav-{index}"` 속성을 가져야 함.

### 5.5 툴팁 위치 계산 알고리즘

```typescript
// 모바일 툴팁 좌측 위치 계산 (GuideTour.tsx:167-190)
const TOOLTIP_W = 260;   // 툴팁 너비 (px)
const TOOLTIP_MARGIN = 8; // 화면 가장자리 여백 (px)

if (step.mobileNavIndex >= 0 && navRect && viewportW > 0) {
  const navCenter = navRect.left + navRect.width / 2;    // nav 아이템 중심 x좌표
  const rawLeft = navCenter - TOOLTIP_W / 2;             // 툴팁을 nav 중심에 맞춘 left
  const maxLeft = viewportW - TOOLTIP_W - TOOLTIP_MARGIN; // 화면 오른쪽 경계
  const clamped = Math.max(TOOLTIP_MARGIN, Math.min(rawLeft, maxLeft)); // 클램핑

  tooltipLeft = `${clamped}px`;
  tooltipTransform = "none";
  arrowLeftPos = `${navCenter - clamped}px`;  // 화살표는 nav 중심을 정확히 가리킴
  glowLeft = `${navRect.left}px`;             // 하이라이트는 nav 아이템 전체 커버
  glowWidth = `${navRect.width}px`;
} else {
  // Step4 (프로필, TopBar) — 화면 중앙 정렬
  tooltipLeft = "50%";
  tooltipTransform = "translateX(-50%)";
  arrowLeftPos = "50%";
  glowLeft = "calc(50% - 32px)";
  glowWidth = "64px";
}
```

**설계 포인트**: 화살표(`arrowLeftPos`)는 툴팁 기준이 아닌 **뷰포트 기준 nav 중심점**으로 계산하여, 툴팁이 클램핑되어도 화살표가 정확히 nav 아이템을 가리킨다.

### 5.6 다음 스텝 이동 및 완료

```typescript
// GuideTour.tsx:136-152
const handleComplete = useCallback(() => {
  completeGuideTour(); // AuthProvider → Supabase user_metadata 저장
  setVisible(false);
  setTimeout(() => setActive(false), 300); // fade out 후 언마운트
}, [completeGuideTour]);

const handleNext = useCallback(() => {
  if (currentStep < TOUR_STEPS.length - 1) {
    const nextStep = TOUR_STEPS[currentStep + 1];
    setCurrentStep((s) => s + 1);
    router.push(nextStep.href); // 해당 페이지로 이동 → nav 아이템 하이라이트
  } else {
    handleComplete();           // 마지막 스텝: 완료 처리
    router.push(TOUR_STEPS[currentStep].href);
  }
}, [currentStep, router, handleComplete]);
```

### 5.7 렌더링 구조

**총 3개의 레이어**가 `fixed + z-index`로 겹쳐 렌더링된다:

```
z-9998: 어두운 반투명 배경 오버레이 (pointer-events: none)
z-9999: 툴팁 카드 (모바일 또는 데스크톱)
z-9997: 네비 아이템 하이라이트 글로우 (pointer-events: none, 모바일 전용)
```

---

## 6. 모바일 vs 데스크톱 UI 차이

### 모바일 (`window.innerWidth < 1280`)

```
위치: bottom: 80px (하단 네비 바로 위, 64px + 16px 여백)
너비: 260px 고정
카드: p-4, rounded-2xl, shadow-xl
화살표: 아래 방향 ▼ (nav 아이템 중심 가리킴)
글로우: nav 아이템 배경에 rgba(74,143,231,0.25) 파란 하이라이트
스텝 표시: "1 of 4" 형식 (i18n: guideTour.stepOf)
```

### 데스크톱 (`window.innerWidth >= 1280`)

```
위치: top: 80px, right: 360px (340px 사이드바 왼쪽)
너비: 300px 고정
카드: p-5, rounded-2xl, shadow-xl (더 큰 패딩)
화살표: 오른쪽 방향 ▶ (사이드바를 가리킴)
힌트 박스: "→ Sidebar: [nav 레이블]" 파란 배경 박스
스텝 표시: "Step 1 / 4" 형식 (하드코딩 영문)
```

### 공통 요소

- 진행률 바: `var(--primary)` 색상, `(currentStep+1)/4 * 100%` 너비
- Skip 버튼: X 아이콘 + "Skip tour" 텍스트 (둘 다 handleComplete 호출)
- Next/Finish 버튼: `var(--primary)` 배경, 마지막 스텝에서 "Get started!" 표시
- 애니메이션: `cubic-bezier(0.34, 1.56, 0.64, 1)` 바운스 커브, 300ms

---

## 7. OnboardingSuccess 컴포넌트 분석

**파일**: `app/components/OnboardingSuccess.tsx`  
**역할**: 온보딩 완료 직후 표시되는 축하 모달 (GuideTour 이전)

```
렌더링 조건: onboarding/page.tsx의 showSuccess === true
트리거: onComplete() 함수에서 Supabase 저장 성공 후 setShowSuccess(true)
닫기: "Explore Community →" 버튼 → handleSuccessContinue() → router.replace("/")
```

**내부 구성**:
1. 50ms 딜레이 후 `opacity: 0 → 1` fade in (backdrop blur 포함)
2. 🎉 그라데이션 원형 아이콘
3. "You're all set!" 타이틀
4. 미션 미리보기 3개 (모두 미완료 상태로 표시):
   - Write your first post
   - Join a meetup
   - Set a profile photo
5. "Explore Community →" CTA 버튼

**흐름**: OnboardingSuccess 닫기 → `router.replace("/")` → AuthLayout에서 GuideTour 실행

---

## 8. 온보딩 마법사 완전 분석

**파일**: `app/onboarding/page.tsx`

### 8.1 진입 조건

`AuthLayout.tsx:36-40`에서 `needsOnboarding === true`이면 `/onboarding`으로 강제 리다이렉트:

```typescript
useEffect(() => {
  if (!loading && user && needsOnboarding && !isOnboardingPage) {
    router.replace("/onboarding");
  }
}, [...]);
```

`needsOnboarding`은 `AuthProvider`에서 profiles 테이블의 필수 필드 완성 여부로 결정:
```typescript
// AuthProvider.tsx:70-77
const profileComplete = prof &&
  prof.display_name &&
  prof.residence_country &&
  prof.origin_country &&
  prof.languages?.length > 0 &&
  prof.use_purpose;

setNeedsOnboarding(!profileComplete);
```

### 8.2 사용자 타입별 분기

#### Google OAuth 사용자

```
Step 0 (Welcome Card) → Step 1 → Step 2 → ... → Step 5 또는 6
```
- Step 0은 Google 계정 확인 카드 (이메일 표시, "Get Started" 버튼)
- `needsDisplayName`이 항상 true (Google에서 display_name 없음)
- 따라서 총 6단계

#### 이메일 회원가입 사용자

```
Step 1 → Step 2 → Step 3 → Step 4 → Step 5
```
- Step 0 없음 (자동으로 step=1 설정)
- display_name이 이미 있으므로 `needsDisplayName = false`
- 총 5단계

### 8.3 스텝별 내용

| 스텝 | 제목 | 내용 | needsDisplayName 관련 |
|------|------|------|----------------------|
| 1 | UI Language | 영어/한국어/일본어 선택 | 공통 |
| 2 | Who are you? | Local / Foreigner / NGO 선택 | 공통 |
| 3 | Display Name | 이름 입력 (min 2자) | `needsDisplayName=true`만 |
| 3 또는 4 | Languages | 사용 언어 다중 선택 | 번호 다름 |
| 4 또는 5 | Where are you? | 거주국 + 출신국 선택 | 번호 다름 |
| 5 또는 6 | Purpose / NGO Info | 사용 목적 or NGO 단체 정보 | 마지막 단계 |

### 8.4 canNext() 검증 로직

```typescript
// needsDisplayName = true 경우 (6단계)
case 1: return true;                    // UI 언어 — 항상 통과
case 2: return true;                    // 사용자 타입 — 기본값 있음
case 3: return displayName.trim().length >= 2;
case 4: return languages.length >= 1;
case 5: return residenceCountry.length === 2 && originCountry.length === 2;
case 6:
  if (userType === "ngo")
    return orgName >= 2 && orgPurpose >= 5 && ngoPurpose >= 10;
  return purposes.length >= 1;

// needsDisplayName = false 경우 (5단계): 스텝 번호 -1
```

### 8.5 최종 저장 로직 (onComplete)

#### Non-NGO 경로
```typescript
// 1. Supabase profiles 테이블 upsert
await supabase.from("profiles").upsert({
  id: myId,
  display_name, languages, residence_country, origin_country,
  user_type: userType,
  use_purpose: finalPurposes,  // "other:설명" 형태로 변환 가능
});

// 2. 온보딩 완료 처리
completeOnboarding();  // needsOnboarding = false

// 3. 가이드 투어 플래그 설정
localStorage.setItem("borderly_guide_pending", "true");

// 4. OnboardingSuccess 모달 표시
setShowSuccess(true);
```

#### NGO 경로
```typescript
// 1. 기본 프로필 저장 (user_type: "ngo", ngo_verified: false)
await supabase.from("profiles").upsert({ ..., use_purpose: ["ngo_support"] });

// 2. NGO 신청 API 호출
await fetch("/api/ngo-onboarding", { ... });

// 3. 관리자 이메일 알림 (best-effort)
await fetch("/api/ngo-request", { ... });

// 4. 승인 대기 페이지로 이동 (가이드 투어 없음)
router.replace("/onboarding/ngo/pending");
```

### 8.6 Step 1 통과 시 locale 즉시 적용

```typescript
// onboarding/page.tsx:844-847
if (step === 1) {
  setLocale(uiLanguage);  // LangProvider의 전역 언어 변경
}
```

---

## 9. 가이드 투어 재시작 (Settings)

**파일**: `app/settings/page.tsx:117-121`

```typescript
const restartGuideTour = async () => {
  // 1. Supabase user_metadata 리셋
  await supabase.auth.updateUser({ data: { guide_tour_completed: false } });
  
  // 2. localStorage 플래그 재설정
  localStorage.setItem("borderly_guide_pending", "true");
  
  // 3. /browse 이동 (AuthProvider의 USER_UPDATED 이벤트 → 상태 재로드)
  window.location.href = "/browse";
};
```

**동작 시퀀스**:
1. `updateUser` 호출 → Supabase에서 `USER_UPDATED` 이벤트 발생
2. `AuthProvider`의 `onAuthStateChange` → `load()` 재실행
3. `user.guideTourCompleted`가 `false`로 갱신
4. `window.location.href`로 이동 → 페이지 완전 리로드
5. GuideTour의 `checkedRef`도 초기화됨 (컴포넌트 재마운트)
6. `user.guideTourCompleted = false` + `pending = true` → 투어 재시작

---

## 10. AuthProvider에서의 가이드 투어 상태 관리

```typescript
// AuthProvider.tsx:6-13
type AuthUser = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string | null;
  ngoVerified: boolean;
  guideTourCompleted: boolean;  // ← 가이드 투어 전용 필드
} | null;
```

```typescript
// AuthProvider.tsx:38-42
function completeGuideTour() {
  // 1. React 상태 즉시 업데이트 (UI 반응성)
  setUser((prev) => prev ? { ...prev, guideTourCompleted: true } : prev);
  
  // 2. Supabase에 비동기 저장 (계정-바운드 영속성)
  supabase.auth.updateUser({ data: { guide_tour_completed: true } }).catch(() => {});
}
```

```typescript
// AuthProvider.tsx:84 — 로그인 시 user_metadata에서 읽기
guideTourCompleted: authUser.user_metadata?.guide_tour_completed === true,
```

**설계 선택**: profiles 테이블이 아닌 `user_metadata`에 저장하는 이유:
- profiles 조회 없이 인증 응답 한 번으로 로드 가능
- 계정 삭제 시 자동 소멸 (profiles와 별도 관리 불필요)

---

## 11. i18n 키 목록

### 가이드 투어 키 (`guideTour.*`)

| 키 | 영어 | 한국어 | 일본어 |
|----|------|--------|--------|
| `guideTour.skip` | Skip tour | 건너뛰기 | スキップ |
| `guideTour.next` | Next | 다음 | 次へ |
| `guideTour.finish` | Get started! | 시작하기! | はじめよう！ |
| `guideTour.stepOf` | of | / | / |
| `guideTour.step1.title` | Community Feed | 커뮤니티 피드 | コミュニティフィード |
| `guideTour.step1.desc` | Browse posts... | 게시물 탐색... | 投稿を見る... |
| `guideTour.step2.title` | Meet People | 모임 참여 | 出会い |
| `guideTour.step3.title` | Find Support | 지원 단체 찾기 | サポートを探す |
| `guideTour.step4.title` | Your Profile | 나의 프로필 | あなたのプロフィール |
| `guideTour.step4.descDesktop` | (데스크톱 전용 설명) | (프로필 꾸미고...) | ... |

### 온보딩 성공 키 (`onboardingSuccess.*`)

| 키 | 영어 |
|----|------|
| `onboardingSuccess.title` | You're all set! 🎉 |
| `onboardingSuccess.subtitle` | Welcome to Borderly! |
| `onboardingSuccess.missionLabel` | What to do next |
| `onboardingSuccess.mission1` | Write your first post |
| `onboardingSuccess.mission2` | Join a meetup |
| `onboardingSuccess.mission3` | Set a profile photo |
| `onboardingSuccess.cta` | Explore Community → |

---

## 12. 데이터 흐름 전체 다이어그램

```
이메일 회원가입                    Google OAuth
       ↓                                ↓
signup/page.tsx                   signup/page.tsx
  - 프로필 생성 API                  - Supabase OAuth
  - localStorage:                    - 이메일 인증 불필요
    "borderly_guide_pending"="true"
       ↓
/signup/verify-email              /onboarding (step 0, Google Welcome)
       ↓                                ↓
이메일 링크 클릭 → 로그인           Step 1: UI Language
       ↓                                ↓
/onboarding 리다이렉트             Step 2: User Type
(needsOnboarding = true)                ↓
       ↓                          Step 3: Display Name (Google만)
Step 1: UI Language                     ↓
       ↓                          Step 4: Languages
Step 2: User Type                       ↓
       ↓                          Step 5: Countries
Step 3: Languages                       ↓
       ↓                          Step 6: Purpose / NGO Info
Step 4: Countries                       ↓
       ↓                    NGO →  /onboarding/ngo/pending (종료)
Step 5: Purpose / NGO Info              ↓
       ↓                    Non-NGO:
onComplete()                      profiles.upsert()
  ↓                                     ↓
profiles.upsert()              completeOnboarding()
  ↓                            localStorage: "borderly_guide_pending"="true"
completeOnboarding()                  ↓
  ↓                            OnboardingSuccess 모달
localStorage:                         ↓
"borderly_guide_pending"="true"  "Explore Community →" 클릭
  ↓                                   ↓
OnboardingSuccess 모달           router.replace("/")
  ↓                                   ↓
"Explore Community →" 클릭    ┌──────────────────────────────┐
  ↓                            │ AuthLayout에서 GuideTour 마운트 │
router.replace("/")            └──────────────────────────────┘
  ↓                                   ↓
GuideTour.tsx 실행 조건 확인:
  - user.guideTourCompleted === false ✓
  - localStorage "borderly_guide_pending" === "true" ✓
  → setActive(true)
  → localStorage 플래그 즉시 삭제
  ↓
Step 1: /browse (Community Feed, 🏠, nav[1] 하이라이트)
  ↓ Next
Step 2: /meet (Meet People, 📅, nav[2] 하이라이트)
  ↓ Next
Step 3: /ngo (Find Support, 🏢, nav[4] 하이라이트)
  ↓ Next
Step 4: /profile (Your Profile, 👤, 하이라이트 없음)
  ↓ "Get started!" 또는 Skip
completeGuideTour()
  ↓
user.guideTourCompleted = true (React state)
  ↓
supabase.auth.updateUser({ guide_tour_completed: true }) (비동기)
  ↓
GuideTour fade out → active = false → null 반환
```

---

## 13. NGO 관련 부가 흐름

### 13.1 NGO 신청 흐름

```
onboarding/page.tsx (userType === "ngo")
  ↓
POST /api/ngo-onboarding (Bearer 인증 필수)
  - org_name (min 2자), org_purpose (min 5자), purpose (min 10자) 검증
  - profiles 업데이트: ngo_org_name, ngo_org_purpose, ngo_status="pending"
  ↓
POST /api/ngo-request (best-effort)
  - 관리자 이메일 알림 발송
  ↓
router.replace("/onboarding/ngo/pending")
  ↓
가이드 투어 없음 (NGO는 승인 후 별도 진입)
```

### 13.2 NGO 승인/거절 흐름

```
POST /api/ngo-approve (Admin 전용)
  ↓
profiles.ngo_verified = true/false
profiles.ngo_status = "approved"/"rejected"
  ↓
승인/거절 이메일 발송
```

---

## 14. 특이 케이스 및 엣지 케이스

### 14.1 이미 완성된 프로필로 `/onboarding` 직접 접근

```typescript
// onboarding/page.tsx:267-273
if (profile?.use_purpose && profile?.languages?.length > 0 && 
    profile?.residence_country && profile?.origin_country && profile?.display_name) {
  completeOnboarding();
  localStorage.setItem("borderly_guide_pending", "true"); // 투어 강제 트리거
  router.replace("/");
}
```
→ 온보딩 완료 상태이지만 가이드 투어를 받지 못한 사용자 보완

### 14.2 투어 중 페이지 새로고침

- `localStorage` 플래그는 이미 삭제됨 (active 시 즉시 제거)
- `user.guideTourCompleted`도 아직 false
- → **투어가 재시작되지 않음** (플래그 없으므로)
- 단, `completeGuideTour()`가 호출되지 않았으므로 다음 로그인 시도 시에도 투어 안 나옴
- **결론**: 투어 중 새로고침하면 투어가 사라지고 재표시 안 됨 (Settings에서만 재시작 가능)

### 14.3 Step4 (프로필) — 네비 하이라이트 없음

- `mobileNavIndex: -1`로 설정
- 모바일에서 프로필은 BottomNav가 아닌 TopBar에 위치
- 툴팁은 화면 중앙으로 이동, 글로우 하이라이트 없음
- 데스크톱: 사이드바를 향한 화살표만 표시

### 14.4 `checkedRef` 패턴의 의미

```typescript
const checkedRef = useRef(false);

useEffect(() => {
  if (checkedRef.current) return;
  checkedRef.current = true;
  // ...
}, [user]);
```

`user` 객체는 AuthProvider에서 비동기 로드 후 setState로 업데이트되는데, 이때 useEffect가 재실행된다. `checkedRef`가 없으면 `user`가 null→객체로 바뀔 때 + 이후 다른 이유로 리렌더링될 때마다 투어 체크가 실행된다. ref를 사용해 **컴포넌트 생애주기당 단 한 번**만 체크한다.

---

## 15. 성능 및 UX 고려사항

| 항목 | 구현 방식 | 이유 |
|------|----------|------|
| DOM 측정 딜레이 | `setTimeout(measure, 50)` | 라우팅 후 BottomNav 렌더링 대기 |
| Fade in 딜레이 | `setTimeout(() => setVisible(true), 100)` | 화면 전환 후 부드러운 등장 |
| 애니메이션 커브 | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 바운스 효과 (spring feel) |
| Overlay 터치 통과 | `pointer-events: none` (배경, 글로우) | 투어 중에도 앱 사용 가능 |
| resize 이벤트 | 측정 + cleanup | 화면 회전/리사이즈 대응 |
| `completeGuideTour` useCallback | `[completeGuideTour]` 의존성 | 불필요한 재생성 방지 |

---

## 16. 보안 고려사항

- NGO 신청 API (`/api/ngo-onboarding`): Bearer 토큰 인증 필수, 서버에서 재검증
- NGO 승인 API (`/api/ngo-approve`): `role === "admin"` 체크 (서버사이드)
- localStorage 플래그는 보안 민감 데이터 없음 (단순 boolean 신호)
- `guide_tour_completed`는 user_metadata에 저장 → 사용자 자신만 수정 가능 (Supabase auth RLS)

---

## 17. 전체 요약

```
가이드 투어 시스템 = 3층 구조

Layer 1 (트리거):
  signup → localStorage 플래그 설정
  onboarding 완료 → localStorage 플래그 설정

Layer 2 (온보딩 마법사):
  /onboarding — 5~6단계 프로필 설정
  성공 → OnboardingSuccess 모달 → "/"로 이동

Layer 3 (투어):
  GuideTour 컴포넌트 — AuthLayout에 항상 마운트
  조건 (플래그 + 미완료) 만족 시 4스텝 오버레이 표시
  완료 → Supabase user_metadata 저장 → 다시 안 보임

특징:
  - 모바일/데스크톱 반응형 (1280px 기준)
  - 3개 언어 지원 (EN/KO/JA)
  - 계정-바운드 완료 상태 (기기 간 동기화)
  - NGO는 별도 플로우 (가이드 투어 없음)
  - Settings에서 재시작 가능
```
