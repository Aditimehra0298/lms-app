"use client";

import { Award } from "lucide-react";
import AdminCertificateTemplatesEditor from "@/components/admin/AdminCertificateTemplatesEditor";

export default function AdminGlobalCertificatesPanel() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-[#0b1224] p-4 md:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-500/15 p-2">
            <Award className="h-6 w-6 text-amber-300" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Certificate templates (all courses)</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-400">
              Upload certificate design, badge, and transcript once. Every self-paced course uses these files.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <AdminCertificateTemplatesEditor />
        </div>
      </div>
    </div>
  );
}
