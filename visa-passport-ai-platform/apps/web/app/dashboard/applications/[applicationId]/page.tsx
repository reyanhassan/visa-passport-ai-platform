import { ApplicationDetailWorkspace } from "@/components/dashboard/application-detail-workspace";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  return <ApplicationDetailWorkspace applicationId={applicationId} />;
}
