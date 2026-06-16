export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="h-1 w-16 bg-primary/20 rounded-full" />
          <div className="h-8 w-64 animate-shimmer rounded-lg" />
          <div className="h-4 w-48 animate-shimmer rounded-md" />
        </div>

        {/* Form skeleton */}
        <div className="card-premium p-6 md:p-8 space-y-6">
          <div className="h-6 w-40 animate-shimmer rounded-md" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 animate-shimmer rounded-md" />
                <div className="h-10 w-full animate-shimmer rounded-xl" />
              </div>
            ))}
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-shimmer rounded" />
              <div className="h-4 w-48 animate-shimmer rounded-md" />
            </div>
          </div>
          <div className="flex justify-between">
            <div className="h-10 w-32 animate-shimmer rounded-xl" />
            <div className="h-10 w-36 animate-shimmer rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
