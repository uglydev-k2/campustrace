import { BellOff, CheckCheck, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/page-header";
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
    <>
      <PageHeader
        title="Notifications"
        description={unread === 0 ? "You are up to date." : `${unread} unread.`}
        actions={
          unread > 0 && (
            <form action={markAllReadAction}>
              <button type="submit" className="btn btn-secondary">
                <CheckCheck aria-hidden className="size-4" />
                Mark all as read
              </button>
            </form>
          )
        }
      />

      <div className="container-page pt-8">
        <div className="max-w-3xl">
          {notifications.length === 0 ? (
            <EmptyState icon={<BellOff aria-hidden className="size-5" />} title="Nothing yet">
              You will hear from us here when something happens to an item you reported or
              claimed.
            </EmptyState>
          ) : (
            <ul className="panel divide-y divide-line overflow-hidden shadow-xs">
              {notifications.map((notification) => {
                const isUnread = !notification.readAt;
                return (
                  <li key={notification.id}>
                    {/* Opening a notification marks it read, then goes to its subject. */}
                    <form action={openNotificationAction.bind(null, notification.id)}>
                      <button
                        type="submit"
                        className="group flex w-full gap-3.5 px-4 py-4 text-left transition-colors hover:bg-paper focus-visible:bg-paper sm:px-5"
                      >
                        <span
                          aria-hidden
                          className={`mt-[7px] size-2 shrink-0 rounded-full ${isUnread ? "bg-brand-600" : "bg-transparent ring-1 ring-line-strong"}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-4">
                            <span className={`block text-small ${isUnread ? "font-semibold text-ink" : "font-medium text-ink-soft"}`}>
                              {isUnread && <span className="sr-only">Unread: </span>}
                              {notification.title}
                            </span>
                            <span className="shrink-0 text-caption text-ink-faint">
                              {formatRelative(notification.createdAt)}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-small text-ink-soft">{notification.body}</span>
                        </span>
                        <ChevronRight
                          aria-hidden
                          className="mt-0.5 size-4 shrink-0 self-center text-ink-faint opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                        />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
