# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Next.js 16, http://localhost:3000)
npm run build      # Production build
npm start          # Start production server
npm run lint       # Run ESLint
```

No test framework is configured.

## Architecture

Mobile-first community platform (Borderly) connecting people across borders. Next.js 16 App Router + React 19 + Supabase + Tailwind CSS 4 + TypeScript.

### Data Flow

All pages are `"use client"` components. There is no SSR for dynamic content.

```
Page component → useAuth() context → supabase client query or fetch(/api/*) → lib/* services → Supabase → state update → render
```

### Supabase Usage

- **Client-side** (`lib/supabaseClient.ts`): Uses `NEXT_PUBLIC_SUPABASE_*` env vars. Used by pages for queries, auth state, realtime subscriptions.
- **Server-side** (`lib/supabaseAdmin.ts`): Uses `SUPABASE_SERVICE_ROLE_KEY`. Used in API routes (`app/api/`) for elevated privilege operations. Stateless (no session persistence).
- **Realtime**: Supabase channels for postgres_changes (chat messages, notifications), presence (online users), and broadcast (typing indicators). Always call `supabase.realtime.setAuth(token)` before subscribing and `supabase.removeChannel()` on cleanup.

### Auth Flow

`AuthProvider` wraps the app. It calls `supabase.auth.getUser()` on mount, fetches the profile from the `profiles` table, and listens to `onAuthStateChange`. Pages access user via `useAuth()` hook. API routes verify auth via Bearer token with `supabaseAdmin.auth.getUser(token)`.

There is no middleware-level route protection — `AuthLayout` conditionally renders TopBar/BottomNav/OnlineSidebar based on whether the user is logged in and whether the current path is a public page (`/login`, `/signup`, `/reset-password`, `/update-password`).

### Layout Composition

```
RootLayout (layout.tsx)
  └─ LangProvider → AuthProvider → AuthLayout
       ├─ TopBar (fixed top, hidden on auth pages)
       ├─ Main content (pt-[60px] pb-[80px])
       ├─ OnlineSidebar (desktop only, xl:block)
       ├─ BottomNav (mobile only, xl:hidden, 5 tabs with unread badge)
       └─ NotificationToast
```

### Service Layer (`lib/`)

Domain logic lives in service files, not in components. Key services: `dm.ts` / `groupChatService.ts` (messaging), `notificationService.ts` (notification CRUD + RPC), `translateService.ts` (in-memory cache + MyMemory API), `ngoService.ts`, `reportService.ts`, `blockService.ts`, `followService.ts`, `closeFriendService.ts`.

### Routing

- Auth: `/login`, `/signup`, `/reset-password`, `/update-password`
- Feed: `/` (home), `/browse`, `/create`, `/posts/[id]`
- Chat: `/chats`, `/chats/[conversationId]`, `/chats/new`, `/chats/new-group`
- Legacy: `/dm/[chatId]` redirects to `/chats`
- Meet: `/meet`, `/meet/new`, `/meet/[id]`
- NGO: `/ngo`, `/ngo/new`, `/ngo/[id]/edit`
- Profile: `/profile`, `/u/[userId]`, `/my`
- Admin: `/admin/reports`, `/admin/ngo`
- API: `/api/translate`, `/api/admin/reports`

## Conventions

- **Imports**: Use `@/*` path alias (maps to project root). Example: `import { supabase } from "@/lib/supabaseClient"`.
- **Styling**: Tailwind CSS 4 with custom design tokens in `globals.css` (CSS custom properties: `--bg-snow`, `--primary`, `--deep-navy`). Custom utility classes prefixed with `b-` (e.g., `b-card`, `b-pill`, `b-meet-*`, `b-skeleton`). Dark mode via `.dark` class on root element.
- **Language**: All UI text and code comments are in English.
- **UI patterns**: Rounded cards (`rounded-2xl`), gray-50 backgrounds, black accent buttons. Mobile-first with desktop sidebar at `xl:` breakpoint.

## Security

- `middleware.ts` handles CORS (for `/api/*` routes) and CSRF protection (origin vs host validation on mutations).
- `next.config.ts` sets CSP, HSTS, and other security headers in production.
- Rate limiting is application-level (e.g., login: 5 attempts / 3-min lockout; translate API: 30 req/min per user).

## Known Issues

- WSL2 shows lightningcss native module warnings during build — this is an environment issue, not a code bug.
