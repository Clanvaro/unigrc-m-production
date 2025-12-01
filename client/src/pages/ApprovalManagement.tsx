import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Filter,
  Search,
  Download,
  RefreshCw,
  Eye,
  ArrowUpCircle
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

/**
 * ApprovalManagement - Comprehensive approval workflow management interface
 * 
 * Features:
 * - View and manage pending approvals
 * - Bulk approval operations
 * - Individual approval/rejection with reasoning
 * - Escalation management
 * - Approval history and audit trail
 */
export default function ApprovalManagement() {
  const { toast } = useToast();
  const [selectedApprovals, setSelectedApprovals] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [approvalReasoning, setApprovalReasoning] = useState('');
  const [rejectionReasoning, setRejectionReasoning] = useState('');

  // Fetch pending approvals
  const { data: pendingApprovals, isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ['/api/approval/pending'],
    refetchInterval: 300000, // Optimized: 5 minutes to reduce server load
  });

  // Fetch approval records
  const { data: approvalRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ['/api/approval/records'],
  });

  // Fetch escalations
  const { data: escalations, isLoading: escalationsLoading } = useQuery({
    queryKey: ['/api/approval/escalations'],
  });

  // Approval mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, reasoning }: { id: string; reasoning?: string }) => {
      return apiRequest(`/api/approval/approve/${id}`, {
        method: 'POST',
        body: JSON.stringify({
          approverId: 'current_user', // This should come from auth context
          reasoning: reasoning || 'Approved via management interface',
          followUpRequired: false
        })
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Item approved successfully." });
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ['/api/approval/records'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve item.",
        variant: "destructive"
      });
    }
  });

  // Rejection mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reasoning }: { id: string; reasoning: string }) => {
      return apiRequest(`/api/approval/reject/${id}`, {
        method: 'POST',
        body: JSON.stringify({
          approverId: 'current_user',
          reasoning
        })
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Item rejected successfully." });
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ['/api/approval/records'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject item.",
        variant: "destructive"
      });
    }
  });

  // Escalation mutation
  const escalateMutation = useMutation({
    mutationFn: async ({ id, escalationLevel, reason }: { id: string; escalationLevel: string; reason: string }) => {
      return apiRequest(`/api/approval/escalate/${id}`, {
        method: 'POST',
        body: JSON.stringify({
          escalationLevel,
          reason,
          urgency: 'medium',
          escalatedBy: 'current_user'
        })
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Item escalated successfully." });
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ['/api/approval/escalations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to escalate item.",
        variant: "destructive"
      });
    }
  });

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: async ({ itemIds, reasoning }: { itemIds: string[]; reasoning?: string }) => {
      return apiRequest('/api/approval/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({
          itemIds,
          approverId: 'current_user',
          reasoning: reasoning || 'Bulk approval via management interface'
        })
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Items approved successfully." });
      setSelectedApprovals([]);
      refetchPending();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to bulk approve items.",
        variant: "destructive"
      });
    }
  });

  // Filter approvals
  const filteredApprovals = (pendingApprovals?.data?.approvals || []).filter((approval: any) => {
    const matchesStatus = filterStatus === 'all' || approval.approvalStatus === filterStatus;
    const matchesRisk = filterRiskLevel === 'all' || approval.riskLevel === filterRiskLevel;
    const matchesSearch = !searchTerm ||
      approval.approvalItemType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.approvalItemId.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesRisk && matchesSearch;
  });

  const handleApprove = (id: string) => {
    approveMutation.mutate({ id, reasoning: approvalReasoning });
    setApprovalReasoning('');
    setSelectedApproval(null);
  };

  const handleReject = (id: string) => {
    if (!rejectionReasoning.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection.",
        variant: "destructive"
      });
      return;
    }
    rejectMutation.mutate({ id, reasoning: rejectionReasoning });
    setRejectionReasoning('');
    setSelectedApproval(null);
  };

  const handleEscalate = (id: string, escalationLevel: string, reason: string) => {
    escalateMutation.mutate({ id, escalationLevel, reason });
  };

  const handleBulkApprove = () => {
    if (selectedApprovals.length === 0) {
      toast({
        title: "Error",
        description: "Please select items to approve.",
        variant: "destructive"
      });
      return;
    }
    bulkApproveMutation.mutate({ itemIds: selectedApprovals });
  };

  const toggleSelection = (id: string) => {
    setSelectedApprovals(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedApprovals(filteredApprovals.map((approval: any) => approval.id));
  };

  const clearSelection = () => {
    setSelectedApprovals([]);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Approval Management</h2>
          <p className="text-muted-foreground">
            Review, approve, reject, and escalate approval requests
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchPending()}
            data-testid="button-refresh"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            data-testid="button-export"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList data-testid="tabs-approval-management">
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({filteredApprovals.length})
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            History
          </TabsTrigger>
          <TabsTrigger value="escalations" data-testid="tab-escalations">
            Escalations ({escalations?.data?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Pending Approvals Tab */}
        <TabsContent value="pending" className="space-y-4">
          {/* Filters and Search */}
          <Card data-testid="card-filters">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="mr-2 h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by ID or type..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                      data-testid="input-search"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger data-testid="select-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="escalated">Escalated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="risk-filter">Risk Level</Label>
                  <Select value={filterRiskLevel} onValueChange={setFilterRiskLevel}>
                    <SelectTrigger data-testid="select-risk-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Risk Levels</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAll}
                    disabled={filteredApprovals.length === 0}
                    data-testid="button-select-all"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                    disabled={selectedApprovals.length === 0}
                    data-testid="button-clear-selection"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selectedApprovals.length > 0 && (
            <Card data-testid="card-bulk-actions">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {selectedApprovals.length} item{selectedApprovals.length !== 1 ? 's' : ''} selected
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      onClick={handleBulkApprove}
                      disabled={bulkApproveMutation.isPending}
                      data-testid="button-bulk-approve"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Bulk Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid="button-bulk-escalate"
                    >
                      <ArrowUpCircle className="mr-2 h-4 w-4" />
                      Bulk Escalate
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Approvals Table */}
          <Card data-testid="card-approvals-table">
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                Items requiring your review and approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedApprovals.length === filteredApprovals.length && filteredApprovals.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              selectAll();
                            } else {
                              clearSelection();
                            }
                          }}
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApprovals.map((approval: any) => (
                      <TableRow key={approval.id} data-testid={`row-approval-${approval.id}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedApprovals.includes(approval.id)}
                            onCheckedChange={() => toggleSelection(approval.id)}
                            data-testid={`checkbox-approval-${approval.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{approval.approvalItemId}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {approval.approvalReasoning || 'No description available'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {approval.approvalItemType?.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              approval.riskLevel === 'critical' ? 'destructive' :
                                approval.riskLevel === 'high' ? 'secondary' :
                                  approval.riskLevel === 'medium' ? 'outline' : 'default'
                            }
                          >
                            {approval.riskLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(approval.submittedAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(approval.submittedAt).toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={approval.approvalStatus === 'escalated' ? 'secondary' : 'outline'}
                          >
                            {approval.approvalStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedApproval(approval)}
                              data-testid={`button-view-${approval.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(approval.id)}
                              disabled={approveMutation.isPending}
                              data-testid={`button-approve-${approval.id}`}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedApproval(approval);
                                setRejectionReasoning('');
                              }}
                              disabled={rejectMutation.isPending}
                              data-testid={`button-reject-${approval.id}`}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {filteredApprovals.length === 0 && !pendingLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  No pending approvals found matching your criteria.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card data-testid="card-approval-history">
            <CardHeader>
              <CardTitle>Approval History</CardTitle>
              <CardDescription>
                Historical approval records and audit trail
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recordsLoading ? (
                <div className="text-center py-8">Loading approval history...</div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Approval history will be displayed here.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Escalations Tab */}
        <TabsContent value="escalations" className="space-y-4">
          <Card data-testid="card-escalations-management">
            <CardHeader>
              <CardTitle>Active Escalations</CardTitle>
              <CardDescription>
                Items escalated for higher-level approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {escalationsLoading ? (
                <div className="text-center py-8">Loading escalations...</div>
              ) : (
                <div className="space-y-4">
                  {(escalations?.data || []).map((escalation: any) => (
                    <div key={escalation.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {escalation.escalationLevel?.replace('_', ' ').toUpperCase()} Level
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {escalation.escalationReason}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={escalation.urgency === 'critical' ? 'destructive' : 'secondary'}>
                            {escalation.urgency}
                          </Badge>
                          <Button size="sm" data-testid={`button-handle-escalation-${escalation.id}`}>
                            Handle
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!escalations?.data || escalations.data.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No active escalations at this time.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approval Detail Modal */}
      {selectedApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Approval Details</CardTitle>
              <CardDescription>
                Review and take action on this approval request
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Item ID</Label>
                  <div className="font-medium">{selectedApproval.approvalItemId}</div>
                </div>
                <div>
                  <Label>Type</Label>
                  <Badge variant="outline">
                    {selectedApproval.approvalItemType?.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Label>Risk Level</Label>
                  <Badge
                    variant={
                      selectedApproval.riskLevel === 'critical' ? 'destructive' :
                        selectedApproval.riskLevel === 'high' ? 'secondary' : 'outline'
                    }
                  >
                    {selectedApproval.riskLevel}
                  </Badge>
                </div>
                <div>
                  <Label>Submitted</Label>
                  <div className="text-sm">{new Date(selectedApproval.submittedAt).toLocaleString()}</div>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <div className="text-sm text-muted-foreground">
                  {selectedApproval.approvalReasoning || 'No description available'}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approval-reasoning">Approval Reasoning (Optional)</Label>
                <Textarea
                  id="approval-reasoning"
                  placeholder="Add reasoning for your approval decision..."
                  value={approvalReasoning}
                  onChange={(e) => setApprovalReasoning(e.target.value)}
                  data-testid="textarea-approval-reasoning"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rejection-reasoning">Rejection Reasoning</Label>
                <Textarea
                  id="rejection-reasoning"
                  placeholder="Please provide a reason for rejection..."
                  value={rejectionReasoning}
                  onChange={(e) => setRejectionReasoning(e.target.value)}
                  data-testid="textarea-rejection-reasoning"
                />
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <Button
                  onClick={() => handleApprove(selectedApproval.id)}
                  disabled={approveMutation.isPending}
                  data-testid="button-approve-modal"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleReject(selectedApproval.id)}
                  disabled={rejectMutation.isPending || !rejectionReasoning.trim()}
                  data-testid="button-reject-modal"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleEscalate(selectedApproval.id, 'manager', 'Escalated for review')}
                  disabled={escalateMutation.isPending}
                  data-testid="button-escalate-modal"
                >
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  Escalate
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedApproval(null)}
                  data-testid="button-close-modal"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}