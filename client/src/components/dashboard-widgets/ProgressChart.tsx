import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressItem {
  id: string;
  label: string;
  value: number;
  total: number;
  color?: string;
  subtitle?: string;
}

interface ProgressChartProps {
  title: string;
  items: ProgressItem[];
  className?: string;
  showPercentages?: boolean;
  loading?: boolean;
  "data-testid"?: string;
}

export function ProgressChart({
  title,
  items,
  className,
  showPercentages = true,
  loading = false,
  "data-testid": testId
}: ProgressChartProps) {
  if (loading) {
    return (
      <Card className={className} data-testid={testId}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse" />
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} data-testid={testId}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => {
          const percentage = item.total > 0 ? Math.round((item.value / item.total) * 100) : 0;
          
          return (
            <div key={item.id} className="space-y-2" data-testid={`progress-item-${item.id}`}>
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-sm font-medium" data-testid={`label-${item.id}`}>
                    {item.label}
                  </span>
                  {item.subtitle && (
                    <span className="text-xs text-muted-foreground" data-testid={`subtitle-${item.id}`}>
                      {item.subtitle}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium" data-testid={`value-${item.id}`}>
                    {item.value}{item.total > 0 && ` / ${item.total}`}
                  </span>
                  {showPercentages && (
                    <div className="text-xs text-muted-foreground" data-testid={`percentage-${item.id}`}>
                      {percentage}%
                    </div>
                  )}
                </div>
              </div>
              <Progress 
                value={percentage} 
                className={cn("h-2", item.color && `text-${item.color}`)}
                data-testid={`progress-bar-${item.id}`}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}