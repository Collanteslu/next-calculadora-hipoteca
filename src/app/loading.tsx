export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="h-1 w-16 bg-muted rounded-full" />
          <div className="h-8 w-64 bg-muted rounded-lg" />
          <div className="h-4 w-48 bg-muted rounded-md" />
        </div>

        {/* Form skeleton */}
        <div className="card-premium p-6 md:p-8 space-y-6">
          <div className="h-6 w-40 bg-muted rounded-md" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-muted rounded-md" />
                <div className="h-10 w-full bg-muted rounded-lg" />
              </div>
            ))}
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 bg-muted rounded" />
              <div className="h-4 w-48 bg-muted rounded-md" />
            </div>
          </div>
          <div className="flex justify-between">
            <div className="h-10 w-32 bg-muted rounded-lg" />
            <div className="h-10 w-32 bg-primary/30 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
