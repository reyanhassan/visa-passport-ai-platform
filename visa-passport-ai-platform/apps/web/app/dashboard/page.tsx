import { decryptField, maskPassportNumber } from "@visa-platform/config/security";
import { ExtractionJobStatus, prisma, VisaApplicationStatus } from "@visa-platform/database";

import { ApplicationTable } from "@/components/dashboard/application-table";
import { PassportTable, type PassportTableRow } from "@/components/dashboard/passport-table";
import { UploadCard } from "@/components/dashboard/upload-card";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { requireCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

const countryNames: Record<string, string> = {
  AE: "United Arab Emirates", AU: "Australia", CA: "Canada", GB: "United Kingdom",
  PK: "Pakistan", SA: "Saudi Arabia", SG: "Singapore", TR: "Türkiye",
};

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const [jobs, applications, totalPassports, completedPassports] = await Promise.all([
    prisma.passportExtractionJob.findMany({
      where: { userId: user.id, status: ExtractionJobStatus.COMPLETED },
      include: { extractedData: { select: { passportNumberEncrypted: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.visaApplication.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
    prisma.passportExtractionJob.count({ where: { userId: user.id } }),
    prisma.passportExtractionJob.count({ where: { userId: user.id, status: ExtractionJobStatus.COMPLETED } }),
  ]);

  const activeStatuses = new Set<VisaApplicationStatus>([
    VisaApplicationStatus.DRAFT,
    VisaApplicationStatus.SUBMITTED,
    VisaApplicationStatus.IN_REVIEW,
  ]);
  const activeApplications = applications.filter((item) => activeStatuses.has(item.status)).length;
  const scans: PassportTableRow[] = jobs.map((job) => ({
    id: job.id,
    holder: user.name,
    country: countryNames[job.countryHint ?? ""] ?? job.countryHint ?? "Unknown country",
    code: job.countryHint ?? "--",
    number: job.extractedData ? maskPassportNumber(decryptField(job.extractedData.passportNumberEncrypted)) : "—",
    scanned: formatDate(job.createdAt.toISOString()),
    confidence: Math.round(Number(job.confidence ?? 0) * 100),
    status: "Verified",
  }));
  const applicationData = applications.map((application) => ({
    ...application,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
  }));
  const minutesSaved = completedPassports * 8;

  return <><PageHeader eyebrow="Overview" title="Your mobility workspace" description="Scan documents, monitor applications, and keep every trip moving." /><div className="stats-grid"><StatCard label="Passports" value={String(totalPassports)} detail={`${completedPassports} completed extraction${completedPassports === 1 ? "" : "s"}`} icon="passport" tone="violet" /><StatCard label="Active applications" value={String(activeApplications)} detail={`${applications.length} recent application${applications.length === 1 ? "" : "s"}`} icon="file" tone="cyan" /><StatCard label="Ready to submit" value={String(applications.filter((item) => item.status === VisaApplicationStatus.APPROVED).length)} detail="Approved applications" icon="check" tone="amber" /><StatCard label="Time saved" value={`${Math.floor(minutesSaved / 60)}h ${minutesSaved % 60}m`} detail="Estimated from automated extraction" icon="trend" tone="rose" /></div><UploadCard /><div className="dashboard-sections"><SectionCard title="Recent passport scans" subtitle="AI-extracted document records" href="/dashboard/passports"><PassportTable compact scans={scans} /></SectionCard><SectionCard title="Recent visa applications" subtitle="Your latest application activity" href="/dashboard/applications">{applicationData.length ? <ApplicationTable compact applications={applicationData} /> : <div className="table-empty-state">No visa applications yet.</div>}</SectionCard></div></>;
}
