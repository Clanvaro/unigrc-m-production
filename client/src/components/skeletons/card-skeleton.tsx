import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CardSkeletonProps {
  count?: number;
}

export function CardSkeleton({ count = 1 }: CardSkeletonProps) {
  const skeletonCards = Array.from({ length: count }).map((_, index) => (
    <Card key={`card-skeleton-${index}`} data-testid={`skeleton-card-${index}`}>
      <CardHeader>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </CardContent>
    </Card>
  ));

  if (count === 1) {
    return (
      <div role="status" aria-busy="true" aria-label="Cargando...">
        {skeletonCards[0]}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "grid gap-4 md:gap-6",
        count === 2 && "grid-cols-1 md:grid-cols-2",
        count === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        count === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
        count > 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      )}
      role="status" 
      aria-busy="true"
      aria-label="Cargando..."
      data-testid="skeleton-cards-grid"
    >
      {skeletonCards}
    </div>
  );
}
