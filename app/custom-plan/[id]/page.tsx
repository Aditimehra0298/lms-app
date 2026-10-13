import type { Metadata } from "next";
import { Suspense } from "react";
import CustomPlanProposalView from "@/components/CustomPlanProposalView";

export const metadata: Metadata = {
  title: "Your Custom Plan proposal",
  robots: { index: false, follow: false },
};

export default async function CustomPlanProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <CustomPlanProposalView id={id} />
    </Suspense>
  );
}
