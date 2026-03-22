export default function DashboardLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Greeting */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="h-5 w-48 rounded bg-muted mb-2" />
        <div className="h-3 w-32 rounded bg-muted" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-xl border bg-card" />
        ))}
      </div>

      {/* Pain + Exercise cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm h-28" />
        <div className="rounded-xl border bg-card p-4 shadow-sm h-28" />
      </div>

      {/* Nutrition card */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-8 w-20 rounded bg-muted" />
            <div className="h-2 rounded-full bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-8 w-20 rounded bg-muted" />
            <div className="h-2 rounded-full bg-muted" />
          </div>
        </div>
      </div>

      {/* Hydration + Streak */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm h-24" />
        <div className="rounded-xl border bg-card p-4 shadow-sm h-24" />
      </div>
    </div>
  );
}
