import type { Metadata } from "next";
import { markAllReadAction, openNotificationAction } from "@/actions/notifications";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unread = notifications.filter((notification) => !notification.readAt).length;

  return (
    <div className="container-page py-10">
      <div className="max-w-2xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="type-page">Notifications</h1>
            <p className="mt-2 text-ink-soft">
              {unread === 0 ? "You are up to date." : `${unread} unread.`}
            </p>
          </div>
          {unread > 0 && (
            <form action={markAllReadAction}>
              <button type="submit" className="btn btn-secondary btn-small">
                Mark all as read
              </button>
            </form>
          )}
        </div>

        {notifications.length === 0 ? (
          <p className="panel mt-8 p-6 text-ink-soft">
            Nothing yet. You will hear from us here when something happens to an item you
            reported or claimed.
          </p>
        ) : (
          <ul className="panel mt-8 divide-y divide-line overflow-hidden">
            {notifications.map((notification) => {
              const isUnread = !notification.readAt;
              return (
                <li key={notification.id}>
                  {/* Opening a notification marks it read, then goes to its subject. */}
                  <form action={openNotificationAction.bind(null, notification.id)}>
                    <button
                      type="submit"
                      className={`flex w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-brand-50 sm:px-5 ${
                        isUnread ? "bg-surface" : "bg-paper"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`mt-2 size-2.5 shrink-0 rounded-full ${isUnread ? "bg-brand-600" : "bg-transparent"}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className={`block ${isUnread ? "font-bold" : "text-ink-soft"}`}>
                          {isUnread && <span className="sr-only">Unread: </span>}
                          {notification.title}
                        </span>
                        <span className="block text-small text-ink-soft">{notification.body}</span>
                        <span className="mt-1 block text-caption text-ink-faint">
                          {formatRelative(notification.createdAt)}
                        </span>
                      </span>
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
