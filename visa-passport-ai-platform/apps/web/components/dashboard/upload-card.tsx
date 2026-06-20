import Link from "next/link";

import { Icon } from "@/components/shared/icon";

export function UploadCard() {
  return <div className="upload-card"><div className="upload-copy"><span className="upload-icon"><Icon name="scan" /></span><div><small>AI passport scanner</small><h2>Turn a passport into<br />structured data in seconds.</h2><p>JPEG, PNG, WebP, or PDF · Up to 15 MB</p></div><Link className="upload-action" href="/dashboard/passports"><Icon name="upload" /> Upload passport</Link></div><div className="upload-visual"><div className="upload-passport"><Icon name="passport" /><span /><span /><span /></div><div className="upload-beam" /><div className="upload-result"><Icon name="check" /><span><small>Confidence</small><strong>AI OCR</strong></span></div></div></div>;
}
