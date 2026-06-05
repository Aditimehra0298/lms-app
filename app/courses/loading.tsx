export default function CoursesLoading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 h-10 w-1/2 rounded-lg bg-white/10" />
        <div className="mb-10 h-5 w-2/3 rounded bg-white/10" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-white/10" />
          ))}
        </div>
      </div>
    </div>
  );
}
