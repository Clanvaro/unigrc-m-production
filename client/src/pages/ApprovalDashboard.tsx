import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  FileText,
  BarChart3,
  Settings,
  Bell,
  ArrowUp,
  ArrowDown,
  Zap
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

/**
 * ApprovalDashboard - Central hub for approval workflow management
 * 
 * Features:
 * - Real-time approval metrics and KPIs
 * - Pending approvals overview
 * - Escalation tracking
 * - Performance analytics
 * - Quick action controls
 */
export default function ApprovalDashboard() {
  const { toast } = useToast();
  const [selectedTimeRange, setSelectedTimeRange] = useState<'today' | 'week' | 'month'>('today');

  // Fetch dashboard data
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useQuery({
    queryKey: ['/api/approval/dashboard'],
    refetchInterval: 15 * 60 * 1000, // Optimized: 15 minutes (was 5min) - reduces server load
    refetchOnWindowFocus: true,
  });

  // Fetch pending approvals
  const { data: pendingApprovals, isLoading: pendingLoading } = useQuery({
    queryKey: ['/api/approval/pending'],
    refetchInterval: 15 * 60 * 1000, // Optimized: 15 minutes (was 5min)
    refetchOnWindowFocus: true,
  });

  // Fetch current metrics
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/approval/metrics'],
    refetchInterval: 15 * 60 * 1000, // Optimized: 15 minutes (was 5min)
    refetchOnWindowFocus: true,
  });

  // Fetch active escalations
  const { data: escalationsData, isLoading: escalationsLoading } = useQuery({
    queryKey: ['/api/approval/escalations', { status: 'active' }],
    refetchInterval: 15 * 60 * 1000, // Optimized: 15 minutes (was 5min)
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (dashboardError) {
      toast({
        title: "Error loading dashboard",
        description: "Failed to load approval dashboard data. Please refresh the page.",
        variant: "destructive",
      });
    }
  }, [dashboardError, toast]);

  if (dashboardLoading || metricsLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Approval Dashboard</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const summary = dashboardData?.data?.summary || {};
  const trends = dashboardData?.data?.trends || {};
  const performance = dashboardData?.data?.performance || {};
  const breakdown = dashboardData?.data?.breakdown || {};

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Approval Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor and manage automatic approval workflows
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" data-testid="button-refresh" onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/approval/dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['/api/approval/metrics'] });
            toast({ title: "Dashboard refreshed", description: "Latest data has been loaded." });
          }}>
            <Zap className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" data-testid="button-settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Alert for critical items */}
      {summary.overdueApprovals > 0 && (
        <Alert variant="destructive" data-testid="alert-overdue">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Attention Required</AlertTitle>
          <AlertDescription>
            You have {summary.overdueApprovals} overdue approval{summary.overdueApprovals !== 1 ? 's' : ''} requiring immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-today-approvals">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Approvals</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-today-approvals">
              {summary.todayApprovals || 0}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {trends.todayVsYesterday?.change >= 0 ? (
                <ArrowUp className="mr-1 h-3 w-3 text-green-500" />
              ) : (
                <ArrowDown className="mr-1 h-3 w-3 text-red-500" />
              )}
              <span className={trends.todayVsYesterday?.change >= 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(trends.todayVsYesterday?.changePercent || 0).toFixed(1)}%
              </span>
              <span className="ml-1">from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-approvals">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-approvals">
              {summary.pendingApprovals || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.overdueApprovals || 0} overdue
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-escalations">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Escalations</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-escalations">
              {summary.activeEscalations || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-auto-approval-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Approval Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-auto-approval-rate">
              {(summary.automaticApprovalRate || 0).toFixed(1)}%
            </div>
            <Progress
              value={summary.automaticApprovalRate || 0}
              className="mt-2"
              data-testid="progress-auto-approval-rate"
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <div className="w-full overflow-x-auto">
          <TabsList data-testid="tabs-dashboard" className="w-auto">
            <TabsTrigger value="overview" data-testid="tab-overview" className="flex-shrink-0">Overview</TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending" className="flex-shrink-0">Pending ({summary.pendingApprovals || 0})</TabsTrigger>
            <TabsTrigger value="escalations" data-testid="tab-escalations" className="flex-shrink-0">Escalations ({summary.activeEscalations || 0})</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics" className="flex-shrink-0">Analytics</TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Performance Summary */}
            <Card className="col-span-4" data-testid="card-performance-summary">
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>
                  Key performance indicators for approval workflows
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Approval Rate</div>
                    <div className="text-2xl font-bold" data-testid="text-approval-rate">
                      {(performance.approvalRate || 0).toFixed(1)}%
                    </div>
                    <Progress value={performance.approvalRate || 0} className="mt-1" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Avg Processing Time</div>
                    <div className="text-2xl font-bold" data-testid="text-avg-processing-time">
                      {(performance.avgProcessingTime || 0).toFixed(1)}h
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Escalation Rate</div>
                    <div className="text-2xl font-bold" data-testid="text-escalation-rate">
                      {(performance.escalationRate || 0).toFixed(1)}%
                    </div>
                    <Progress value={performance.escalationRate || 0} className="mt-1" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Policy Compliance</div>
                    <div className="text-2xl font-bold" data-testid="text-policy-compliance">
                      {(performance.policyComplianceRate || 0).toFixed(1)}%
                    </div>
                    <Progress value={performance.policyComplianceRate || 0} className="mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="col-span-3" data-testid="card-quick-actions">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Frequently used approval actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" variant="outline" data-testid="button-review-pending">
                  <Clock className="mr-2 h-4 w-4" />
                  Review Pending ({summary.pendingApprovals || 0})
                </Button>
                <Button className="w-full justify-start" variant="outline" data-testid="button-manage-escalations">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Manage Escalations
                </Button>
                <Button className="w-full justify-start" variant="outline" data-testid="button-bulk-approve">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Bulk Approve
                </Button>
                <Button className="w-full justify-start" variant="outline" data-testid="button-configure-policies">
                  <Settings className="mr-2 h-4 w-4" />
                  Configure Policies
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Risk Level Breakdown */}
            <Card data-testid="card-risk-breakdown">
              <CardHeader>
                <CardTitle>Approvals by Risk Level</CardTitle>
                <CardDescription>
                  Distribution of approvals by risk assessment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(breakdown.byRiskLevel || {}).map(([level, count]) => (
                    <div key={level} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            level === 'critical' ? 'destructive' :
                              level === 'high' ? 'secondary' :
                                level === 'medium' ? 'outline' : 'default'
                          }
                          className="w-16 justify-center"
                        >
                          {level}
                        </Badge>
                        <span className="text-sm font-medium">{String(count)}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {summary.todayApprovals > 0
                          ? ((Number(count) / summary.todayApprovals) * 100).toFixed(1)
                          : 0}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Approvers */}
            <Card data-testid="card-top-approvers">
              <CardHeader>
                <CardTitle>Top Approvers</CardTitle>
                <CardDescription>
                  Most active approvers today
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(breakdown.topApprovers || []).slice(0, 5).map((approver: any, index: number) => (
                    <div key={approver.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            {approver.approverName || 'Unknown'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {approver.approvalsProcessed || 0} processed
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">
                        #{index + 1}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pending Approvals Tab */}
        <TabsContent value="pending" className="space-y-4">
          <Card data-testid="card-pending-list">
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                Items requiring your review and approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-10 w-10 bg-gray-200 rounded animate-pulse" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {(pendingApprovals?.data?.approvals || []).slice(0, 10).map((approval: any) => (
                    <div key={approval.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {approval.approvalItemType?.replace('_', ' ').toUpperCase() || 'Unknown'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Risk: {approval.riskLevel} • Submitted: {new Date(approval.submittedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            approval.riskLevel === 'critical' ? 'destructive' :
                              approval.riskLevel === 'high' ? 'secondary' : 'outline'
                          }
                        >
                          {approval.riskLevel}
                        </Badge>
                        <Button size="sm" data-testid={`button-review-${approval.id}`}>
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!pendingApprovals?.data?.approvals || pendingApprovals.data.approvals.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No pending approvals at this time.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Escalations Tab */}
        <TabsContent value="escalations" className="space-y-4">
          <Card data-testid="card-escalations-list">
            <CardHeader>
              <CardTitle>Active Escalations</CardTitle>
              <CardDescription>
                Items escalated for higher-level approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {escalationsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-10 w-10 bg-gray-200 rounded animate-pulse" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {(escalationsData?.data || []).slice(0, 10).map((escalation: any) => (
                    <div key={escalation.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {escalation.escalationLevel?.replace('_', ' ').toUpperCase() || 'Unknown'} Level
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Urgency: {escalation.urgency} • Timeout: {escalation.timeoutHours}h
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={escalation.urgency === 'critical' ? 'destructive' : 'secondary'}>
                          {escalation.urgency}
                        </Badge>
                        <Button size="sm" data-testid={`button-escalation-${escalation.id}`}>
                          Handle
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!escalationsData?.data || escalationsData.data.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No active escalations at this time.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card data-testid="card-trend-analysis">
              <CardHeader>
                <CardTitle>Trend Analysis</CardTitle>
                <CardDescription>7-day approval trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Volume</span>
                    <span className="font-bold">
                      {(trends.daily || []).reduce((sum: number, day: any) => sum + (day.totalApprovals || 0), 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Avg Daily</span>
                    <span className="font-bold">
                      {trends.daily && trends.daily.length > 0
                        ? Math.round((trends.daily || []).reduce((sum: number, day: any) => sum + (day.totalApprovals || 0), 0) / trends.daily.length)
                        : 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Peak Day</span>
                    <span className="font-bold">
                      {Math.max(...(trends.daily || []).map((day: any) => day.totalApprovals || 0)) || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-efficiency-metrics">
              <CardHeader>
                <CardTitle>Efficiency Metrics</CardTitle>
                <CardDescription>System performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">SLA Compliance</span>
                    <span className="font-bold text-green-600">98.5%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Error Rate</span>
                    <span className="font-bold text-red-600">0.3%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">User Satisfaction</span>
                    <span className="font-bold text-blue-600">4.7/5</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-forecast">
              <CardHeader>
                <CardTitle>Forecast</CardTitle>
                <CardDescription>Predicted volumes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Tomorrow</span>
                    <span className="font-bold">~{Math.round((summary.todayApprovals || 0) * 1.1)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Next Week</span>
                    <span className="font-bold">~{Math.round((summary.todayApprovals || 0) * 7 * 1.05)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Confidence</span>
                    <span className="font-bold text-green-600">87%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}