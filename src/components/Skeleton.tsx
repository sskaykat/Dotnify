/** Lightweight skeleton block for loading states. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-200 dark:bg-slate-700 ${className}`}
      aria-hidden="true"
    />
  );
}

/** A row of skeletons mimicking a table row. */
export function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-slate-100 last:border-b-0 dark:border-slate-700">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-2.5">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}
