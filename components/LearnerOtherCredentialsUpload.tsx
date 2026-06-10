"use client";

import { useCallback, useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { CommunityFileUploadZone } from "@/components/CommunityFileUploadZone";
import {
  addLearnerOtherCredential,
  LEARNER_OTHER_CREDENTIALS_EVENT,
  readLearnerOtherCredentials,
  type LearnerOtherCredential,
} from "@/lib/learner-other-credentials";

type Props = {
  title?: string;
  description?: string;
  compact?: boolean;
  showList?: boolean;
  onChange?: (items: LearnerOtherCredential[]) => void;
};

export function LearnerOtherCredentialsUpload({
  title = "Other badges or certificates",
  description = "Upload external badges or certificates (PNG, JPG, or PDF, max 10MB). SF Trainings credentials from your courses appear automatically above.",
  compact = false,
  showList = true,
  onChange,
}: Props) {
  const [items, setItems] = useState<LearnerOtherCredential[]>([]);
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadName, setUploadName] = useState("");

  const refresh = useCallback(() => {
    const next = readLearnerOtherCredentials();
    setItems(next);
    onChange?.(next);
  }, [onChange]);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener(LEARNER_OTHER_CREDENTIALS_EVENT, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(LEARNER_OTHER_CREDENTIALS_EVENT, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [refresh]);

  const onUploaded = useCallback(
    (url: string, name: string) => {
      addLearnerOtherCredential(url, name);
      setUploadUrl("");
      setUploadName("");
      refresh();
    },
    [refresh],
  );

  return (
    <article
      className={`rounded-xl border border-white/10 bg-black/25 ${
        compact ? "p-3" : "p-4 md:p-5"
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-amber-300">
          <Upload size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <p className="mt-1 text-xs text-gray-400">{description}</p>
          <div className={`max-w-xl ${compact ? "mt-2" : "mt-3"}`}>
            <CommunityFileUploadZone
              label="Upload file"
              fileUrl={uploadUrl}
              fileName={uploadName}
              onUploaded={onUploaded}
              onClear={() => {
                setUploadUrl("");
                setUploadName("");
              }}
              compact
            />
          </div>
          {showList && items.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs"
                >
                  <span className="truncate text-gray-300">{item.name}</span>
                  <span className="text-gray-500">
                    {new Date(item.uploadedAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </article>
  );
}
