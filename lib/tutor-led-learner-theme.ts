/** Tutor-led learner hub — matches HACCP dashboard mockup palette & feel */

export const TL = {
  gold: "#FFC107",
  goldBright: "#FFD54F",
  goldDim: "#FFB800",
  green: "#4CAF50",
  greenBright: "#66BB6A",
  bg: "#000000",
  card: "#111111",
  cardElevated: "#161616",
  border: "rgba(255, 193, 7, 0.14)",
  borderStrong: "rgba(255, 193, 7, 0.28)",
  zoom: "#2D8CFF",
  liveRed: "#EF4444",
} as const;

export const tlPage = "tutor-led-learner-hub min-h-full bg-black text-white";

export const tlCard =
  "rounded-xl border border-[#FFC107]/14 bg-[#111111] p-4 shadow-[0_4px_28px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,193,7,0.05)] md:p-5";

export const tlCardGold =
  "rounded-xl border border-[#FFC107]/28 bg-gradient-to-br from-[#1a1508] via-[#111111] to-black p-4 shadow-[0_0_40px_rgba(255,193,7,0.08)] md:p-5";

export const tlGoldSolid =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#FFC107] px-4 py-2.5 text-sm font-bold text-black shadow-[0_4px_20px_rgba(255,193,7,0.42)] transition hover:bg-[#FFD54F] hover:shadow-[0_6px_28px_rgba(255,193,7,0.55)]";

export const tlGoldOutline =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#FFC107]/55 bg-transparent px-4 py-2.5 text-sm font-semibold text-[#FFC107] transition hover:border-[#FFC107]/80 hover:bg-[#FFC107]/10";

export const tlSectionTitle = "text-lg font-bold tracking-tight text-white";

export const tlEyebrow = "text-[10px] font-bold uppercase tracking-[0.18em] text-[#FFC107]/80";

export const tlMetaLabel = "text-[10px] font-semibold uppercase tracking-wider text-zinc-500";

export const tlGreenBadge =
  "inline-flex items-center gap-1 rounded-full border border-[#4CAF50]/45 bg-[#4CAF50]/12 px-2.5 py-0.5 text-[10px] font-bold text-[#66BB6A]";

export const tlGoldBadge =
  "inline-flex items-center rounded-md bg-[#FFC107]/18 px-2 py-0.5 text-[10px] font-bold uppercase text-[#FFC107]";
