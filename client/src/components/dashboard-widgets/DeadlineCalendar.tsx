import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isToday, isTomorrow, addDays } from "date-fns";
import { Calendar, AlertTriangle, Clock } from "lucide-react";

interface DeadlineItem {
  testId: string;
  testName: string;
  deadline: Date;
  daysLeft: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status?: string;
}

interface DeadlineCalendarProps {
  title: string;
  deadlines: DeadlineItem[];
  className?: string;
  maxHeight?: string;
  loading?: boolean;
  onDeadlineClick?: (deadline: DeadlineItem) => void;
  "data-testid"?: string;
}

const PriorityConfig = {
  low: { color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900", variant: "outline" as const },
  medium: { color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900", variant: "default" as const },
  high: { color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900", variant: "secondary" as const },
  critical: { color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900", variant: "destructive" as const }
};

export function DeadlineCalendar({
  title,
  deadlines,
  className,
  maxHeight = "400px",
  loading = false,
  onDeadlineClick,
  "data-testid": testId
}: DeadlineCalendarProps) {
  if (loading) {
    return (
      <Card className={className} data-testid={testId}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
                </div>
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedDeadlines = deadlines
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
    .slice(0, 10); // Show only next 10 deadlines

  const getDeadlineUrgency = (daysLeft: number, priority: string) => {
    if (daysLeft < 0) return { color: "text-red-600", icon: AlertTriangle };
    if (daysLeft === 0) return { color: "text-orange-600", icon: AlertTriangle };
    if (daysLeft === 1) return { color: "text-yellow-600", icon: Clock };
    if (priority === 'critical' && daysLeft <= 3) return { color: "text-red-600", icon: AlertTriangle };
    return { color: "text-gray-600", icon: Clock };
  };

  const getDateLabel = (date: Date, daysLeft: number) => {
    if (daysLeft < 0) return "Vencida";
    if (isToday(date)) return "Hoy";
    if (isTomorrow(date)) return "Mañana";
    if (daysLeft <= 7) return `${daysLeft} días`;
    return format(date, "MMM d");
  };

  return (
    <Card className={className} data-testid={testId}>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center">
          <Calendar className="h-4 w-4 mr-2" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="pr-4" style={{ maxHeight }}>
          {sortedDeadlines.length === 0 ? (
            <div className="text-center text-muted-foreground py-8" data-testid="no-deadlines">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay fechas límite próximas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedDeadlines.map((deadline) => {
                const urgency = getDeadlineUrgency(deadline.daysLeft, deadline.priority);
                const UrgencyIcon = urgency.icon;
                const priorityConfig = PriorityConfig[deadline.priority];
                const dateLabel = getDateLabel(deadline.deadline, deadline.daysLeft);

                return (
                  <div 
                    key={deadline.testId}
                    className={cn(
                      "flex items-center justify-between p-3 border rounded-lg transition-colors",
                      onDeadlineClick && "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800",
                      deadline.daysLeft < 0 && "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950",
                      deadline.daysLeft === 0 && "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950"
                    )}
                    onClick={() => onDeadlineClick?.(deadline)}
                    data-testid={`deadline-${deadline.testId}`}
                  >
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <UrgencyIcon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", urgency.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" data-testid={`deadline-name-${deadline.testId}`}>
                          {deadline.testName}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge 
                            variant={priorityConfig.variant} 
                            className="text-xs"
                            data-testid={`deadline-priority-${deadline.testId}`}
                          >
                            {deadline.priority}
                          </Badge>
                          {deadline.status && (
                            <span className="text-xs text-muted-foreground" data-testid={`deadline-status-${deadline.testId}`}>
                              {deadline.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className={cn("text-sm font-medium", urgency.color)} data-testid={`deadline-date-${deadline.testId}`}>
                        {dateLabel}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`deadline-full-date-${deadline.testId}`}>
                        {format(deadline.deadline, "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}