"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  listNotifications,
  markAllRead,
  markRead,
  type NotificationRow,
} from "@/lib/notificationService";

function formatRelative(iso: string) {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);

  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function typeLabel(type: NotificationRow["type"]) {
  switch (type) {
    case "comment":
      return "Comment";
    case "like":
      return "Like";
    case "dm":
      return "Message";
    case "meet":
      return "Meet";
    default:
      return type;
  }
}

export default function NotificationsPage() {
  const router = useRouter();

  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await listNotifications(80);
      setRows(list);
    } catch (error) {
      console.error("listNotifications error:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const unreadCount = useMemo(() => {
    return rows.filter((row) => !row.is_read).length;
  }, [rows]);

  const onMarkAll = async () => {
    if (markingAll || unreadCount === 0) return;

    setMarkingAll(true);
    try {
      await markAllRead();
      setRows((prev) =>
        prev.map((row) => ({
          ...row,
          is_read: true,
        }))
      );
    } catch (error) {
      console.error("markAllRead error:", error);
    } finally {
      setMarkingAll(false);
    }
  };

  const onOpen = async (n: NotificationRow) => {
    try {
      if (!n.is_read) {
        await markRead([n.id]);
        setRows((prev) =>
          prev.map((row) =>
            row.id === n.id ? { ...row, is_read: true } : row
          )
        );
      }

      if (n.link) {
        router.push(n.link);
        return;
      }
    } catch (error) {
      console.error("markRead error:", error);
      if (n.link) {
        router.push(n.link);
        return;
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm">
          <div>
            <div className="text-xl font-bold">Notifications</div>
            <div className="mt-1 text-sm text-gray-500">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-[#F0F7FF]"
            >
              Home
            </Link>

            <button
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-[#F0F7FF] disabled:opacity-50"
              onClick={onMarkAll}
              disabled={markingAll || rows.length === 0 || unreadCount === 0}
            >
              {markingAll ? "Updating..." : "Mark all read"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-2xl border border-gray-100 bg-white shadow-sm"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-8 text-center text-sm text-gray-500 shadow-sm">
            No notifications yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {rows.map((n) => (
              <button
                key={n.id}
                onClick={() => onOpen(n)}
                className={`rounded-2xl border p-4 text-left shadow-sm transition ${
                  n.is_read
                    ? "border-gray-100 bg-white"
                    : "border-blue-200 bg-blue-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-bold text-gray-900">
                        {n.title}
                      </div>

                      {!n.is_read ? (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                          NEW
                        </span>
                      ) : null}
                    </div>

                    {n.body ? (
                      <div className="mt-1 text-sm text-gray-600">
                        {n.body}
                      </div>
                    ) : null}

                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 font-semibold text-gray-600">
                        {typeLabel(n.type)}
                      </span>
                      <span>{formatRelative(n.created_at)}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
