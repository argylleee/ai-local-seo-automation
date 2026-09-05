"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  readAt: string | null;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/notifications")
      .then((res) =>
        res.ok ? (res.json() as Promise<{ notifications: NotificationRow[] }>) : null,
      )
      .then((data) => setNotifications(data?.notifications ?? []))
      .catch(() => {});
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    await fetch("/api/notifications", { method: "POST" }).catch(() => {});
  }

  return (
    <div className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground relative rounded-md px-3 py-1.5 text-sm"
      >
        Notifications
        {unreadCount > 0 ? (
          <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 rounded-full px-1.5 text-xs leading-4">
            {unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="border-border bg-background absolute right-0 top-full z-10 mt-2 w-72 rounded-md border p-2 shadow-md">
          {notifications.length === 0 ? (
            <p className="text-muted-foreground p-2 text-sm">No notifications yet.</p>
          ) : (
            <>
              <ul className="max-h-64 space-y-1 overflow-y-auto">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={cn("rounded-md p-2 text-sm", !n.readAt && "bg-secondary")}
                  >
                    <p className="font-medium">{n.title}</p>
                    {n.body ? <p className="text-muted-foreground">{n.body}</p> : null}
                  </li>
                ))}
              </ul>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-muted-foreground hover:text-foreground mt-2 w-full text-left text-xs"
                >
                  Mark all as read
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
