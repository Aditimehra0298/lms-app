import AudienceComingSoon, {
  type ComingSoonAudienceId,
} from "@/components/AudienceComingSoon";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ for?: string }>;
};

const AUDIENCES: ComingSoonAudienceId[] = ["industry", "auditor", "university", "associators"];

function asAudience(value: string | undefined): ComingSoonAudienceId {
  if (value && AUDIENCES.includes(value as ComingSoonAudienceId)) {
    return value as ComingSoonAudienceId;
  }
  return "industry";
}

export default async function ComingSoonPage({ searchParams }: PageProps) {
  const { for: audienceFor } = await searchParams;
  return <AudienceComingSoon audience={asAudience(audienceFor)} />;
}
