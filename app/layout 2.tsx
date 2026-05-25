import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sustainable Futures Training — SF Trainings LMS",
  description:
    "Transformative learning and professional development through the Sustainable Futures Training Learning Management System.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
