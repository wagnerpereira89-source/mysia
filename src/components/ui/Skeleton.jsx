export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-[#e4e4e7] rounded-lg ${className}`} />
  )
}

export function ProductSkeleton() {
  return (
    <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 flex gap-3">
      <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}
