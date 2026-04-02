# Borderly Design System v2 — Redesign Proposal

## Problem

현재 디자인은 기능적으로 깔끔하지만 **"AI가 만든 SaaS 템플릿"** 느낌이 강함.

| 문제 | 현재 | 체감 |
|------|------|------|
| 색상 | `#4DA6FF` 단일 블루 | 모든 SaaS가 쓰는 기본 파란색 |
| 폰트 | Geist Sans (Google) | 깔끔하지만 개성 없음 |
| 카드 | 전부 동일한 `rounded-[20px]` + 미세 그림자 | 템플릿 느낌 |
| 아이콘 | Lucide React 기본 | 어디서나 볼 수 있는 아이콘 |
| 애니메이션 | `fade-up` 0.35s 하나 | 없는 것과 다름없음 |
| 카테고리 색 | Material Design 기본 팔레트 | 구글 Docs 느낌 |
| 레이아웃 | 모든 곳이 같은 구조 | 페이지 구분이 안 됨 |

---

## Design Direction: "Warm Connection"

Borderly는 **국경을 넘어 사람을 연결하는 커뮤니티**.
차갑고 기업적인 SaaS 느낌이 아니라, **따뜻하고 인간적인** 느낌이 필요.

**키워드:** Warm, Human, Approachable, Alive, Trustworthy

---

## 1. Color Palette

### Primary — Coral Warmth
기존 차가운 블루 대신, 따뜻한 코랄 계열로 브랜드 정체성 확립.

```
--primary:       #FF6B6B   (Warm Coral — 메인 액션)
--primary-hover: #E85D5D   (Darker Coral)
--primary-light: #FFF0F0   (Coral Tint — 배경 활용)
```

### Accent — Teal Balance
코랄의 보색으로 틸(청록)을 사용하여 시각적 균형.

```
--accent:        #2EC4B6   (Teal — 보조 액션, 온라인 표시, 성공)
--accent-hover:  #25A99D
--accent-light:  #E6F9F7
```

### Neutral — Warm Gray
순수 블루-그레이 대신 약간 따뜻한 톤의 중립색.

```
--bg-primary:    #FAFAF8   (Warm Snow — 메인 배경)
--bg-card:       #FFFFFF   (카드)
--bg-elevated:   #F5F4F2   (Elevated Surface)
--text-primary:  #2D2D2D   (거의 블랙, 따뜻한 톤)
--text-secondary:#6B6B6B   (중간 텍스트)
--text-muted:    #A3A3A3   (약한 텍스트)
--border:        #E8E8E5   (경계선)
--border-focus:  #D4D4D0   (포커스 경계)
```

### Category Colors — Curated (Material에서 벗어남)

```
general:  bg #F0F4FF  text #4361EE  (Bright Indigo)
info:     bg #FFF4EC  text #F77F00  (Tangerine)
question: bg #F5F0FF  text #7B2FF2  (Vivid Purple)
daily:    bg #EEFBF3  text #06D6A0  (Mint Green)
jobs:     bg #FFF8EB  text #E6A817  (Warm Gold)
meet:     bg #FFF0F3  text #FF6B6B  (Coral)
skill:    bg #EDF8FF  text #0096C7  (Ocean Blue)
ngo:      bg #F0FFF4  text #2D9F5D  (Forest Green)
legal:    bg #FFF5F5  text #C1292E  (Deep Red)
other:    bg #F5F5F3  text #737373  (Warm Gray)
```

### Dark Mode

```
--bg-primary:    #141414   (True Dark)
--bg-card:       #1E1E1E   (Elevated Dark)
--bg-elevated:   #282828
--text-primary:  #ECECEC
--text-secondary:#9A9A9A
--text-muted:    #666666
--border:        #333333
--border-focus:  #444444
--primary:       #FF8585   (밝은 코랄)
--accent:        #3ED9CB   (밝은 틸)
```

---

## 2. Typography

### Font Stack

```
Heading: "Plus Jakarta Sans" (Google Fonts)
 - 특징: geometric + humanist 혼합, 현대적이면서 따뜻함
 - Weight: 600 (semibold), 700 (bold), 800 (extrabold)

Body: "Inter" (Google Fonts)
 - 이미 검증된 가독성, Geist보다 따뜻한 느낌
 - Weight: 400 (regular), 500 (medium)
```

### Scale

```
Display:  28px / 700 / -0.02em (페이지 제목)
H1:       22px / 700 / -0.01em (섹션 제목)
H2:       18px / 600 (카드 제목)
H3:       15px / 600 (소제목)
Body:     14px / 400 / 0 (본문)
Caption:  12px / 500 / 0.01em (메타 정보)
Micro:    10px / 600 / 0.03em (뱃지)
```

---

## 3. Component Redesign

### Cards

**Before:** 전부 `rounded-[20px]`, 동일한 미세 그림자
**After:** 컨텍스트별 차별화

```css
/* 기본 카드 — 깔끔한 경계선 + 미세 그림자 */
.b-card {
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}

/* 인터랙티브 카드 — 호버시 부드럽게 뜨는 느낌 */
.b-card-interactive {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.b-card-interactive:hover {
  box-shadow: 0 8px 25px rgba(0,0,0,0.08);
  transform: translateY(-2px);
  border-color: var(--border-focus);
}

/* Featured 카드 — Gradient 테두리 */
.b-card-featured {
  border: none;
  background: linear-gradient(var(--bg-card), var(--bg-card)) padding-box,
              linear-gradient(135deg, var(--primary), var(--accent)) border-box;
  border: 2px solid transparent;
  border-radius: 16px;
}
```

### Buttons

**Primary:** Coral + 미세 그라디언트 + 눌림 효과
```css
.b-btn-primary {
  background: linear-gradient(135deg, #FF6B6B 0%, #FF8585 100%);
  color: white;
  border-radius: 12px;
  padding: 10px 20px;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.15s ease;
  box-shadow: 0 2px 8px rgba(255,107,107,0.3);
}
.b-btn-primary:hover {
  box-shadow: 0 4px 14px rgba(255,107,107,0.4);
  transform: translateY(-1px);
}
.b-btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(255,107,107,0.3);
}
```

**Secondary:** Ghost 스타일
```css
.b-btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  padding: 10px 20px;
  font-weight: 500;
  transition: all 0.15s ease;
}
.b-btn-secondary:hover {
  background: var(--bg-elevated);
  border-color: var(--border-focus);
}
```

**Pill/Tag:** 둥근 태그
```css
.b-pill {
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s ease;
}
.b-pill-active {
  background: var(--primary);
  color: white;
  box-shadow: 0 2px 6px rgba(255,107,107,0.25);
}
.b-pill-inactive {
  background: var(--bg-elevated);
  color: var(--text-secondary);
}
.b-pill-inactive:hover {
  background: var(--border);
  color: var(--text-primary);
}
```

### Navigation

**TopBar:**
```
- 높이: 56px (60px에서 줄임, 더 컴팩트)
- 배경: var(--bg-card) / 98% opacity + backdrop-blur-lg
- 로고: "borderly" lowercase, Plus Jakarta Sans 700, 색상 gradient
- 로고 옆: 코랄→틸 그라디언트 작은 dot (브랜드 마크)
- 그림자: 0 1px 0 var(--border) (선 하나, 그림자 없음)
```

**BottomNav:**
```
- 높이: 64px (72px에서 줄임)
- 배경: var(--bg-card) / 98% opacity + backdrop-blur-lg
- Active: 아이콘 + 라벨 모두 var(--primary) 코랄
- Active indicator: 아이콘 위에 작은 dot (4px coral circle)
- Inactive: var(--text-muted)
- 아이콘 사이즈: 22px → 20px (약간 작게)
- 라벨: 10px, font-weight 500
```

### Input Fields

```css
.b-input {
  background: var(--bg-elevated);
  border: 1.5px solid transparent;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--text-primary);
  transition: all 0.15s ease;
}
.b-input:focus {
  border-color: var(--primary);
  background: var(--bg-card);
  box-shadow: 0 0 0 3px var(--primary-light);
  outline: none;
}
.b-input::placeholder {
  color: var(--text-muted);
}
```

---

## 4. Micro-interactions & Animation

### Transition Curve
기본 `ease` 대신 커스텀 커브로 자연스러운 움직임.

```css
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);
--spring: cubic-bezier(0.37, 1.61, 0.58, 0.87);
```

### Animations

```css
/* 리스트 아이템 등장 — 더 작고 빠른 움직임 */
@keyframes b-slide-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.b-animate-in {
  animation: b-slide-up 0.3s var(--ease-out-expo) both;
}

/* 좋아요 버튼 — 톡 튀는 느낌 */
@keyframes b-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

/* 스켈레톤 — 더 부드러운 펄스 */
@keyframes b-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
}
.b-skeleton {
  background: var(--bg-elevated);
  animation: b-pulse 1.8s ease-in-out infinite;
}

/* 페이지 전환 — 부드러운 페이드 */
@keyframes b-page-enter {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### Interactive Feedback

```
- 버튼 누를 때: scale(0.97) + translateY(1px) — 눌림 느낌
- 좋아요 클릭: scale(1.3) pop + 코랄색 전환
- 탭 전환: underline indicator slide (120ms)
- 카드 호버: translateY(-2px) + shadow grow (200ms)
- 토스트 알림: 아래에서 슬라이드 업 + 자동 페이드아웃
```

---

## 5. Specific Page Updates

### TopBar 변경점
- "BORDERLY" 대문자 → "borderly" 소문자로 더 친근하게
- 로고 텍스트에 코랄→틸 그라디언트 적용
- 전체 높이 56px로 줄임

### BottomNav 변경점
- 높이 64px로 줄임
- Active 상태: 코랄 색상 + 상단 dot indicator
- 트랜지션 더 부드럽게

### Home/Browse 변경점
- 필터 pill 색상 코랄 계열로
- 카드에 interactive hover 추가
- 카테고리 뱃지 새 팔레트 적용
- 검색바 디자인 개선 (포커스 링 추가)

### Login/Signup 변경점
- 배경에 코랄+틸 subtle gradient blob
- 입력필드 포커스 링 코랄 색상
- CTA 버튼 gradient 코랄

### Post Detail 변경점
- 좋아요 버튼 pop 애니메이션
- 댓글 영역 시각적 구분 강화
- 공유 버튼 개선

---

## 6. Implementation Plan

### Phase 1: Foundation (globals.css + layout)
1. CSS 변수 전체 교체 (색상 팔레트)
2. 폰트 교체 (Plus Jakarta Sans + Inter)
3. 유틸리티 클래스 업데이트 (b-card, b-pill, b-btn)
4. 애니메이션 키프레임 추가
5. 다크모드 변수 업데이트

### Phase 2: Navigation
6. TopBar 리디자인
7. BottomNav 리디자인

### Phase 3: Components
8. 카테고리 색상 상수 업데이트 (constants.ts)
9. 주요 페이지 적용 (Home, Browse, Meet, Chat, Profile)
10. Login/Signup 페이지

### Phase 4: Polish
11. 마이크로 인터랙션 적용
12. 다크모드 전체 점검
13. 반응형 점검

---

## Before / After Summary

| 요소 | Before | After |
|------|--------|-------|
| Primary Color | `#4DA6FF` (차가운 블루) | `#FF6B6B` (따뜻한 코랄) |
| Accent | 없음 | `#2EC4B6` (틸) |
| Font | Geist Sans | Plus Jakarta Sans + Inter |
| Card radius | 20px | 16px |
| Shadow depth | 거의 없음 | 컨텍스트별 차별화 |
| Animation | fade-up 하나 | slide-up, pop, pulse, page-enter |
| Nav height | 60px + 72px | 56px + 64px |
| Brand feel | 차갑고 기업적 | 따뜻하고 인간적 |
| Category colors | Material 기본 | 커스텀 큐레이션 |

---

> **Note:** 이 문서는 제안 사항입니다. 피드백 후 확정된 부분부터 구현합니다.
