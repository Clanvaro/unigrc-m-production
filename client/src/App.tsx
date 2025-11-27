import { Switch, Route, useLocation, Redirect } from "wouter";
import { useState, lazy, Suspense, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SearchProvider } from "@/contexts/SearchContext";
import { RiskFormattingProvider } from "@/contexts/RiskFormattingContext";
import { ThemeProvider } from "@/hooks/use-theme";
import { useIsMobile } from "@/hooks/use-mobile";
import { CSRFInitializer } from "@/components/CSRFInitializer";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { PageErrorBoundary } from "@/components/ErrorBoundary";
import { CommandPalette } from "@/components/command-palette";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { SkipToMain } from "@/components/SkipToMain";
import { usePrefetchRoutes } from "@/hooks/usePrefetch";
import AIAssistantLazy from "@/components/ai-assistant-lazy";
import { AuthBoundary } from "@/components/AuthBoundary";
import { useAuth } from "@/hooks/useAuth";

// Lazy load all pages for better performance
const DashboardRouter = lazy(() => import("@/pages/DashboardRouter"));
const ExecutorDashboard = lazy(() => import("@/pages/ExecutorDashboard"));
const SupervisorDashboard = lazy(() => import("@/pages/SupervisorDashboard"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const Organization = lazy(() => import("@/pages/organization"));
const Risks = lazy(() => import("@/pages/risks"));
const RiskEvents = lazy(() => import("@/pages/risk-events"));
const RiskMatrix = lazy(() => import("@/pages/risk-matrix"));
const ProbabilityDemo = lazy(() => import("@/pages/probability-demo"));
const Controls = lazy(() => import("@/pages/controls"));
const ActionPlans = lazy(() => import("@/pages/action-plans"));
const Reports = lazy(() => import("@/pages/reports"));
const RiskCategories = lazy(() => import("@/pages/risk-categories"));
const RiskValidation = lazy(() => import("@/pages/risk-validation"));
const Users = lazy(() => import("@/pages/users"));
const Roles = lazy(() => import("@/pages/roles"));
const Config = lazy(() => import("@/pages/config"));
const ControlEffectivenessConfig = lazy(() => import("@/pages/control-effectiveness-config"));
const RiskRangesConfig = lazy(() => import("@/pages/risk-ranges-config"));
const RiskAggregationConfig = lazy(() => import("@/pages/risk-aggregation-config"));
const RiskConfig = lazy(() => import("@/pages/risk-config"));
const ProbabilityWeightsConfig = lazy(() => import("@/pages/config/probability-weights"));
const ImpactWeightsConfig = lazy(() => import("@/pages/config/impact-weights"));
const WeightsConfig = lazy(() => import("@/pages/config/weights"));
const CriteriaConfig = lazy(() => import("@/pages/config/criteria"));
const EmailConfig = lazy(() => import("@/pages/config/email-config"));
const Audits = lazy(() => import("./pages/audits"));
const AuditDetail = lazy(() => import("@/pages/audit-detail"));
const AuditPlanWizard = lazy(() => import("@/pages/audit-plan-wizard"));
const AuditPlanList = lazy(() => import("@/pages/audit-plan-list"));
const Team = lazy(() => import("@/pages/team"));
const TeamMembers = lazy(() => import("@/pages/team-members"));
const TeamRoles = lazy(() => import("@/pages/team-roles"));
const TeamAvailability = lazy(() => import("@/pages/team-availability"));
const Regulations = lazy(() => import("@/pages/regulations"));
const ComplianceTests = lazy(() => import("@/pages/compliance-tests"));
const ComplianceAudits = lazy(() => import("@/pages/compliance-audits.tsx"));
const ComplianceDocuments = lazy(() => import("@/pages/compliance-documents"));
const ComplianceOfficers = lazy(() => import("@/pages/compliance-officers"));
const AuditFindings = lazy(() => import("@/pages/audit-findings"));
const AuditReports = lazy(() => import("@/pages/audit-reports"));
const AuditTests = lazy(() => import("@/pages/audit-tests"));
const AuditTestDetails = lazy(() => import("@/pages/audit-test-details"));
const AuditTestManual = lazy(() => import("@/pages/audit-test-manual"));
const FiscalEntities = lazy(() => import("@/pages/fiscal-entities"));
const ProcessOwners = lazy(() => import("@/pages/process-owners"));
const PublicValidation = lazy(() => import("@/pages/public-validation"));
const PublicActionPlanValidation = lazy(() => import("@/pages/public-action-plan-validation"));
const PublicBatchValidation = lazy(() => import("@/pages/public-batch-validation"));
const ApprovalDashboard = lazy(() => import("@/pages/ApprovalDashboard"));
const ApprovalManagement = lazy(() => import("@/pages/ApprovalManagement"));
const NotFound = lazy(() => import("@/pages/not-found"));
const Import = lazy(() => import("@/pages/import"));
const Manual = lazy(() => import("@/pages/manual"));
const Shortcuts = lazy(() => import("@/pages/shortcuts"));
const Trash = lazy(() => import("@/pages/trash"));
const ActionPlanEvidenceUpload = lazy(() => import("@/pages/action-plan-evidence-upload"));
const PlatformOrganizations = lazy(() => import("@/pages/platform-organizations"));
const SetupWizard = lazy(() => import("@/pages/setup-wizard"));
const PlatformAdminDashboard = lazy(() => import("@/pages/platform-admin/dashboard"));
const PlatformAdminTenants = lazy(() => import("@/pages/platform-admin/tenants"));
const PlatformAdminUsers = lazy(() => import("@/pages/platform-admin/users"));
const PlatformAdminRoles = lazy(() => import("@/pages/platform-admin/roles"));
const LoginPage = lazy(() => import("@/pages/login"));
const NoAccess = lazy(() => import("@/pages/no-access"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    </div>
  );
}

// Public routes that don't need sidebar/header
function PublicRouter() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/no-access" component={NoAccess} />
      <Route path="/public/batch-validation/:token" component={PublicBatchValidation} />
      <Route path="/public/validate-action-plan/:token" component={PublicActionPlanValidation} />
      <Route path="/validate/:token" component={PublicValidation} />
      <Route path="/action-plan-upload/:token" component={ActionPlanEvidenceUpload} />
    </Switch>
  );
}

// Platform Admin Guard - only allows access to platform admins
function PlatformAdminGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect non-admins using useEffect to avoid state updates during render
  useEffect(() => {
    if (!isLoading && user && !user.isPlatformAdmin) {
      console.log("[PlatformAdminGuard] Non-admin user detected, redirecting to /");
      setLocation("/");
    }
  }, [isLoading, user, setLocation]);

  // Show loading state while auth query is pending
  if (isLoading) {
    return <PageLoader />;
  }

  // Once loaded, only render if user is platform admin
  if (user && !user.isPlatformAdmin) {
    return <PageLoader />;
  }

  // User is platform admin - allow access
  return <>{children}</>;
}

// Wrapper components for guarded routes
function PlatformAdminDashboardGuarded() {
  return <PlatformAdminGuard><Suspense fallback={<PageLoader />}><PlatformAdminDashboard /></Suspense></PlatformAdminGuard>;
}

function PlatformAdminTenantsGuarded() {
  return <PlatformAdminGuard><Suspense fallback={<PageLoader />}><PlatformAdminTenants /></Suspense></PlatformAdminGuard>;
}

function PlatformAdminUsersGuarded() {
  return <PlatformAdminGuard><Suspense fallback={<PageLoader />}><PlatformAdminUsers /></Suspense></PlatformAdminGuard>;
}

function PlatformAdminRolesGuarded() {
  return <PlatformAdminGuard><Suspense fallback={<PageLoader />}><PlatformAdminRoles /></Suspense></PlatformAdminGuard>;
}

// Protected routes with sidebar/header
function ProtectedRouter() {
  return (
    <Switch>
      <Route path="/" component={DashboardRouter} />
      <Route path="/dashboard" component={DashboardRouter} />
      <Route path="/dashboard/executor" component={ExecutorDashboard} />
      <Route path="/dashboard/supervisor" component={SupervisorDashboard} />
      <Route path="/dashboard/admin" component={AdminDashboard} />
      <Route path="/organization" component={Organization} />
      <Route path="/risks" component={Risks} />
      <Route path="/risk-events" component={RiskEvents} />
      <Route path="/matrix" component={RiskMatrix} />
      <Route path="/probability-demo" component={ProbabilityDemo} />
      <Route path="/validation" component={RiskValidation} />
      <Route path="/controls" component={Controls} />
      <Route path="/action-plans" component={ActionPlans} />
      <Route path="/reports" component={Reports} />
      <Route path="/import" component={Import} />
      <Route path="/manual" component={Manual} />
      <Route path="/manual/shortcuts" component={Shortcuts} />
      <Route path="/trash" component={Trash} />
      <Route path="/audits" component={Audits} />
      <Route path="/audits/:auditId" component={AuditDetail} />
      <Route path="/audit-tests" component={AuditTests} />
      <Route path="/audit-test/:id" component={AuditTestDetails} />
      <Route path="/audits/:auditId/create-test" component={AuditTestManual} />
      <Route path="/audit-plan-list" component={AuditPlanList} />
      <Route path="/audit-plan-wizard" component={AuditPlanWizard} />
      <Route path="/audit-findings" component={AuditFindings} />
      <Route path="/audit-reports" component={AuditReports} />
      <Route path="/team" component={Team} />
      <Route path="/team/members" component={TeamMembers} />
      <Route path="/team/roles" component={TeamRoles} />
      <Route path="/team/availability" component={TeamAvailability} />
      <Route path="/regulations" component={Regulations} />
      <Route path="/compliance-audits" component={ComplianceAudits} />
      <Route path="/compliance-tests" component={ComplianceTests} />
      <Route path="/compliance-documents" component={ComplianceDocuments} />
      <Route path="/compliance-officers" component={ComplianceOfficers} />
      <Route path="/setup-wizard" component={SetupWizard} />
      <Route path="/config" component={Config} />
      <Route path="/config/risks" component={RiskConfig} />
      <Route path="/config/categories" component={RiskCategories} />
      <Route path="/users" component={Users} />
      <Route path="/config/users" component={Users} />
      <Route path="/config/roles" component={Roles} />
      <Route path="/config/control-effectiveness" component={ControlEffectivenessConfig} />
      <Route path="/config/risk-ranges" component={RiskRangesConfig} />
      <Route path="/config/risk-aggregation" component={RiskAggregationConfig} />
      <Route path="/config/fiscal-entities" component={FiscalEntities} />
      <Route path="/config/probability-weights" component={ProbabilityWeightsConfig} />
      <Route path="/config/impact-weights" component={ImpactWeightsConfig} />
      <Route path="/config/weights" component={WeightsConfig} />
      <Route path="/config/criteria" component={CriteriaConfig} />
      <Route path="/config/email" component={EmailConfig} />
      <Route path="/platform/organizations" component={PlatformOrganizations} />
      <Route path="/platform-admin" component={PlatformAdminDashboardGuarded} />
      <Route path="/platform-admin/tenants" component={PlatformAdminTenantsGuarded} />
      <Route path="/platform-admin/users" component={PlatformAdminUsersGuarded} />
      <Route path="/platform-admin/roles" component={PlatformAdminRolesGuarded} />
      <Route path="/approval/dashboard" component={ApprovalDashboard} />
      <Route path="/approval/management" component={ApprovalManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const { open, setOpen } = useCommandPalette();
  
  // Intelligent prefetching for faster navigation
  usePrefetchRoutes();

  // Check if current route is public (no sidebar/header needed)
  const isPublicRoute = 
    location === '/login' ||
    location === '/no-access' ||
    location.startsWith('/public/') ||
    location.startsWith('/validate/') ||
    location.startsWith('/action-plan-upload/');
  
  // Check if current route is platform-admin (has its own layout)
  const isPlatformAdminRoute = location.startsWith('/platform-admin');

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  const toggleDesktopSidebar = () => {
    setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed);
  };

  // Public routes render without layout
  if (isPublicRoute) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <CSRFInitializer />
          <TooltipProvider>
            <RiskFormattingProvider>
              <PageErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <PublicRouter />
                </Suspense>
              </PageErrorBoundary>
              <Toaster />
            </RiskFormattingProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  // Platform Admin routes render with their own layout
  if (isPlatformAdminRoute) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <CSRFInitializer />
          <TooltipProvider>
            <RiskFormattingProvider>
              <AuthBoundary>
                <PageErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <ProtectedRouter />
                  </Suspense>
                </PageErrorBoundary>
              </AuthBoundary>
              <Toaster />
            </RiskFormattingProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  // Protected routes render with full layout
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CSRFInitializer />
        <TooltipProvider>
          <RiskFormattingProvider>
            <AuthBoundary>
              <SearchProvider>
                <SkipToMain />
                <div className="flex h-screen bg-background">
                  {/* Desktop Sidebar - only visible on larger screens */}
                  {!isMobile && <Sidebar isCollapsed={isDesktopSidebarCollapsed} />}
                  
                  <main id="main-content" className="flex-1 flex flex-col min-h-0 min-w-0 overflow-x-hidden">
                    <Header 
                      isMobile={isMobile}
                      onToggleMobileSidebar={toggleMobileSidebar}
                      onToggleDesktopSidebar={toggleDesktopSidebar}
                      isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
                    />
                    <div className="flex-1 bg-background min-w-0 overflow-auto">
                      <PageErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
                          <ProtectedRouter />
                        </Suspense>
                      </PageErrorBoundary>
                    </div>
                  </main>
                  
                  {/* Mobile Sidebar - Sheet overlay for mobile devices */}
                  {isMobile && (
                    <Sidebar 
                      isMobile={true}
                      isOpen={isMobileSidebarOpen}
                      onClose={closeMobileSidebar}
                    />
                  )}
                </div>
                
                {/* Command Palette - Global keyboard shortcut (⌘K / Ctrl+K) */}
                <CommandPalette open={open} onOpenChange={setOpen} />
                
                {/* AI Assistant - Floating button in bottom-right corner */}
                <AIAssistantLazy />
              </SearchProvider>
            </AuthBoundary>
          </RiskFormattingProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
