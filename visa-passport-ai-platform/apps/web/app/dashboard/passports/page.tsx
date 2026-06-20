import { PassportUploadWorkspace } from "@/components/dashboard/passport-upload-workspace";
import { PageHeader } from "@/components/shared/page-header";

export default function PassportsPage() {
  return <><PageHeader eyebrow="AI document intake" title="Passport extraction" description="Submit a secure document reference, track OCR progress, and review extracted fields." /><PassportUploadWorkspace /></>;
}
