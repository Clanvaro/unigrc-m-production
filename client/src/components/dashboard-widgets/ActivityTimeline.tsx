import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  MessageSquare, 
  Upload,
  Clock,
  LucideIcon
} from "lucide-react";

interface ActivityItem {
  id: string;
  type: 'work_log' | 'status_change' | 'comment' | 'upload' | 'review' | 'milestone';
  description: string;
  timestamp: Date;
  testId?: string;
  testName?: string;
  metadata?: any;
}

interface ActivityTimelineProps {
  title: string;
  activities: ActivityItem[];
  className?: string;
  maxHeight?: string;
  loading?: boolean;
  onActivityClick?: (activity: ActivityItem) => void;
  "data-testid"?: string;
}

const ActivityTypeConfig: Record<ActivityItem['type'], { icon: LucideIcon; color: string; bgColor: string }> = {
  work_log: { icon: FileText, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900" },
  status_change: { icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900" },
  comment: { icon: MessageSquare, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900" },
  upload: { icon: Upload, color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900" },
  review: { icon: AlertCircle, color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900" },
  milestone: { icon: Clock, color: "text-gray-600", bgColor: "bg-gray-100 dark:bg-gray-900" }
};

export function ActivityTimeline({
  title,
  activities,
  className,
  maxHeight = "400px",
  loading = false,
  onActivityClick,
  "data-testid": testId
}: ActivityTimelineProps) {
  if (loading) {
    return (
      <Card className={className} data-testid={testId}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} data-testid={testId}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="pr-4" style={{ maxHeight }}>
          {activities.length === 0 ? (
            <div className="text-center text-muted-foreground py-8" data-testid="no-activities">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay actividad reciente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity, index) => {
                const config = ActivityTypeConfig[activity.type];
                const Icon = config.icon;
                const isLast = index === activities.length - 1;

                return (
                  <div 
                    key={activity.id} 
                    className={cn(
                      "relative flex items-start space-x-3 pb-4",
                      !isLast && "border-l border-gray-200 dark:border-gray-700 ml-4 pl-6",
                      onActivityClick && "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-2 -m-2"
                    )}
                    onClick={() => onActivityClick?.(activity)}
                    data-testid={`activity-${activity.id}`}
                  >
                    <div 
                      className={cn(
                        "relative z-10 flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-white dark:ring-gray-800",
                        config.bgColor
                      )}
                      data-testid={`activity-icon-${activity.id}`}
                    >
                      <Icon className={cn("h-4 w-4", config.color)} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100" data-testid={`activity-description-${activity.id}`}>
                        {activity.description}
                      </p>
                      
                      {activity.testName && (
                        <Badge variant="outline" className="mt-1 text-xs" data-testid={`activity-test-${activity.id}`}>
                          {activity.testName}
                        </Badge>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-1" data-testid={`activity-time-${activity.id}`}>
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
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