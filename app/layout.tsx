import type { Metadata } from "next";
import SiteChrome from "@/components/SiteChrome";
import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";
import "./globals.css";

export const metadata: Metadata = {
  title: `${COMPANY_DISPLAY_NAME} — SF Trainings LMS`,
  description: `Transformative learning and professional development through the ${COMPANY_DISPLAY_NAME} Learning Management System.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
