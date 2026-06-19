import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { appBaseUrl, toAbsoluteAppUrl } from "@/lib/server/certificate-app-url";
import { verifyCertificateLookup } from "@/lib/server/certificate-service";
import { buildBadgeShareText, buildCertificateEarnedPageUrl } from "@/lib/certificate-share-url";
import CertificateEarnedClient from "./CertificateEarnedClient";

type Props = {
  searchParams: Promise<{ delegate?: string; number?: string; id?: string }>;
};

async function loadCertificate(searchParams: Props["searchParams"]) {
  const sp = await searchParams;
  return verifyCertificateLookup({
    delegate: sp.delegate,
    number: sp.number,
    id: sp.id,
  });
}

function isCertificateOnlyView(searchParams: Props["searchParams"]) {
  return searchParams.then((sp) => sp.certificateOnly !== "0");
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const certificate = await loadCertificate(searchParams);
  const base = appBaseUrl();

  if (!certificate) {
    return {
      title: "Certificate | SF Trainings",
      description: "View a verified SF Trainings certificate.",
    };
  }

  const title = `${certificate.learnerName} — ${certificate.courseTitle}`;
  const description = `${buildBadgeShareText({
    learnerName: certificate.learnerName,
    courseTitle: certificate.courseTitle,
  })} Certificate only — no transcript.`;
  const ogImage = certificate.badgeImage?.trim()
    ? toAbsoluteAppUrl(certificate.badgeImage.trim(), base)
    : undefined;
  const pageUrl = buildCertificateEarnedPageUrl(base, certificate);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "SF Trainings",
      type: "website",
      images: ogImage
        ? [{ url: ogImage, width: 512, height: 512, alt: `${certificate.courseTitle} certification badge` }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function CertificateEarnedPage({ searchParams }: Props) {
  const [certificate, certificateOnly] = await Promise.all([
    loadCertificate(searchParams),
    isCertificateOnlyView(searchParams),
  ]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-xs text-gray-500 hover:text-amber-200">
          ← SF Trainings
        </Link>
        <h1 className="mt-4 text-center text-2xl font-bold">Earned certificate</h1>
        <p className="mb-8 text-center text-sm text-gray-500">
          Official certificate from our records — share this link to show your badge and certificate (no transcript).
        </p>
        <Suspense fallback={<p className="text-center text-gray-400">Loading…</p>}>
          <CertificateEarnedClient certificate={certificate} certificateOnly={certificateOnly} />
        </Suspense>
      </div>
    </div>
  );
}
