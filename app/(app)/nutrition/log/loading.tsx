export default function JournalLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-7 w-32 rounded bg-muted" />
        <div className="h-8 w-28 rounded-md bg-muted" />
      </div>

      {/* Progress card */}
      <div className="rounded-xl border bg-card p-4 shadow-sm mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-8 w-24 rounded bg-muted" />
            <div className="h-2 rounded-full bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-8 w-24 rounded bg-muted" />
            <div className="h-2 rounded-full bg-muted" />
          </div>
        </div>
      </div>

      {/* Entry skeletons */}
      <div className="flex-1 space-y-2 mb-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border bg-card px-3 py-2.5 flex items-center justify-between"
          >
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Input area */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 w-16 rounded-full bg-muted" />
          ))}
        </div>
        <div className="flex gap-2">
          <div className="h-10 flex-1 rounded-full bg-muted" />
          <div className="h-10 w-10 rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}
