"use client";

import { useState } from "react";
import { Copy, HardDriveUpload, ImageIcon, Check } from "lucide-react";
import { WEBSITE_IMAGE_SPECS } from "@/lib/website-image-specs";

export default function AdminWebsiteImageGuide() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copySpec = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Image &amp; Upload Guide</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-400">
          Exact grid sizes for designers and staff uploading images from a computer. Copy a row to share with
          your UI team or paste into ChatGPT when generating assets.
        </p>
      </div>

      <article className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-50">
        <h2 className="flex items-center gap-2 font-semibold text-white">
          <HardDriveUpload size={18} className="text-amber-300" />
          How to upload from your computer
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-amber-100/90">
          <li>
            <strong className="text-white">Website images (contact, offices):</strong> Save files into the{" "}
            <code className="rounded bg-black/30 px-1">lms-app-main/public/</code> folder using the exact names
            in the table (e.g. <code className="rounded bg-black/30 px-1">o1.png</code>,{" "}
            <code className="rounded bg-black/30 px-1">contact-us-1.png</code>). Restart is not required — refresh
            the browser.
          </li>
          <li>
            <strong className="text-white">Course videos &amp; PDFs:</strong> Admin → Self-paced courses → open a
            course → Content tab → use Upload buttons (files go to private storage).
          </li>
          <li>
            <strong className="text-white">Home / About copy &amp; banners:</strong> Admin → Home Page or About
            Page editors (JSON saved to server).
          </li>
        </ol>
      </article>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0b1224]">
        <table className="w-full min-w-[960px] text-left text-xs">
          <thead className="bg-[#0d1528] text-gray-400">
            <tr>
              <th className="px-3 py-2.5">Page</th>
              <th className="px-3 py-2.5">Usage</th>
              <th className="px-3 py-2.5">Exact size (px)</th>
              <th className="px-3 py-2.5">Ratio</th>
              <th className="px-3 py-2.5">Format / max</th>
              <th className="px-3 py-2.5">File path</th>
              <th className="px-3 py-2.5">Notes</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {WEBSITE_IMAGE_SPECS.map((spec) => {
              const sizeLabel =
                spec.widthPx > 0 ? `${spec.widthPx} × ${spec.heightPx}` : "See upload dialog";
              const promptLine = `Create ${spec.usage} for ${spec.page}. Size ${sizeLabel}, ratio ${spec.aspectRatio}, format ${spec.format}. ${spec.notes}`;
              return (
                <tr key={spec.id} className="border-t border-white/5 align-top">
                  <td className="px-3 py-3 font-medium text-white">{spec.page}</td>
                  <td className="px-3 py-3 text-gray-300">{spec.usage}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 font-mono text-amber-200">
                      <ImageIcon size={12} />
                      {sizeLabel}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-400">{spec.aspectRatio}</td>
                  <td className="px-3 py-3 text-gray-400">
                    {spec.format}
                    {spec.maxFileMb > 0 ? (
                      <>
                        <br />
                        ≤ {spec.maxFileMb} MB
                      </>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 font-mono text-[10px] text-gray-500">{spec.filePath}</td>
                  <td className="max-w-[220px] px-3 py-3 text-gray-400">{spec.notes}</td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      title="Copy ChatGPT prompt"
                      onClick={() => void copySpec(spec.id, promptLine)}
                      className="inline-flex items-center gap-1 rounded border border-white/15 bg-[#060b14] px-2 py-1 text-[10px] text-gray-300 hover:bg-white/5"
                    >
                      {copiedId === spec.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      Prompt
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
