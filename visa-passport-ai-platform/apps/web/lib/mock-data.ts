export const passportScans = [
  { id: "PS-1048", holder: "Alex Morgan", country: "United Kingdom", code: "GB", number: "•••• 4821", scanned: "2 min ago", confidence: 99.4, status: "Verified" },
  { id: "PS-1047", holder: "Nadia Hassan", country: "Pakistan", code: "PK", number: "•••• 7734", scanned: "1 hour ago", confidence: 98.8, status: "Verified" },
  { id: "PS-1046", holder: "Daniel Kim", country: "South Korea", code: "KR", number: "•••• 1092", scanned: "Yesterday", confidence: 94.2, status: "Review" },
  { id: "PS-1045", holder: "Lina Costa", country: "Portugal", code: "PT", number: "•••• 6208", scanned: "Jun 17", confidence: 99.1, status: "Verified" },
];

export const visaApplications = [
  { id: "APP-2408", destination: "United Arab Emirates", code: "AE", type: "Tourist visa", applicant: "Alex Morgan", updated: "Today, 10:42", progress: 76, status: "In progress" },
  { id: "APP-2407", destination: "United Kingdom", code: "GB", type: "Standard visitor", applicant: "Nadia Hassan", updated: "Yesterday", progress: 100, status: "Ready" },
  { id: "APP-2406", destination: "Singapore", code: "SG", type: "Business visa", applicant: "Daniel Kim", updated: "Jun 17", progress: 42, status: "Needs documents" },
  { id: "APP-2405", destination: "Türkiye", code: "TR", type: "eVisa", applicant: "Lina Costa", updated: "Jun 15", progress: 100, status: "Submitted" },
];

export const agencyClients = [
  { id: "CL-842", name: "Nadia Hassan", email: "nadia@example.com", passports: 2, activeCases: 1, lastActive: "12 min ago", status: "Active" },
  { id: "CL-841", name: "Daniel Kim", email: "daniel@example.com", passports: 1, activeCases: 2, lastActive: "3 hours ago", status: "Active" },
  { id: "CL-840", name: "Lina Costa", email: "lina@example.com", passports: 3, activeCases: 0, lastActive: "Yesterday", status: "Complete" },
  { id: "CL-839", name: "Omar Farooq", email: "omar@example.com", passports: 1, activeCases: 1, lastActive: "Jun 15", status: "Waiting" },
];

export const agencies = [
  { id: "AG-092", name: "Atlas Travel Co.", region: "Middle East", specialists: 18, applications: 428, rating: "4.9", status: "Verified" },
  { id: "AG-091", name: "Northstar Mobility", region: "Europe", specialists: 12, applications: 316, rating: "4.8", status: "Verified" },
  { id: "AG-090", name: "Voyage Partners", region: "Asia Pacific", specialists: 9, applications: 184, rating: "4.7", status: "Review" },
  { id: "AG-089", name: "Borderless Desk", region: "North America", specialists: 7, applications: 126, rating: "4.8", status: "Verified" },
];

export const countries = [
  { code: "AE", name: "United Arab Emirates", visaTypes: 6, rulesVersion: "2.4.1", reviewed: "Jun 18, 2026", status: "Current" },
  { code: "GB", name: "United Kingdom", visaTypes: 8, rulesVersion: "3.1.0", reviewed: "Jun 16, 2026", status: "Current" },
  { code: "SG", name: "Singapore", visaTypes: 5, rulesVersion: "1.8.2", reviewed: "Jun 14, 2026", status: "Current" },
  { code: "TR", name: "Türkiye", visaTypes: 4, rulesVersion: "2.0.3", reviewed: "May 29, 2026", status: "Review due" },
];

export const auditLogs = [
  { id: "EVT-88201", actor: "Sam Rivera", action: "Updated country rule", resource: "United Kingdom / Visitor", timestamp: "Today, 11:04", severity: "Info" },
  { id: "EVT-88200", actor: "Atlas Travel Co.", action: "Exported application", resource: "APP-2407", timestamp: "Today, 10:51", severity: "Info" },
  { id: "EVT-88199", actor: "System", action: "OCR confidence flagged", resource: "PS-1046", timestamp: "Today, 09:28", severity: "Review" },
  { id: "EVT-88198", actor: "Maya Chen", action: "Viewed passport record", resource: "PS-1047", timestamp: "Yesterday, 17:42", severity: "Sensitive" },
];
