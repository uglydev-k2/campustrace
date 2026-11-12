"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, safeNextPath } from "@/lib/auth";
import { db } from "@/lib/db";

/** Marks one notification as read and opens what it points to. */
export async function openNotificationAction(notificationId: string): Promise<void> {
  const user = await requireUser("/notifications");
  // `userId` in the filter means you can only ever touch your own rows.
  const notification = await db.notification.findFirst({
    where: { id: notificationId, userId: user.id },
  });
  if (!notification) redirect("/notifications");

  if (!notification.readAt) {
    await db.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
    });
  }
  revalidatePath("/", "layout");
  redirect(safeNextPath(notification.href));
}

export async function markAllReadAction(): Promise<void> {
  const user = await requireUser("/notifications");
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
}
