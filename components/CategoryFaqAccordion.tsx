"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

export default function CategoryFaqAccordion({
  items,
}: {
  items: { q: string; a: string }[];
}) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={item.q}
            className="overflow-hidden rounded-xl border border-white/10 bg-black/40 transition-colors hover:border-white/15"
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold text-white"
            >
              <span>{item.q}</span>
              <Plus
                className={`h-5 w-5 shrink-0 text-amber-400 transition-transform ${isOpen ? "rotate-45" : ""}`}
                strokeWidth={2}
              />
            </button>
            {isOpen ? (
              <div className="border-t border-white/5 px-4 pb-4 pt-0">
                <p className="pt-3 text-sm leading-relaxed text-gray-400">{item.a}</p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
