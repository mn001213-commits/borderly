# Borderly

A mobile-first community platform for connecting people across borders — built with Next.js, Supabase, and Tailwind CSS.

**Live:** [borderly-global.com](https://borderly-global.com)

> [한국어 버전](./README.ko.md)

## Features

- **Community Feed** — Posts with categories (info, question, daily, general, jobs), likes, comments, trending, infinite scroll, and realtime updates
- **Meet Events** — 8 event types with RSVP, auto-generated group chats, and reminders
- **Messaging** — Direct messages and group chats with realtime delivery and read receipts
- **NGO Directory** — Browse, register, and apply to NGOs with verification badges
- **User Profiles** — Follow/block, country & language info, social status, close friends
- **Notifications** — Comments, likes, DMs, meets, follows
- **Translation** — In-app translation for messages and posts (MyMemory API)
- **Admin Dashboard** — Content reports and moderation
- **PWA** — Installable as a mobile app

## Tech Stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Framework    | Next.js 16 (App Router)            |
| UI           | React 19, Tailwind CSS 4           |
| Backend / DB | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Icons        | Lucide React                        |
| Deployment   | Vercel                              |
| Language      | TypeScript                          |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### Setup

```bash
git clone https://github.com/<your-org>/borderly.git
cd borderly
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start dev server         |
| `npm run build` | Production build         |
| `npm start`     | Start production server  |
| `npm run lint`  | Run ESLint               |

## Project Structure

```
borderly/
├── app/                        # Next.js App Router pages & components
│   ├── components/             # Shared UI components
│   ├── (routes)/               # 30+ routes
│   │   ├── login, signup       # Authentication
│   │   ├── chats/              # DM & group chat
│   │   ├── meet/               # Events
│   │   ├── ngo/                # NGO directory
│   │   ├── profile/            # User profile
│   │   ├── admin/              # Admin dashboard
│   │   └── ...
│   └── api/                    # API routes (translate, admin)
├── lib/                        # Service layer
│   ├── supabaseClient.ts       # Supabase client
│   ├── dm.ts                   # Direct messaging
│   ├── groupChatService.ts     # Group chat
│   ├── notificationService.ts  # Notifications
│   ├── ngoService.ts           # NGO operations
│   ├── reportService.ts        # Content moderation
│   ├── followService.ts        # Follow system
│   ├── blockService.ts         # User blocking
│   └── ...
├── hooks/                      # Custom React hooks
│   ├── useChat.ts
│   ├── useLocale.ts
│   └── useOnlinePresence.ts
├── supabase/migrations/        # Database migrations
├── middleware.ts               # CORS & CSRF protection
└── public/                     # Static assets & PWA manifest
```

## Database

PostgreSQL via Supabase with Row-Level Security (RLS). Key tables:

`profiles` · `posts` · `comments` · `post_likes` · `conversations` · `messages` · `meetings` · `meet_attendees` · `notifications` · `follows` · `blocks` · `close_friends` · `ngos` · `ngo_applications` · `reports` · `bookmarks`

Migrations are in `supabase/migrations/`.

## Navigation

Bottom navigation bar with 5 tabs:

| Tab     | Route      | Description        |
| ------- | ---------- | ------------------ |
| Home    | `/`        | Community feed     |
| NGO     | `/ngo`     | NGO directory      |
| Meet    | `/meet`    | Events             |
| Chats   | `/chats`   | Messages           |
| Profile | `/profile` | User profile       |

## License

Private — All rights reserved.
