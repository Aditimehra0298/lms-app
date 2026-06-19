"use client";

import Image from "next/image";
import type { HomePageTestimonial } from "@/lib/content-schema";
import { testimonialAvatarUrl, testimonialPhotoIsExternal } from "@/lib/testimonial-photo";

export default function TestimonialAvatar({
  testimonial,
  size = 44,
  className = "",
}: {
  testimonial: Pick<HomePageTestimonial, "name" | "photo">;
  size?: number;
  className?: string;
}) {
  const src = testimonialAvatarUrl(testimonial);
  const external = testimonialPhotoIsExternal(src);

  return (
    <div
      className={`overflow-hidden rounded-full border border-amber-500/20 bg-gray-800 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        unoptimized={external}
        src={src}
        alt={testimonial.name ? `${testimonial.name} photo` : "Learner"}
        width={size}
        height={size}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
