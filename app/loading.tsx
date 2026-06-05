export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10 h-12 w-2/3 rounded-lg bg-white/10" />
        <div className="mb-4 h-6 w-full max-w-xl rounded bg-white/10" />
        <div className="mb-12 h-6 w-full max-w-lg rounded bg-white/10" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-white/10" />
          ))}
        </div>
      </div>
    </div>
  );
}
