import "server-only";
import { db } from "@/lib/db";
import { REPORTS_PER_PAGE } from "@/lib/constants";
import type { BrowseFilters } from "@/lib/validation";
import { canViewReportPhoto, type Viewer } from "@/lib/workflow/access";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Read queries shared by several pages.
 *
 * Privacy rule for listings: select only the columns a card needs. The
 * reporter's identity and `privateDetails` are never selected here, so they
 * cannot leak into a public page by accident.
 */

const cardSelect = {
  id: true,
  reference: true,
  kind: true,
  status: true,
  title: true,
  category: true,
  area: true,
  occurredOn: true,
  photoPublic: true,
  reporterId: true,
  photos: { select: { id: true }, take: 1 },
} satisfies Prisma.ReportSelect;

type CardRow = Prisma.ReportGetPayload<{ select: typeof cardSelect }>;

/** The data an item tag shows. Safe to pass to client components. */
export type ReportCard = {
  id: string;
  reference: string;
  kind: CardRow["kind"];
  status: CardRow["status"];
  title: string;
  category: CardRow["category"];
  area: string;
  occurredOn: Date;
  /** Attachment id of a photo this viewer may see, or null. */
  photoId: string | null;
};

export function toCard(row: CardRow, viewer: Viewer): ReportCard {
  const photo = row.photos[0];
  return {
    id: row.id,
    reference: row.reference,
    kind: row.kind,
    status: row.status,
    title: row.title,
    category: row.category,
    area: row.area,
    occurredOn: row.occurredOn,
    photoId: photo && canViewReportPhoto(viewer, row) ? photo.id : null,
  };
}

/** Search for the browse page. */
export async function searchReports(filters: BrowseFilters, viewer: Viewer) {
  const where: Prisma.ReportWhereInput = {
    status: filters.show === "RETURNED" ? "RETURNED" : { in: ["OPEN", "IN_CUSTODY"] },
  };
  if (filters.kind !== "ALL") where.kind = filters.kind;
  if (filters.category !== "ALL") where.category = filters.category;
  if (filters.area !== "ALL") where.area = filters.area;
  if (filters.q) {
    // Prisma sends these as query parameters, so user text is never
    // concatenated into SQL.
    const contains = { contains: filters.q, mode: "insensitive" as const };
    where.OR = [
      { title: contains },
      { description: contains },
      { area: contains },
      { locationDetail: contains },
      { reference: { equals: filters.q.toUpperCase() } },
    ];
  }

  const [total, rows] = await Promise.all([
    db.report.count({ where }),
    db.report.findMany({
      where,
      select: cardSelect,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * REPORTS_PER_PAGE,
      take: REPORTS_PER_PAGE,
    }),
  ]);

  return {
    total,
    pages: Math.max(1, Math.ceil(total / REPORTS_PER_PAGE)),
    cards: rows.map((row) => toCard(row, viewer)),
  };
}

export async function recentReports(kind: "FOUND" | "LOST", take: number, viewer: Viewer) {
  const rows = await db.report.findMany({
    where: { kind, status: { in: ["OPEN", "IN_CUSTODY"] } },
    select: cardSelect,
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map((row) => toCard(row, viewer));
}

export async function reportsByUser(userId: string, viewer: Viewer) {
  const rows = await db.report.findMany({
    where: { reporterId: userId },
    select: cardSelect,
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => toCard(row, viewer));
}

export function activeCollectionPoints() {
  return db.collectionPoint.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}
