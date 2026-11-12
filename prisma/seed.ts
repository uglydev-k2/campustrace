/**
 * Demo data for CampusTrace.
 *
 *   npm run db:seed
 *
 * WARNING: this deletes every user, report, claim, notification and history
 * row first, then inserts the sample data below. It is meant for local
 * development and demonstrations only, and refuses to run in production.
 *
 * The people, items and collection-point details are invented for the demo.
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Category, ClaimStatus, EventType, ReportStatus } from "../src/generated/prisma/enums";

export const DEMO_PASSWORD = "CampusTrace1!";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = Date.now();
const ago = (ms: number) => new Date(now - ms);
/** Midnight UTC of the day `days` days ago: the format of Report.occurredOn. */
const dayAgo = (days: number) => new Date(`${ago(days * DAY).toISOString().slice(0, 10)}T00:00:00Z`);

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The seed script deletes all data and will not run in production.");
  }

  // Order matters: children before the rows they point to.
  await db.notification.deleteMany();
  await db.workflowEvent.deleteMany();
  await db.attachment.deleteMany();
  await db.claim.deleteMany();
  await db.report.deleteMany();
  await db.collectionPoint.deleteMany();
  await db.user.deleteMany();

  // --- People -------------------------------------------------------------------
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const person = (name: string, email: string, role: "STUDENT" | "ADMIN", studentNumber?: string) =>
    db.user.create({ data: { name, email, role, studentNumber, passwordHash } });

  const desk = await person("Abena Owusu", "desk@ucc.edu.gh", "ADMIN");
  const kofi = await person("Kofi Mensah", "kofi.mensah@stu.ucc.edu.gh", "STUDENT", "PS/CSC/22/0041");
  const ama = await person("Ama Boateng", "ama.boateng@stu.ucc.edu.gh", "STUDENT", "AR/ENG/23/0118");
  const yaw = await person("Yaw Asante", "yaw.asante@stu.ucc.edu.gh", "STUDENT", "SB/ACC/21/0207");
  const esi = await person("Esi Quansah", "esi.quansah@stu.ucc.edu.gh", "STUDENT", "ED/MTH/22/0093");

  // --- Collection points -----------------------------------------------------------
  const library = await db.collectionPoint.create({
    data: {
      name: "Sam Jonah Library help desk",
      location: "Ground floor, Sam Jonah Library",
      openingHours: "Mon to Fri 8 am to 8 pm, Sat 9 am to 4 pm",
    },
  });
  const dean = await db.collectionPoint.create({
    data: {
      name: "Dean of Students' office",
      location: "Office of the Dean of Students",
      openingHours: "Mon to Fri 8:30 am to 4:30 pm",
    },
  });
  await db.collectionPoint.create({
    data: {
      name: "SRC secretariat",
      location: "Students' Representative Council office",
      openingHours: "Mon to Fri 9 am to 5 pm",
    },
  });

  // --- Helpers ---------------------------------------------------------------------
  let counter = 0;
  /** Fixed, readable references so the demo looks the same every time. */
  const reference = (prefix: "CT" | "CL") => {
    counter += 1;
    const codes = ["7KQ2MX", "4HT9PB", "9D3WFA", "2MZ8RC", "6XJ4NE", "8PV7GS", "3BY5KD", "5RC2TH", "9WA6QJ", "4NE8XM", "7GS3BV", "2KD9YP", "6TH4RZ", "8QJ7WC", "3XM5AN", "5BV2ET", "9YP6SG", "4RZ8DK", "7WC3HM", "2AN9JQ"];
    return `${prefix}-${codes[counter % codes.length]}`;
  };

  const event = (type: EventType, message: string, reportId: string, actorId: string, at: Date, claimId?: string) =>
    db.workflowEvent.create({ data: { type, message, reportId, actorId, claimId, createdAt: at } });

  const tell = (userId: string, title: string, body: string, href: string, at: Date, read = false) =>
    db.notification.create({
      data: { userId, title, body, href, createdAt: at, readAt: read ? at : null },
    });

  type FoundSeed = {
    title: string;
    category: Category;
    description: string;
    privateDetails: string;
    area: string;
    locationDetail?: string;
    foundDaysAgo: number;
    finderId: string;
    status: ReportStatus;
    dropOff: { id: string; name: string };
    custodyTag?: string;
  };

  async function foundItem(seed: FoundSeed) {
    const reportedAt = ago(seed.foundDaysAgo * DAY - 2 * HOUR);
    const inCustody = seed.status === "IN_CUSTODY" || seed.status === "RETURNED";
    const custodyAt = new Date(reportedAt.getTime() + 5 * HOUR);
    const report = await db.report.create({
      data: {
        reference: reference("CT"),
        kind: "FOUND",
        status: seed.status,
        title: seed.title,
        category: seed.category,
        description: seed.description,
        privateDetails: seed.privateDetails,
        area: seed.area,
        locationDetail: seed.locationDetail,
        occurredOn: dayAgo(seed.foundDaysAgo),
        photoPublic: seed.category !== "ID_AND_BANK_CARDS",
        reporterId: seed.finderId,
        dropOffPointId: seed.dropOff.id,
        custodyPointId: inCustody ? seed.dropOff.id : null,
        custodyTag: inCustody ? seed.custodyTag : null,
        custodyRecordedAt: inCustody ? custodyAt : null,
        custodyRecordedById: inCustody ? desk.id : null,
        createdAt: reportedAt,
      },
    });
    await event("REPORT_PUBLISHED", "Found item reported and published.", report.id, seed.finderId, reportedAt);
    if (inCustody) {
      await event("CUSTODY_RECORDED", `Item received at ${seed.dropOff.name}.`, report.id, desk.id, custodyAt);
    }
    return { report, reportedAt, custodyAt };
  }

  async function lostItem(seed: {
    title: string;
    category: Category;
    description: string;
    privateDetails?: string;
    area: string;
    locationDetail?: string;
    lostDaysAgo: number;
    ownerId: string;
    status?: ReportStatus;
  }) {
    const reportedAt = ago(seed.lostDaysAgo * DAY - 6 * HOUR);
    const report = await db.report.create({
      data: {
        reference: reference("CT"),
        kind: "LOST",
        status: seed.status ?? "OPEN",
        title: seed.title,
        category: seed.category,
        description: seed.description,
        privateDetails: seed.privateDetails,
        area: seed.area,
        locationDetail: seed.locationDetail,
        occurredOn: dayAgo(seed.lostDaysAgo),
        reporterId: seed.ownerId,
        createdAt: reportedAt,
      },
    });
    await event("REPORT_PUBLISHED", "Lost item reported and published.", report.id, seed.ownerId, reportedAt);
    return report;
  }

  async function claim(seed: {
    reportId: string;
    claimantId: string;
    status: ClaimStatus;
    statement: string;
    submittedAt: Date;
    lostReportId?: string;
    collectionAt?: Date;
    handedOverAt?: Date;
    receiptConfirmedAt?: Date;
  }) {
    const reviewed = seed.status !== "SUBMITTED";
    const reviewedAt = new Date(seed.submittedAt.getTime() + 3 * HOUR);
    const created = await db.claim.create({
      data: {
        reference: reference("CL"),
        status: seed.status,
        reportId: seed.reportId,
        claimantId: seed.claimantId,
        lostReportId: seed.lostReportId,
        statement: seed.statement,
        reviewedAt: reviewed ? reviewedAt : null,
        reviewedById: reviewed ? desk.id : null,
        collectionAt: seed.collectionAt,
        handedOverAt: seed.handedOverAt,
        handedOverById: seed.handedOverAt ? desk.id : null,
        receiptConfirmedAt: seed.receiptConfirmedAt,
        createdAt: seed.submittedAt,
      },
    });
    await event("CLAIM_SUBMITTED", "Ownership claim submitted.", seed.reportId, seed.claimantId, seed.submittedAt, created.id);
    if (reviewed) {
      await event("CLAIM_APPROVED", "Claim approved.", seed.reportId, desk.id, reviewedAt, created.id);
    }
    return { claim: created, reviewedAt };
  }

  // --- Found items at every stage of the journey ---------------------------------------

  // 1. Just reported: the finder still has it.
  const charger = await foundItem({
    title: "Black HP laptop charger",
    category: "ELECTRONICS",
    description: "A black HP laptop charger with a round barrel plug, left plugged in at a reading desk.",
    privateDetails: "Small strip of green tape wrapped around the cable near the plug.",
    area: "Sam Jonah Library",
    locationDetail: "Second floor reading room, desk by the window",
    foundDaysAgo: 1,
    finderId: kofi.id,
    status: "OPEN",
    dropOff: library,
  });
  await tell(desk.id, "New found item to expect", `Black HP laptop charger (${charger.report.reference}). The finder plans to drop it off at ${library.name}.`, `/reports/${charger.report.id}`, charger.reportedAt);

  // 2. In custody, nobody has claimed it.
  await foundItem({
    title: "Silver wristwatch",
    category: "JEWELLERY_AND_WATCHES",
    description: "A silver analogue wristwatch with a metal strap, found on the stands after evening training.",
    privateDetails: "Casio brand. Engraved on the back: “To K. from Mum, 2021”.",
    area: "Sports complex",
    foundDaysAgo: 6,
    finderId: ama.id,
    status: "IN_CUSTODY",
    dropOff: dean,
    custodyTag: "DS-014",
  });

  // 3. In custody with a claim waiting for review.
  const idCard = await foundItem({
    title: "Student ID card",
    category: "ID_AND_BANK_CARDS",
    description: "A University of Cape Coast student ID card found near the food stalls.",
    privateDetails: "Name on the card: Esi Quansah. Programme: B.Ed. Mathematics.",
    area: "Science Market",
    foundDaysAgo: 3,
    finderId: yaw.id,
    status: "IN_CUSTODY",
    dropOff: library,
    custodyTag: "LIB-A3",
  });
  const idClaim = await claim({
    reportId: idCard.report.id,
    claimantId: esi.id,
    status: "SUBMITTED",
    statement: "It is my student ID. My name is Esi Quansah and I am in Level 300, B.Ed. Mathematics. I lost it on the way back from Science Market on Monday afternoon.",
    submittedAt: ago(20 * HOUR),
  });
  await tell(desk.id, "New claim to review", `${idClaim.claim.reference} on Student ID card (${idCard.report.reference}).`, `/claims/${idClaim.claim.id}`, ago(20 * HOUR));

  // 4. The custody gate: claim approved, but the finder has not dropped it off.
  const backpack = await foundItem({
    title: "Blue backpack",
    category: "BAGS",
    description: "A blue backpack left under a seat in the back row after the 9 am lecture.",
    privateDetails: "JanSport. Contains a yellow umbrella and an STA 201 statistics textbook with “K. Mensah” written inside the cover.",
    area: "Large Lecture Theatre (LLT)",
    locationDetail: "Back row, left side",
    foundDaysAgo: 2,
    finderId: esi.id,
    status: "OPEN",
    dropOff: dean,
  });
  const backpackClaim = await claim({
    reportId: backpack.report.id,
    claimantId: kofi.id,
    status: "APPROVED",
    statement: "It is a blue JanSport. Inside there is a yellow umbrella and my STA 201 textbook with my name, K. Mensah, on the inside cover. I sat in the back row on the left.",
    submittedAt: ago(30 * HOUR),
  });
  await tell(kofi.id, "Your claim was approved", "We are waiting for the finder to deliver your Blue backpack to a collection point. You will hear from us when it arrives.", `/claims/${backpackClaim.claim.id}`, backpackClaim.reviewedAt);
  await tell(esi.id, "Someone has claimed the item you found", `Please drop the Blue backpack off at ${dean.name} so it can be returned.`, `/reports/${backpack.report.id}`, ago(30 * HOUR));

  // 5. Collection arranged for tomorrow morning.
  const amaLostCalculator = await lostItem({
    title: "Casio scientific calculator",
    category: "ELECTRONICS",
    description: "A Casio fx-991 scientific calculator in a black slide-on cover. I think I left it in the exam hall.",
    privateDetails: "My initials A.B. are scratched on the back of the cover.",
    area: "New Examination Centre (NEC)",
    lostDaysAgo: 5,
    ownerId: ama.id,
  });
  const calculator = await foundItem({
    title: "Scientific calculator",
    category: "ELECTRONICS",
    description: "A scientific calculator with a slide-on cover, found on a desk after the afternoon paper.",
    privateDetails: "Casio fx-991EX. Initials “A.B.” scratched on the back of the cover.",
    area: "New Examination Centre (NEC)",
    locationDetail: "Hall B",
    foundDaysAgo: 5,
    finderId: kofi.id,
    status: "IN_CUSTODY",
    dropOff: library,
    custodyTag: "LIB-B7",
  });
  const collectionAt = new Date(`${new Date(now + DAY).toISOString().slice(0, 10)}T10:00:00Z`);
  const calculatorClaim = await claim({
    reportId: calculator.report.id,
    claimantId: ama.id,
    status: "COLLECTION_SCHEDULED",
    statement: "It is a Casio fx-991EX with a black cover. I scratched my initials, A.B., on the back of the cover in first year. I sat my paper in Hall B.",
    submittedAt: ago(3 * DAY),
    lostReportId: amaLostCalculator.id,
    collectionAt,
  });
  await event("COLLECTION_SCHEDULED", `Collection arranged at ${library.name}.`, calculator.report.id, desk.id, ago(2 * DAY), calculatorClaim.claim.id);
  await tell(ama.id, "Your collection time is set", `Collect your Scientific calculator tomorrow at 10:00 am at ${library.name}. Bring your student ID.`, `/claims/${calculatorClaim.claim.id}`, ago(2 * DAY));

  // 6. Handed over; the owner still has to confirm receipt.
  const wallet = await foundItem({
    title: "Brown leather wallet",
    category: "WALLETS",
    description: "A brown leather wallet found on a seat on the Old Site to Science shuttle.",
    privateDetails: "Contains a GCB bank card in the name E. Quansah and a passport photo. No cash.",
    area: "Campus shuttle",
    foundDaysAgo: 8,
    finderId: yaw.id,
    status: "RETURNED",
    dropOff: dean,
    custodyTag: "DS-009",
  });
  const walletClaim = await claim({
    reportId: wallet.report.id,
    claimantId: esi.id,
    status: "HANDED_OVER",
    statement: "Brown leather wallet with my GCB bank card (E. Quansah) and a passport photo of me in a white shirt. There was no cash in it.",
    submittedAt: ago(6 * DAY),
    collectionAt: ago(1 * DAY),
    handedOverAt: ago(22 * HOUR),
  });
  await event("COLLECTION_SCHEDULED", `Collection arranged at ${dean.name}.`, wallet.report.id, desk.id, ago(5 * DAY), walletClaim.claim.id);
  await event("HANDOVER_RECORDED", "Item returned to its owner.", wallet.report.id, desk.id, ago(22 * HOUR));
  await event("HANDOVER_RECORDED", "Handover recorded. The collector's student ID was checked.", wallet.report.id, desk.id, ago(22 * HOUR), walletClaim.claim.id);
  await tell(esi.id, "Please confirm you have your item", "The desk recorded handing over your Brown leather wallet. Confirm receipt to finish.", `/claims/${walletClaim.claim.id}`, ago(22 * HOUR));
  await tell(yaw.id, "It is back with its owner", "The Brown leather wallet you found has been returned. Thank you.", `/reports/${wallet.report.id}`, ago(22 * HOUR), true);

  // 7. A finished return, with the owner's lost report linked.
  const yawLostKeys = await lostItem({
    title: "Bunch of keys on a red lanyard",
    category: "KEYS",
    description: "Three keys on a red lanyard. I had them at the hall porter's lodge.",
    area: "Oguaa Hall",
    lostDaysAgo: 12,
    ownerId: yaw.id,
    status: "RETURNED",
  });
  await event("REPORT_RESOLVED", "The owner has the item back.", yawLostKeys.id, desk.id, ago(9 * DAY));
  const keys = await foundItem({
    title: "Keys on a red lanyard",
    category: "KEYS",
    description: "A small bunch of keys on a red lanyard, found on the steps outside the hall.",
    privateDetails: "Three keys. The lanyard is printed with “Oguaa Hall Week 2025”. One key has a blue rubber cap.",
    area: "Oguaa Hall",
    foundDaysAgo: 12,
    finderId: ama.id,
    status: "RETURNED",
    dropOff: library,
    custodyTag: "LIB-A1",
  });
  const keysClaim = await claim({
    reportId: keys.report.id,
    claimantId: yaw.id,
    status: "COMPLETED",
    statement: "Three keys on a red Oguaa Hall Week 2025 lanyard. The room key has a blue rubber cap on it.",
    submittedAt: ago(11 * DAY),
    lostReportId: yawLostKeys.id,
    collectionAt: ago(9 * DAY),
    handedOverAt: ago(9 * DAY),
    receiptConfirmedAt: ago(9 * DAY - 2 * HOUR),
  });
  await event("COLLECTION_SCHEDULED", `Collection arranged at ${library.name}.`, keys.report.id, desk.id, ago(10 * DAY), keysClaim.claim.id);
  await event("HANDOVER_RECORDED", "Item returned to its owner.", keys.report.id, desk.id, ago(9 * DAY));
  await event("HANDOVER_RECORDED", "Handover recorded. The collector's student ID was checked.", keys.report.id, desk.id, ago(9 * DAY), keysClaim.claim.id);
  await event("RECEIPT_CONFIRMED", "The owner confirmed receipt.", keys.report.id, yaw.id, ago(9 * DAY - 2 * HOUR), keysClaim.claim.id);

  // 8. More items so that browsing and search have something to show.
  await foundItem({
    title: "Grey hooded sweatshirt",
    category: "CLOTHING",
    description: "A grey hooded sweatshirt left over the back of a chair in a seminar room.",
    privateDetails: "Size M. Small bleach mark on the left cuff. A bus ticket in the pocket.",
    area: "C. A. Ackah Lecture Theatre Complex (CALC)",
    foundDaysAgo: 4,
    finderId: esi.id,
    status: "IN_CUSTODY",
    dropOff: library,
    custodyTag: "LIB-C2",
  });
  await foundItem({
    title: "Wireless earbuds in a white case",
    category: "ELECTRONICS",
    description: "A pair of wireless earbuds in a white charging case, found on a table in the canteen area.",
    privateDetails: "Case has a small sticker of a football on the lid. Only the left earbud is inside.",
    area: "School of Business",
    foundDaysAgo: 2,
    finderId: yaw.id,
    status: "IN_CUSTODY",
    dropOff: dean,
    custodyTag: "DS-017",
  });

  await lostItem({
    title: "Navy blue umbrella",
    category: "OTHER",
    description: "A navy blue folding umbrella with a wooden handle. I left it outside a lecture room.",
    area: "Faculty of Arts",
    lostDaysAgo: 2,
    ownerId: kofi.id,
  });
  await lostItem({
    title: "Organic chemistry lecture notes",
    category: "BOOKS_AND_NOTES",
    description: "A red A4 hardcover notebook, about half full of CHE 203 notes and diagrams.",
    privateDetails: "My name and index number are on the first page.",
    area: "Science Market",
    locationDetail: "Probably at one of the photocopy stands",
    lostDaysAgo: 3,
    ownerId: esi.id,
  });
  await lostItem({
    title: "Black power bank",
    category: "ELECTRONICS",
    description: "A black 20,000 mAh power bank with a short white cable attached.",
    area: "Kwame Nkrumah Hall",
    lostDaysAgo: 1,
    ownerId: yaw.id,
  });

  console.log("Seeded CampusTrace demo data.");
  console.log(`  Desk (administrator): desk@ucc.edu.gh / ${DEMO_PASSWORD}`);
  console.log(`  Students: kofi.mensah, ama.boateng, yaw.asante, esi.quansah @stu.ucc.edu.gh / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
