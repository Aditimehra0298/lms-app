"use client";

import { useState } from "react";
import AdminImageUrlUpload from "@/components/admin/AdminImageUrlUpload";
import TestimonialAvatar from "@/components/TestimonialAvatar";
import { uploadAdminImageFile } from "@/lib/admin-upload-image";
import { testimonialPhotoHint } from "@/lib/admin-image-hints";

type Props = {
  value: string;
  onChange: (url: string) => void;
  name?: string;
};

export default function AdminTestimonialPhotoField({ value, onChange, name }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start gap-4">
        <AdminImageUrlUpload
          label="Client photo"
          value={value}
          onChange={onChange}
          uploading={uploading}
          onUploadFile={async (file) => {
            setUploadError(null);
            setUploading(true);
            try {
              const url = await uploadAdminImageFile(file);
              onChange(url);
            } catch (e) {
              setUploadError(e instanceof Error ? e.message : "Upload failed");
            } finally {
              setUploading(false);
            }
          }}
          hint={testimonialPhotoHint}
          placeholder="/uploads/admin/… or paste URL"
          className="min-w-[240px] flex-1"
        />
        {name?.trim() ? (
          <div className="pt-6">
            <TestimonialAvatar testimonial={{ name, photo: value }} size={56} />
          </div>
        ) : null}
      </div>
      {uploadError ? <p className="text-[11px] text-red-400">{uploadError}</p> : null}
    </div>
  );
}
