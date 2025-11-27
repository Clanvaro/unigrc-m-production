import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div 
      className="space-y-6" 
      role="status" 
      aria-busy="true"
      aria-label="Cargando..."
      data-testid="skeleton-dashboard"
    >
      {/* Metrics Cards - Grid 2x2 */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={`metric-${index}`} data-testid={`skeleton-metric-${index}`}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Risk Matrix Section */}
      <Card data-testid="skeleton-risk-matrix">
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8">
          <div className="w-full max-w-2xl space-y-4">
            {/* Matrix Grid Skeleton */}
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 25 }).map((_, index) => (
                <Skeleton 
                  key={`matrix-${index}`} 
                  className="aspect-square w-full rounded-md"
                  style={{ minHeight: '60px' }}
                />
              ))}
            </div>
            {/* Legend */}
            <div className="flex gap-4 justify-center flex-wrap">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={`legend-${index}`} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-sm" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top 5 Risks List */}
      <Card data-testid="skeleton-top-risks">
        <CardHeader>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div 
              key={`risk-${index}`} 
              className="flex items-center gap-4 p-3 rounded-lg border border-border"
              data-testid={`skeleton-risk-item-${index}`}
            >
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
