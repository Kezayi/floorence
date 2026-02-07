import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/** Shimmer skeleton for stat cards (Dashboard) */
export const StatCardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-5 w-5 rounded" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-20 mb-1" />
    </CardContent>
  </Card>
);

/** Shimmer skeleton for a table row */
export const TableRowSkeleton = ({ columns = 6 }: { columns?: number }) => (
  <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
    {Array.from({ length: columns }).map((_, i) => (
      <Skeleton
        key={i}
        className={`h-4 ${i === 0 ? 'w-10 h-10 rounded-full shrink-0' : 'flex-1'}`}
      />
    ))}
  </div>
);

/** Full table skeleton with multiple rows */
export const TableSkeleton = ({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) => (
  <Card>
    <CardContent className="p-0">
      {/* Header skeleton */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-muted/30">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className={`h-3 ${i === 0 ? 'w-10' : 'flex-1'}`} />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </CardContent>
  </Card>
);

/** Skeleton for the rankings block */
export const RankingSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-64" />
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-4">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="text-right space-y-1">
              <Skeleton className="h-6 w-12 ml-auto" />
              <Skeleton className="h-3 w-16 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

/** Skeleton for chart area */
export const ChartSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-72" />
    </CardHeader>
    <CardContent>
      <div className="h-[300px] w-full flex items-end gap-1 px-8 pb-8">
        {Array.from({ length: 15 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${20 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </CardContent>
  </Card>
);

/** Skeleton for user data cards */
export const UserCardSkeleton = () => (
  <div className="grid gap-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

/** Dashboard page full skeleton */
export const DashboardSkeleton = () => (
  <div>
    <Skeleton className="h-9 w-56 mb-8" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
    <RankingSkeleton />
    <div className="mt-8">
      <ChartSkeleton />
    </div>
  </div>
);
