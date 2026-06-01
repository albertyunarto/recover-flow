export default function FireLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-40 rounded bg-muted" />
      <div className="rounded-xl border bg-card p-4 shadow-sm h-20" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-4 shadow-sm h-20" />
        ))}
      </div>
      <div className="rounded-xl border bg-card p-4 shadow-sm h-72" />
      <div className="rounded-xl border bg-card p-4 shadow-sm h-56" />
    </div>
  );
}
