import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "VisaFlow AI | Passport intelligence for global mobility",
    template: "%s | VisaFlow AI",
  },
  description:
    "AI-powered passport scanning, visa requirement validation, and application workflows for travelers and agencies.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
