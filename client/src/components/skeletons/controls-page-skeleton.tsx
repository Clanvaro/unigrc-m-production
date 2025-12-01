import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function ControlsPageSkeleton() {
  return (
    <div 
      className="@container h-full flex flex-col p-4 @md:p-8 pt-6 gap-2" 
      role="status" 
      aria-busy="true"
      aria-label="Cargando controles"
      data-testid="skeleton-controls-page"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="p-0 h-full flex flex-col">
          <div className="flex-1 overflow-hidden p-4">
            <div className="border rounded-md">
              <div className="border-b bg-muted/50">
                <div className="grid grid-cols-7 gap-4 p-3">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-full col-span-2" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
              
              <div className="divide-y">
                {Array.from({ length: 10 }).map((_, rowIndex) => (
                  <div key={`row-${rowIndex}`} className="grid grid-cols-7 gap-4 p-3 items-center">
                    <Skeleton className="h-6 w-20 rounded-md" />
                    <div className="col-span-2 space-y-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t px-4 py-2 flex items-center justify-between">
            <Skeleton className="h-4 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
