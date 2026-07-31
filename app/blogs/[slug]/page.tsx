import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import LmsContentPageShell, { LmsContentCard } from "@/components/LmsContentPageShell";
import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";
import { blogPosts } from "@/lib/lms-site-pages";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return { title: `Blog — ${COMPANY_DISPLAY_NAME}` };
  return {
    title: `${post.title} — ${COMPANY_DISPLAY_NAME}`,
    description: post.excerpt,
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  const words = post.title.split(" ");
  const highlight = words.slice(-2).join(" ");
  const lead = words.slice(0, -2).join(" ");

  return (
    <LmsContentPageShell
      badge={post.category}
      title={lead || post.title}
      titleHighlight={lead ? highlight : undefined}
      subtitle={post.excerpt}
      backHref="/blogs"
      backLabel="Back to blogs"
      imageSrc={post.image}
      imageAlt={post.title}
      ctaHref="/courses"
      ctaLabel="Related courses"
      secondaryCtaHref="/book-a-call"
      secondaryCtaLabel="Ask an advisor"
    >
      <div className="lh-path-card overflow-hidden rounded-3xl border border-amber-500/35 bg-black/20 p-4 shadow-[0_0_28px_rgba(249,177,77,0.14)] md:p-6">
        <Image
          src={post.image}
          alt={post.title}
          width={1200}
          height={800}
          className="mx-auto h-auto max-h-[480px] w-full object-contain"
          sizes="100vw"
          priority
        />
      </div>

      <LmsContentCard>
        <p>
          This article supports learners on the {COMPANY_DISPLAY_NAME} LMS. Explore related courses in{" "}
          <Link href="/courses" className="font-bold text-[#eb9422] underline decoration-amber-500/40">
            Our Courses
          </Link>{" "}
          or ask the site assistant for category recommendations.
        </p>
        <p>
          Key takeaway: short, practical training works best when teams apply it on the job — modules, exams, and
          certificates on our LMS are designed for that path.
        </p>
        <p className="text-xs opacity-70">
          Published{" "}
          {new Date(post.date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}{" "}
          · {post.readMinutes} min read
        </p>
      </LmsContentCard>
    </LmsContentPageShell>
  );
}
