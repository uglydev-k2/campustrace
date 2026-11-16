import { CalendarDays, EyeOff, Lock, MapPin, Shapes } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryIcon } from "@/components/category-icon";
import { Disclosure } from "@/components/disclosure";
import { CloseReportForm, CustodyForm, ResolveLostForm } from "@/components/forms/workflow-forms";
import { JourneyTrack } from "@/components/journey-track";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { getCurrentUser } from "@/lib/auth";
import { CATEGORY_LABELS } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { claimStatusLabel, kindLabel, reportStatusLabel } from "@/lib/labels";
import {
  canViewReport,
  canViewReportPhoto,
  canViewReportPrivate,
  isAdmin,
  isPhotoPublic,
} from "@/lib/workflow/access";
import { buildJourney } from "@/lib/workflow/journey";
import {
  ACCEPTED_CLAIM_STATUSES,
  canCloseReport,
  canRecordCustody,
  canResolveLostReport,
  canSubmitClaim,
} from "@/lib/workflow/rules";
import { activeCollectionPoints } from "@/server/queries";

export const metadata: Metadata = { title: "Report" };

export default async function ReportPage({ params, searchParams }: PageProps<"/reports/[id]">) {
  const { id } = await params;
  const { notice } = await searchParams;
  const viewer = await getCurrentUser();

  const report = await db.report.findUnique({
    where: { id },
    include: {
      reporter: { select: { name: true, email: true } },
      dropOffPoint: true,
      custodyPoint: true,
      photos: { select: { id: true }, take: 1 },
      // Public timeline only: events tied to a claim are private.
      events: { where: { claimId: null }, orderBy: { createdAt: "asc" } },
      claims: {
        select: {
          id: true,
          reference: true,
          status: true,
          claimantId: true,
          createdAt: true,
          claimant: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!report || !canViewReport(viewer, report)) notFound();

  const found = report.kind === "FOUND";
  const admin = isAdmin(viewer);
  const isReporter = viewer?.id === report.reporterId;
  const seesPrivate = canViewReportPrivate(viewer, report);
  const status = reportStatusLabel(report.kind, report.status);

  const photo = report.photos[0];
  const showPhoto = photo && canViewReportPhoto(viewer, report);
  const photoHiddenFromPublic = photo && !isPhotoPublic(report);

  const myClaim = viewer ? report.claims.find((claim) => claim.claimantId === viewer.id) : undefined;
  const acceptedClaim = report.claims.find((claim) => ACCEPTED_CLAIM_STATUSES.includes(claim.status));
  // The claimant sees their own progress. The finder and the desk see how far
  // the accepted claim has got. Everyone else sees only custody and return.
  const journeyClaim = myClaim ?? (seesPrivate ? acceptedClaim : undefined);

  // Visitors get the same answer a student would, so a returned or closed
  // item never shows a "sign in to claim" link that leads nowhere.
  const claimDecision = canSubmitClaim({
    report,
    actor: viewer ?? { id: "", role: "STUDENT" },
    alreadyClaimedByActor: myClaim !== undefined,
  });
  const canClose =
    viewer !== null &&
    canCloseReport({ report, actor: viewer, hasAcceptedClaim: acceptedClaim !== undefined }).ok;
  const canCustody = viewer !== null && canRecordCustody({ report, actor: viewer }).ok;
  const canResolve = viewer !== null && canResolveLostReport({ report, actor: viewer }).ok;
  const points = canCustody ? await activeCollectionPoints() : [];

  return (
    <>
      <PageHeader
        back={{ href: "/browse", label: "Browse items" }}
        title={report.title}
        meta={
          <>
            <span
              className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-caption font-medium ring-1 ring-inset ${
                found ? "bg-brand-50 text-brand-800 ring-brand-100" : "bg-lost-50 text-lost-800 ring-lost-100"
              }`}
            >
              {kindLabel(report.kind)} item
            </span>
            <StatusBadge {...status} />
            <span className="type-reference text-caption text-ink-faint">{report.reference}</span>
          </>
        }
      />

    <div className="container-page pt-8">
      <Notice code={typeof notice === "string" ? notice : undefined} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        {/* ---- The report ---------------------------------------------------- */}
        <div className="min-w-0 space-y-8">
          <dl className="panel grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Fact icon={<MapPin aria-hidden className="size-4" />} term={found ? "Found at" : "Lost around"}>
              {report.area}
              {report.locationDetail && <span className="block font-normal text-ink-soft">{report.locationDetail}</span>}
            </Fact>
            <Fact icon={<CalendarDays aria-hidden className="size-4" />} term={found ? "Found on" : "Lost on"}>
              {formatDate(report.occurredOn)}
            </Fact>
            <Fact icon={<Shapes aria-hidden className="size-4" />} term="Category">
              {CATEGORY_LABELS[report.category]}
            </Fact>
          </dl>

          <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
            {showPhoto ? (
              <figure className="sm:w-64">
                {/* Private route with a permission check: see /api/files/[id]. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/files/${photo.id}`}
                  alt={`Photo of the ${report.title}`}
                  decoding="async"
                  className="w-full rounded-lg border border-line bg-sunken object-cover shadow-xs"
                />
                {photoHiddenFromPublic && (
                  <figcaption className="mt-2 flex items-start gap-1.5 text-caption text-ink-soft">
                    <EyeOff aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                    Only you and desk staff can see this photo.
                  </figcaption>
                )}
              </figure>
            ) : (
              <div className="grid size-24 place-items-center rounded-lg border border-line bg-surface text-ink-faint shadow-xs">
                <CategoryIcon category={report.category} className="size-9" />
              </div>
            )}
            <div>
              <h2 className="type-card">Description</h2>
              <p className="mt-2 max-w-prose whitespace-pre-line text-ink">{report.description}</p>
              {!showPhoto && photo && (
                <p className="mt-3 flex items-start gap-1.5 text-small text-ink-soft">
                  <EyeOff aria-hidden className="mt-0.5 size-4 shrink-0" />
                  The photo is kept private so the item can only be claimed by someone who can
                  describe it.
                </p>
              )}
            </div>
          </div>

          {seesPrivate && (
            <section className="rounded-lg border border-dashed border-line-strong bg-sunken/60 p-5">
              <h2 className="type-card flex items-center gap-2">
                <Lock aria-hidden className="size-4 text-ink-faint" />
                Private to {admin ? "the desk and the reporter" : "you and the desk"}
              </h2>
              <dl className="mt-3 space-y-3">
                <div>
                  <dt className="text-caption font-medium text-ink-faint">
                    {found ? "Details only the owner would know" : "Private details"}
                  </dt>
                  <dd className="whitespace-pre-line">{report.privateDetails ?? "None given."}</dd>
                </div>
                {admin && (
                  <div>
                    <dt className="text-caption font-medium text-ink-faint">Reported by</dt>
                    <dd>
                      {report.reporter.name} ({report.reporter.email})
                    </dd>
                  </div>
                )}
                {report.custodyTag && (
                  <div>
                    <dt className="text-caption font-medium text-ink-faint">Stored at</dt>
                    <dd>
                      {report.custodyPoint?.name}, shelf{" "}
                      <span className="type-reference">{report.custodyTag}</span>
                      {report.custodyRecordedAt && `, since ${formatDateTime(report.custodyRecordedAt)}`}
                    </dd>
                  </div>
                )}
                {report.closedReason && (
                  <div>
                    <dt className="text-caption font-medium text-ink-faint">Reason for closing</dt>
                    <dd>{report.closedReason}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {found && report.status !== "CLOSED" && (
            <section className="panel">
              <h2 className="panel-header type-card">Where this item is in its journey</h2>
              <div className="p-5 sm:p-6">
                <JourneyTrack steps={buildJourney(report.status, journeyClaim?.status ?? null)} />
              </div>
            </section>
          )}

          <section className="panel">
            <h2 className="panel-header type-card">History</h2>
            <div className="p-5">
              <Timeline events={report.events} />
            </div>
          </section>
        </div>

        {/* ---- What you can do ------------------------------------------------ */}
        {/* On small screens the actions come before the long description. */}
        <aside className="order-first space-y-4 empty:hidden lg:sticky lg:top-20 lg:order-none lg:self-start">
          {/* Someone who might own a found item */}
          {found && !isReporter && !admin && (
            <div className="panel p-5">
              {myClaim ? (
                <>
                  <h2 className="type-card">You have claimed this item</h2>
                  <p className="mt-1.5 text-small text-ink-soft">
                    Your claim <span className="type-reference">{myClaim.reference}</span> is:{" "}
                    {claimStatusLabel(myClaim.status).text.toLowerCase()}.
                  </p>
                  <Link href={`/claims/${myClaim.id}`} className="btn btn-primary mt-4 w-full">
                    Open my claim
                  </Link>
                </>
              ) : !claimDecision.ok ? (
                <>
                  <h2 className="type-card">Not available to claim</h2>
                  <p className="mt-1.5 text-small text-ink-soft">{claimDecision.reason}</p>
                </>
              ) : (
                <>
                  <h2 className="type-card">Is this yours?</h2>
                  <p className="mt-1.5 text-small text-ink-soft">
                    Tell the desk how you can show it is yours. Your answer stays private.
                    {report.status === "OPEN" &&
                      " You can claim it now, while the finder is still on the way to a collection point."}
                  </p>
                  <Link
                    href={viewer ? `/reports/${id}/claim` : `/login?next=${encodeURIComponent(`/reports/${id}/claim`)}`}
                    className="btn btn-primary mt-4 w-full"
                  >
                    {viewer ? "Claim this item" : "Sign in to claim this item"}
                  </Link>
                </>
              )}
            </div>
          )}

          {/* The finder */}
          {found && isReporter && (
            <div className="panel p-5">
              {report.status === "OPEN" && (
                <>
                  <h2 className="type-card">Next: drop it off</h2>
                  <p className="mt-1.5 text-small text-ink-soft">
                    Take the item to <strong className="text-ink">{report.dropOffPoint?.name}</strong>{" "}
                    ({report.dropOffPoint?.location}; {report.dropOffPoint?.openingHours}) and give
                    the desk this reference:
                  </p>
                  <p className="type-reference mt-4 rounded-md border border-dashed border-line-strong bg-paper px-3 py-3 text-center text-section tracking-[0.08em] text-ink">
                    {report.reference}
                  </p>
                </>
              )}
              {report.status === "IN_CUSTODY" && (
                <>
                  <h2 className="type-card">Thank you for handing it in</h2>
                  <p className="mt-1.5 text-small text-ink-soft">
                    {report.custodyPoint?.name} is looking after the item until its owner collects
                    it. There is nothing more you need to do.
                  </p>
                </>
              )}
              {report.status === "RETURNED" && (
                <>
                  <h2 className="type-card">Back with its owner</h2>
                  <p className="mt-1.5 text-small text-ink-soft">
                    The item you found has been returned. Thank you for taking the trouble.
                  </p>
                </>
              )}
              {report.status === "CLOSED" && (
                <>
                  <h2 className="type-card">This report is closed</h2>
                  <p className="mt-1.5 text-small text-ink-soft">It no longer appears in search.</p>
                </>
              )}
            </div>
          )}

          {/* The person who lost something */}
          {!found && isReporter && (
            <div className="panel p-5">
              {canResolve ? (
                <>
                  <h2 className="type-card">Found it?</h2>
                  <p className="mt-1.5 mb-4 text-small text-ink-soft">
                    Let everyone know they can stop looking. If you see your item among the found
                    reports, claim it there and link this report as evidence.
                  </p>
                  <ResolveLostForm reportId={id} />
                  <Link href="/browse?kind=FOUND" className="link mt-4 inline-block text-small">
                    Check the found items
                  </Link>
                </>
              ) : (
                <>
                  <h2 className="type-card">{report.status === "RETURNED" ? "You have it back" : "This report is closed"}</h2>
                  <p className="mt-1.5 text-small text-ink-soft">It no longer appears among the open reports.</p>
                </>
              )}
            </div>
          )}

          {/* Anyone looking at someone else's lost report */}
          {!found && !isReporter && report.status === "OPEN" && (
            <div className="panel p-5">
              <h2 className="type-card">Have you found this?</h2>
              <p className="mt-1.5 text-small text-ink-soft">
                Report it as a found item and drop it at a collection point. The desk will match
                it with this report and contact the owner.
              </p>
              <Link href="/report/found" className="btn btn-primary mt-4 w-full">
                Report it as found
              </Link>
            </div>
          )}

          {/* The desk */}
          {admin && found && (
            <div className="panel p-5">
              <DeskLabel />
              <h2 className="type-card">Custody</h2>
              {canCustody ? (
                <>
                  <p className="mt-1.5 mb-4 text-small text-ink-soft">
                    Record custody when the finder hands the item over. Collection cannot be
                    scheduled until you do.
                  </p>
                  <CustodyForm
                    reportId={id}
                    points={points.map((point) => ({ id: point.id, name: point.name }))}
                    plannedPointId={report.dropOffPointId}
                  />
                </>
              ) : report.custodyPoint ? (
                <p className="mt-1.5 text-small text-ink-soft">
                  Held at {report.custodyPoint.name}, shelf{" "}
                  <span className="type-reference text-ink">{report.custodyTag}</span>.
                </p>
              ) : (
                <p className="mt-1.5 text-small text-ink-soft">Custody was never recorded for this item.</p>
              )}
            </div>
          )}

          {admin && found && (
            <div className="panel p-5">
              <DeskLabel />
              <h2 className="type-card">Claims on this item</h2>
              {report.claims.length === 0 ? (
                <p className="mt-1.5 text-small text-ink-soft">Nobody has claimed this item yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {report.claims.map((claim) => (
                    <li key={claim.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div>
                        <Link href={`/claims/${claim.id}`} className="link">
                          {claim.reference}
                        </Link>
                        <p className="text-small text-ink-soft">
                          {claim.claimant.name}, {formatDate(claim.createdAt)}
                        </p>
                      </div>
                      <StatusBadge {...claimStatusLabel(claim.status)} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {canClose && (
            <div className="px-1 pt-1">
              <Disclosure summary={isReporter ? "Withdraw this report" : "Close this report"}>
                <CloseReportForm reportId={id} byAdmin={!isReporter} />
              </Disclosure>
            </div>
          )}
        </aside>
      </div>
    </div>
    </>
  );
}

/** Marks a panel as a desk-only tool, so staff can tell it from the student view. */
function DeskLabel() {
  return (
    <p className="mb-2 inline-flex items-center gap-1.5 rounded-sm bg-navy-900 px-1.5 py-0.5 text-[0.6875rem] font-medium text-white">
      Desk only
    </p>
  );
}

function Fact({
  icon,
  term,
  children,
}: {
  icon: React.ReactNode;
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 p-4">
      <span className="mt-0.5 shrink-0 text-ink-faint">{icon}</span>
      <div className="min-w-0">
        <dt className="text-caption text-ink-faint">{term}</dt>
        <dd className="text-small font-medium text-ink">{children}</dd>
      </div>
    </div>
  );
}
