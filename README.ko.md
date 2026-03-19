# Borderly

국경을 넘어 사람들을 연결하는 모바일 우선 커뮤니티 플랫폼 — Next.js, Supabase, Tailwind CSS로 구축되었습니다.

**배포 주소:** [borderly-tawny.vercel.app](https://borderly-tawny.vercel.app)

> [English version](./README.md)

## 주요 기능

- **커뮤니티 피드** — 카테고리별 게시글 (정보, 질문, 일상, 자유, 구인), 좋아요, 댓글, 트렌딩, 무한 스크롤, 실시간 업데이트
- **모임 (Meet)** — 8가지 이벤트 유형, 참가 신청, 모임별 자동 그룹채팅, 리마인더
- **메시징** — 1:1 DM 및 그룹 채팅, 실시간 전송, 읽음 확인
- **NGO 디렉토리** — NGO 검색, 등록, 가입 신청, 인증 배지
- **사용자 프로필** — 팔로우/차단, 국가 및 언어 정보, 소셜 상태, 친한 친구
- **알림** — 댓글, 좋아요, DM, 모임, 팔로우
- **번역** — 메시지 및 게시글 인앱 번역 (MyMemory API)
- **관리자 대시보드** — 신고 관리 및 콘텐츠 모더레이션
- **PWA** — 모바일 앱으로 설치 가능

## 기술 스택

| 구분         | 기술                                |
| ------------ | ----------------------------------- |
| 프레임워크   | Next.js 16 (App Router)            |
| UI           | React 19, Tailwind CSS 4           |
| 백엔드 / DB  | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| 아이콘       | Lucide React                        |
| 배포         | Vercel                              |
| 언어         | TypeScript                          |

## 시작하기

### 사전 요구사항

- Node.js 18+
- [Supabase](https://supabase.com) 프로젝트

### 설치

```bash
git clone https://github.com/<your-org>/borderly.git
cd borderly
npm install
```

`.env.local` 파일 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

개발 서버 실행:

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인할 수 있습니다.

### 스크립트

| 명령어          | 설명                   |
| --------------- | ---------------------- |
| `npm run dev`   | 개발 서버 실행         |
| `npm run build` | 프로덕션 빌드          |
| `npm start`     | 프로덕션 서버 실행     |
| `npm run lint`  | ESLint 실행            |

## 프로젝트 구조

```
borderly/
├── app/                        # Next.js App Router 페이지 & 컴포넌트
│   ├── components/             # 공유 UI 컴포넌트
│   ├── (routes)/               # 30개 이상의 라우트
│   │   ├── login, signup       # 인증
│   │   ├── chats/              # DM & 그룹 채팅
│   │   ├── meet/               # 모임
│   │   ├── ngo/                # NGO 디렉토리
│   │   ├── profile/            # 사용자 프로필
│   │   ├── admin/              # 관리자 대시보드
│   │   └── ...
│   └── api/                    # API 라우트 (번역, 관리자)
├── lib/                        # 서비스 레이어
│   ├── supabaseClient.ts       # Supabase 클라이언트
│   ├── dm.ts                   # 다이렉트 메시지
│   ├── groupChatService.ts     # 그룹 채팅
│   ├── notificationService.ts  # 알림
│   ├── ngoService.ts           # NGO 관련
│   ├── reportService.ts        # 신고/모더레이션
│   ├── followService.ts        # 팔로우 시스템
│   ├── blockService.ts         # 사용자 차단
│   └── ...
├── hooks/                      # 커스텀 React 훅
│   ├── useChat.ts
│   ├── useLocale.ts
│   └── useOnlinePresence.ts
├── supabase/migrations/        # 데이터베이스 마이그레이션
├── middleware.ts               # CORS & CSRF 보호
└── public/                     # 정적 파일 & PWA 매니페스트
```

## 데이터베이스

Supabase를 통한 PostgreSQL, 행 수준 보안(RLS) 적용. 주요 테이블:

`profiles` · `posts` · `comments` · `post_likes` · `conversations` · `messages` · `meetings` · `meet_attendees` · `notifications` · `follows` · `blocks` · `close_friends` · `ngos` · `ngo_applications` · `reports` · `bookmarks`

마이그레이션 파일은 `supabase/migrations/`에 있습니다.

## 네비게이션

하단 네비게이션 바 5개 탭:

| 탭      | 경로       | 설명               |
| ------- | ---------- | ------------------ |
| Home    | `/`        | 커뮤니티 피드      |
| NGO     | `/ngo`     | NGO 디렉토리       |
| Meet    | `/meet`    | 모임               |
| Chats   | `/chats`   | 메시지             |
| Profile | `/profile` | 사용자 프로필      |

## 라이선스

Private — All rights reserved.
