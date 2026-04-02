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
       ├─ TopBar (fixed top h-14, hidden on auth/chat pages)
       ├─ Main content (pt-14 pb-[72px])
       ├─ OnlineSidebar (desktop only, xl:block, top-14)
       ├─ BottomNav (mobile only, xl:hidden, h-16)
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
- **Styling**: Tailwind CSS 4 with custom design tokens in `globals.css` (CSS custom properties: `--bg-snow`, `--primary`, `--deep-navy`). Custom utility classes prefixed with `b-` (e.g., `b-card`, `b-pill`, `b-btn-primary`, `b-meet-*`, `b-skeleton`). Dark mode via `.dark` class on root element.
- **Language**: All UI text and code comments are in English.
- **UI patterns**: Rounded cards (`rounded-2xl`), warm blue tint backgrounds, mobile-first with desktop sidebar at `xl:` breakpoint.

## Design System v2 — Style Rules

### Color Palette
- **Primary**: `var(--primary)` — `#4A8FE7` light / `#6AADFF` dark (Borderly Blue)
- **Accent**: `var(--accent)` — `#2EC4B6` teal
- **Backgrounds**: `var(--bg-snow)` page, `var(--bg-card)` cards, `var(--bg-elevated)` inputs/hover
- **Text**: `var(--deep-navy)` primary, `var(--text-secondary)` secondary, `var(--text-muted)` muted
- **Borders**: `var(--border-soft)` default, `var(--border-focus)` focus/hover
- **Never** hardcode color hex values in components — always use CSS variables.
- **Fonts**: Plus Jakarta Sans (`--font-heading`) for headings, Inter (`--font-body`) for body text.

### Spacing Scale (8px base)
All spacing must use Tailwind classes only. **Never use inline `style={{ margin/padding }}`** for spacing.

| Token | Tailwind | px | Use for |
|-------|----------|-----|---------|
| xs | `gap-1.5` / `mt-1.5` | 6 | Tight icon–label gaps |
| sm | `gap-2` | 8 | Within a component (icon+text, badge gaps) |
| md | `gap-3` / `mt-3` | 12 | Between related items (filter pills, list rows) |
| lg | `gap-4` / `mt-4` | 16 | Between blocks inside a section |
| xl | `gap-6` / `mt-6` | 24 | Between major sections on a page |
| 2xl | `gap-8` | 32 | Top-level page sections (rarely) |

**Rules:**
- Use `space-y-4` for card lists / feed items.
- Use `mt-6` between major page sections (search → filters → results).
- **Never** mix `mt-*` and `space-y-*` on siblings — pick one pattern per container.
- Page container: `mx-auto max-w-3xl px-4 sm:px-6 pb-24 pt-4`.

### Card Padding
- **Standard card**: `p-5` (20px) — posts, meets, profiles.
- **Compact card**: `p-4` (16px) — only for dense lists (chat rows, notification items).
- **Never mix** `p-4` and `p-5` cards on the same page.

### Button Sizes
Use `b-btn-primary` / `b-btn-secondary` classes. Only 3 sizes allowed:

| Size | Height | Padding | Font | Use for |
|------|--------|---------|------|---------|
| sm | `h-9` (36px) | `px-3` | `text-sm` | Inline actions, pills |
| md | `h-10` (40px) | `px-4` | `text-sm` | Default buttons |
| lg | `h-11` (44px) | `px-5` | `text-sm font-semibold` | Primary CTA |

**Never** use inline `style={{ height, padding }}` for buttons.

### Typography Hierarchy
Use Tailwind classes only. **Never** use `fontSize` inline styles.

| Role | Class | Size | Weight |
|------|-------|------|--------|
| Page title | `text-xl font-bold` | 20px | 700 |
| Section title | `text-lg font-semibold` | 18px | 600 |
| Card title | `text-base font-semibold` | 16px | 600 |
| Body | `text-sm` | 14px | 400 |
| Caption / meta | `text-xs` | 12px | 400–500 |
| Badge / micro | `text-[10px] font-semibold` | 10px | 600 |

**Forbidden**: `text-[13px]`, `text-[14px]`, `text-[11px]` — use `text-xs` or `text-sm` instead.

### Border Radius
- Cards: `rounded-2xl` (16px) via `b-card` class
- Buttons: `rounded-xl` (12px)
- Inputs: `rounded-xl` (12px)
- Pills/badges: `rounded-full`
- Avatars: `rounded-full`
- **Never** use `rounded-[20px]` or other arbitrary radius values.

### Forbidden Patterns
- ❌ Inline `style={{ color, background, fontSize, height, padding }}` for standard UI — use Tailwind + CSS variables
- ❌ `bg-white` hardcoded — use `bg-[var(--bg-card)]` or `b-card` class
- ❌ `text-gray-*` / `border-gray-*` — use CSS variable equivalents
- ❌ Mixing `mt-*` and `space-y-*` on sibling elements
- ❌ Arbitrary Tailwind values like `text-[13px]`, `rounded-[20px]`, `h-[36px]`
- ❌ `bg-white/95` for nav — use `color-mix(in srgb, var(--bg-card) 98%, transparent)`

## Security

- `middleware.ts` handles CORS (for `/api/*` routes) and CSRF protection (origin vs host validation on mutations).
- `next.config.ts` sets CSP, HSTS, and other security headers in production.
- Rate limiting is application-level (e.g., login: 5 attempts / 3-min lockout; translate API: 30 req/min per user).

## Known Issues

- WSL2 shows lightningcss native module warnings during build — this is an environment issue, not a code bug.
