export default function NutritionLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-28 rounded bg-muted" />
        <div className="h-9 w-24 rounded-md bg-muted" />
      </div>

      {/* Progress card */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-8 w-24 rounded bg-muted" />
            <div className="h-2 rounded-full bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-8 w-24 rounded bg-muted" />
            <div className="h-2 rounded-full bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
          </div>
        </div>
      </div>

      {/* Meal groups */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-4 w-16 rounded bg-muted" />
            <div className="h-3 w-12 rounded bg-muted" />
          </div>
          <div className="h-10 rounded-lg border border-dashed" />
        </div>
      ))}
    </div>
  );
}
