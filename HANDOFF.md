# HANDOFF.md — 2026-04-02

## 현재 브랜치
- **master** (작업 브랜치)
- main은 리모트 기본 브랜치

## 커밋되지 않은 변경사항 (16개 파일)

### 주요 변경 내용

**UI/디자인 개선 작업 진행 중:**

| 파일 | 변경 내용 |
|------|----------|
| `app/globals.css` | +291줄 — 새 CSS 유틸리티 클래스 추가 (b-meet-*, b-skeleton 등) |
| `app/page.tsx` | 홈 피드 페이지 리팩토링 |
| `app/meet/page.tsx` | Meet 목록 페이지 리팩토링 |
| `app/ngo/page.tsx` | NGO 목록 페이지 리팩토링 |
| `app/components/BottomNav.tsx` | 하단 네비게이션 개선 |
| `app/components/TopBar.tsx` | 상단바 개선 |
| `app/components/OnlineSidebar.tsx` | 온라인 사이드바 개선 |
| `app/notifications/page.tsx` | 알림 페이지 개선 |
| `app/chats/[conversationId]/page.tsx` | 채팅 페이지 개선 (+89줄) |
| `app/meet/new/page.tsx` | Meet 생성 페이지 개선 |
| `app/meet/[id]/edit/page.tsx` | Meet 편집 페이지 개선 |
| `app/ngo/new/page.tsx` | NGO 생성 페이지 개선 |
| `app/ngo/applications/page.tsx` | NGO 지원 페이지 소수 변경 |
| `lib/groupChatService.ts` | 그룹 채팅 서비스 기능 추가 (+52줄) |
| `lib/i18n.ts` | 번역 키 추가 (+3줄) |
| `DESIGN_SYSTEM_V2.md` | 삭제됨 (내용은 CLAUDE.md로 통합 완료) |

### 신규 파일 (untracked)
| 파일 | 설명 |
|------|------|
| `app/components/SortDropdown.tsx` | 정렬 드롭다운 컴포넌트 (신규) |
| `lib/swrCache.ts` | SWR 캐시 유틸리티 (신규) |

## 최근 완료된 작업
1. Design System v2 전체 적용 (폰트, 색상 팔레트, 네비게이션)
2. 색상 팔레트 코랄 → 파란 계열(#4A8FE7) 전환
3. 카드 테두리/그림자 강화로 블록 구분 개선
4. Meet 댓글 + 대댓글 기능 추가

## 다음 작업 (예상)
- 현재 uncommitted 변경사항 검토 후 커밋
- 기능별로 커밋 분리 권장

## 주의사항
- `nul` 파일이 untracked에 있음 — Windows에서 실수로 생성된 것, 삭제 필요
- master 브랜치에서 직접 작업 중 (main에 PR 필요)
