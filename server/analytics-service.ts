import { IStorage } from "./storage";
import { 
  type AuditorPerformanceMetrics, type InsertAuditorPerformanceMetrics,
  type RiskTrendingData, type InsertRiskTrendingData,
  type TeamPerformanceMetrics, type InsertTeamPerformanceMetrics,
  type WorkflowEfficiencyMetrics, type InsertWorkflowEfficiencyMetrics,
  type AuditorPerformanceFilters, type RiskTrendingFilters,
  type TeamPerformanceFilters, type WorkflowEfficiencyFilters,
  type AuditorPerformanceSummary, type RiskTrendingSummary,
  type TeamPerformanceSummary, type WorkflowEfficiencySummary,
  type TimeSeriesData, type ComparisonData, type HeatMapData
} from "@shared/schema";
import { subDays, subMonths, format, startOfMonth, endOfMonth } from "date-fns";

export class AnalyticsService {
  constructor(private storage: IStorage) {}

  // ============= AUDITOR PERFORMANCE ANALYTICS =============

  async calculateAuditorPerformanceMetrics(
    auditorId: string, 
    periodStart: Date, 
    periodEnd: Date
  ): Promise<AuditorPerformanceSummary> {
    // Get auditor's tests in the period
    const auditorTests = await this.storage.getMyAssignedTests(auditorId);
    const testsInPeriod = auditorTests.filter(test => 
      test.createdAt && test.createdAt >= periodStart && test.createdAt <= periodEnd
    );

    // Get work logs for detailed analysis
    const workLogs = await this.storage.getWorkLogsByDateRange(periodStart, periodEnd, auditorId);
    
    // Calculate completion metrics
    const totalTests = testsInPeriod.length;
    const completedTests = testsInPeriod.filter(test => test.status === 'completed').length;
    const completionRate = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;

    // Calculate on-time metrics - using plannedEndDate as deadline
    const testsWithDeadline = testsInPeriod.filter(test => test.plannedEndDate);
    const onTimeTests = testsWithDeadline.filter(test => 
      test.actualEndDate && test.plannedEndDate && test.actualEndDate <= test.plannedEndDate
    );
    const onTimeRate = testsWithDeadline.length > 0 ? (onTimeTests.length / testsWithDeadline.length) * 100 : 0;

    // Calculate average completion time
    const completedTestsWithTime = testsInPeriod.filter(test => 
      test.actualEndDate && test.createdAt
    );
    const totalCompletionTime = completedTestsWithTime.reduce((acc, test) => {
      const timeDiff = test.actualEndDate!.getTime() - test.createdAt!.getTime();
      return acc + (timeDiff / (1000 * 60 * 60)); // Convert to hours
    }, 0);
    const averageCompletionTime = completedTestsWithTime.length > 0 
      ? totalCompletionTime / completedTestsWithTime.length 
      : 0;

    // Calculate quality score (based on review comments and revision rates)
    const reviewedTests = testsInPeriod.filter(test => test.status === 'completed');
    const qualityScore = await this.calculateQualityScore(reviewedTests);

    // Calculate productivity score
    const totalHoursWorked = workLogs.reduce((acc, log) => acc + Number(log.hoursWorked || 0), 0);
    const productivityScore = totalHoursWorked > 0 ? (completedTests / totalHoursWorked) * 10 : 0;

    // Get auditor details
    const auditor = await this.storage.getUser(auditorId);

    return {
      auditorId,
      auditorName: auditor ? `${auditor.firstName} ${auditor.lastName}` : 'Unknown',
      department: undefined, // Department not available in current user schema
      totalTests,
      completedTests,
      completionRate,
      onTimeRate,
      averageCompletionTime,
      qualityScore,
      productivityScore,
      trends: {
        completionRate: 'stable', // TODO: Calculate actual trends
        qualityScore: 'stable',
        productivity: 'stable'
      }
    };
  }

  private async calculateQualityScore(tests: any[]): Promise<number> {
    // Simple quality scoring based on revision rates and review feedback
    // Higher score = fewer revisions needed, better review feedback
    let totalScore = 0;
    let validTests = 0;

    for (const test of tests) {
      // Check for revision count (fewer revisions = higher quality)
      const revisionFactor = Math.max(0, 10 - (test.revisionCount || 0));
      totalScore += revisionFactor;
      validTests++;
    }

    return validTests > 0 ? (totalScore / validTests) : 5.0;
  }

  async getAuditorPerformanceComparison(
    auditorIds: string[], 
    periodStart: Date, 
    periodEnd: Date
  ): Promise<Array<AuditorPerformanceSummary & { rank: number }>> {
    const performances = await Promise.all(
      auditorIds.map(id => this.calculateAuditorPerformanceMetrics(id, periodStart, periodEnd))
    );

    // Sort by overall performance score (combination of completion rate, quality, and productivity)
    const rankedPerformances = performances
      .map(perf => ({
        ...perf,
        overallScore: (perf.completionRate + perf.qualityScore + perf.productivityScore) / 3
      }))
      .sort((a, b) => b.overallScore - a.overallScore)
      .map((perf, index) => ({
        ...perf,
        rank: index + 1
      }));

    return rankedPerformances;
  }

  // ============= RISK TRENDING ANALYTICS =============

  async calculateRiskTrendingData(
    riskId: string, 
    periodStart: Date, 
    periodEnd: Date
  ): Promise<RiskTrendingSummary> {
    const risk = await this.storage.getRisk(riskId);
    if (!risk) throw new Error(`Risk ${riskId} not found`);

    // Get audit tests for this risk in the period
    // Get all audits and their tests
    const allAudits = await this.storage.getAudits();
    const allTestsPromises = allAudits.map(audit => this.storage.getAuditTests(audit.id));
    const allTestsArrays = await Promise.all(allTestsPromises);
    const allTests = allTestsArrays.flat();
    const riskTests = allTests.filter(test => 
      test.riskId === riskId && 
      test.createdAt && test.createdAt >= periodStart && test.createdAt <= periodEnd
    );

    // Calculate audit coverage
    const totalPossibleTests = 12; // Assume monthly audits as baseline
    const auditCoverage = (riskTests.length / totalPossibleTests) * 100;

    // Get control effectiveness for this risk
    const riskControls = await this.storage.getRiskControls(riskId);
    const controlEffectiveness = riskControls.length > 0 
      ? riskControls.reduce((acc, rc) => acc + (rc.control.effectiveness || 0), 0) / riskControls.length
      : 0;

    // Get findings for this risk
    const allFindings = await this.storage.getAuditFindings();
    const riskFindings = allFindings.filter(finding => 
      riskTests.some(test => test.id === finding.auditId)
    );

    const findingsCount = riskFindings.length;
    const criticalFindingsCount = riskFindings.filter(finding => 
      finding.severity === 'critical' || finding.severity === 'high'
    ).length;

    // Get recent audit dates
    const completedTests = riskTests.filter(test => test.actualEndDate);
    const lastAuditDate = completedTests.length > 0 
      ? new Date(Math.max(...completedTests.map(test => test.actualEndDate!.getTime())))
      : undefined;

    return {
      riskId,
      riskName: risk.name,
      currentLevel: risk.inherentRisk || 0,
      trend: 'stable', // TODO: Calculate actual trend
      auditCoverage,
      controlEffectiveness,
      findingsCount,
      criticalFindingsCount,
      lastAuditDate,
      nextPlannedAudit: undefined // TODO: Get from audit planning
    };
  }

  async getRiskHeatMapData(
    organizationLevel: 'process' | 'department' | 'organization'
  ): Promise<HeatMapData[]> {
    const risks = await this.storage.getRisks();
    const processes = await this.storage.getProcesses();
    
    const heatMapData: HeatMapData[] = [];

    if (organizationLevel === 'process') {
      for (const process of processes) {
        const processRisks = risks.filter(risk => risk.processId === process.id);
        const avgRiskLevel = processRisks.length > 0
          ? processRisks.reduce((acc, risk) => acc + (risk.inherentRisk || 0), 0) / processRisks.length
          : 0;

        heatMapData.push({
          x: process.name,
          y: 'Risk Level',
          value: avgRiskLevel,
          color: this.getRiskColor(avgRiskLevel),
          tooltip: `${process.name}: ${avgRiskLevel.toFixed(1)} average risk level`
        });
      }
    }

    return heatMapData;
  }

  private getRiskColor(riskLevel: number): string {
    if (riskLevel >= 8) return '#dc3545'; // High risk - red
    if (riskLevel >= 5) return '#ffc107'; // Medium risk - yellow
    if (riskLevel >= 2) return '#28a745'; // Low risk - green
    return '#6c757d'; // Very low risk - gray
  }

  // ============= TEAM PERFORMANCE ANALYTICS =============

  async calculateTeamPerformanceMetrics(
    departmentName: string, 
    periodStart: Date, 
    periodEnd: Date
  ): Promise<TeamPerformanceSummary> {
    // Get all users in the department
    const allUsers = await this.storage.getUsers();
    // Note: Using a placeholder since department is not available in current user schema
    const departmentUsers = allUsers.filter(() => false); // Department filtering not available

    // Calculate individual performance for each team member
    const memberPerformances = await Promise.all(
      departmentUsers.map(user => 
        this.calculateAuditorPerformanceMetrics(user.id, periodStart, periodEnd)
      )
    );

    const memberCount = departmentUsers.length;
    const totalTests = memberPerformances.reduce((acc, perf) => acc + perf.totalTests, 0);
    const completionRate = memberPerformances.length > 0
      ? memberPerformances.reduce((acc, perf) => acc + perf.completionRate, 0) / memberPerformances.length
      : 0;
    const onTimeRate = memberPerformances.length > 0
      ? memberPerformances.reduce((acc, perf) => acc + perf.onTimeRate, 0) / memberPerformances.length
      : 0;
    const qualityScore = memberPerformances.length > 0
      ? memberPerformances.reduce((acc, perf) => acc + perf.qualityScore, 0) / memberPerformances.length
      : 0;
    const productivityScore = memberPerformances.length > 0
      ? memberPerformances.reduce((acc, perf) => acc + perf.productivityScore, 0) / memberPerformances.length
      : 0;

    // Get top performers (top 20% or at least top 3)
    const sortedPerformers = memberPerformances
      .sort((a, b) => (b.completionRate + b.qualityScore + b.productivityScore) - (a.completionRate + a.qualityScore + a.productivityScore));
    const topPerformerCount = Math.max(3, Math.ceil(memberPerformances.length * 0.2));
    const topPerformers = sortedPerformers.slice(0, topPerformerCount);

    return {
      departmentName,
      memberCount,
      totalTests,
      completionRate,
      onTimeRate,
      qualityScore,
      productivityScore,
      topPerformers,
      improvementAreas: [], // TODO: Identify improvement areas
      workloadDistribution: 'balanced' // TODO: Calculate actual distribution
    };
  }

  // ============= WORKFLOW EFFICIENCY ANALYTICS =============

  async calculateWorkflowEfficiencyMetrics(
    periodStart: Date, 
    periodEnd: Date
  ): Promise<WorkflowEfficiencySummary> {
    // Get all tests in the period
    // Get all audits and their tests
    const allAudits = await this.storage.getAudits();
    const allTestsPromises = allAudits.map(audit => this.storage.getAuditTests(audit.id));
    const allTestsArrays = await Promise.all(allTestsPromises);
    const allTests = allTestsArrays.flat();
    const testsInPeriod = allTests.filter(test => 
      test.createdAt && test.createdAt >= periodStart && test.createdAt <= periodEnd
    );

    // Calculate completion times
    const completedTests = testsInPeriod.filter(test => 
      test.actualEndDate && test.createdAt
    );

    const completionTimes = completedTests.map(test => {
      const timeDiff = test.actualEndDate!.getTime() - test.createdAt!.getTime();
      return timeDiff / (1000 * 60 * 60); // Convert to hours
    });

    const averageCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((acc, time) => acc + time, 0) / completionTimes.length
      : 0;

    const medianCompletionTime = completionTimes.length > 0
      ? this.calculateMedian(completionTimes)
      : 0;

    // Calculate on-time percentage
    const testsWithDeadline = testsInPeriod.filter(test => test.plannedEndDate);
    const onTimeTests = testsWithDeadline.filter(test => 
      test.actualEndDate && test.plannedEndDate && test.actualEndDate <= test.plannedEndDate
    );
    const onTimePercentage = testsWithDeadline.length > 0
      ? (onTimeTests.length / testsWithDeadline.length) * 100
      : 0;

    return {
      averageCompletionTime,
      medianCompletionTime,
      onTimePercentage,
      bottlenecks: [], // TODO: Identify bottlenecks
      revisionRate: 0, // TODO: Calculate revision rate
      approvalTime: 0, // TODO: Calculate approval time
      seasonalTrends: [] // TODO: Calculate seasonal trends
    };
  }

  private calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    } else {
      return sorted[middle];
    }
  }

  // ============= CHART DATA GENERATION =============

  async generateTimeSeriesData(
    type: 'auditor_performance' | 'risk_trending' | 'workflow_efficiency',
    filters: any
  ): Promise<TimeSeriesData[]> {
    const data: TimeSeriesData[] = [];
    const { startDate, endDate } = filters;
    
    // Generate monthly data points between start and end dates
    let currentDate = startOfMonth(startDate);
    const end = endOfMonth(endDate);

    while (currentDate <= end) {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      switch (type) {
        case 'auditor_performance':
          if (filters.auditorId) {
            const metrics = await this.calculateAuditorPerformanceMetrics(
              filters.auditorId, 
              monthStart, 
              monthEnd
            );
            data.push({
              date: currentDate,
              value: metrics.completionRate,
              category: 'Completion Rate',
              tooltip: `${format(currentDate, 'MMM yyyy')}: ${metrics.completionRate.toFixed(1)}%`
            });
          }
          break;

        case 'workflow_efficiency':
          const efficiency = await this.calculateWorkflowEfficiencyMetrics(monthStart, monthEnd);
          data.push({
            date: currentDate,
            value: efficiency.onTimePercentage,
            category: 'On-Time Percentage',
            tooltip: `${format(currentDate, 'MMM yyyy')}: ${efficiency.onTimePercentage.toFixed(1)}%`
          });
          break;
      }

      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }

    return data;
  }

  async generateComparisonData(
    type: 'auditor' | 'team' | 'risk',
    filters: any
  ): Promise<ComparisonData[]> {
    const data: ComparisonData[] = [];

    if (type === 'auditor' && filters.auditorIds) {
      const performances = await Promise.all(
        filters.auditorIds.map((id: string) => 
          this.calculateAuditorPerformanceMetrics(id, filters.startDate, filters.endDate)
        )
      );

      return performances.map(perf => ({
        category: perf.auditorName,
        current: perf.completionRate,
        target: 85, // Target completion rate
        trend: 'stable'
      }));
    }

    return data;
  }

  // ============= DATA AGGREGATION SERVICES =============

  async aggregateAuditorMetrics(periodStart: Date, periodEnd: Date): Promise<void> {
    // Get all users with auditor role
    const allUsers = await this.storage.getUsers();
    // Since department is not available, get all users for now
    const auditors = allUsers;

    // Calculate and store metrics for each auditor
    for (const auditor of auditors) {
      const metrics = await this.calculateAuditorPerformanceMetrics(
        auditor.id, 
        periodStart, 
        periodEnd
      );

      // TODO: Store metrics in database
      // await this.storage.createAuditorPerformanceMetrics(...)
    }
  }

  async aggregateRiskTrends(periodStart: Date, periodEnd: Date): Promise<void> {
    const risks = await this.storage.getRisks();

    for (const risk of risks) {
      const trendData = await this.calculateRiskTrendingData(
        risk.id, 
        periodStart, 
        periodEnd
      );

      // TODO: Store trend data in database
      // await this.storage.createRiskTrendingData(...)
    }
  }

  async aggregateTeamPerformance(periodStart: Date, periodEnd: Date): Promise<void> {
    const allUsers = await this.storage.getUsers();
    const departments = Array.from(new Set(['General'])); // Default department since user.department not available

    for (const department of departments) {
      const teamMetrics = await this.calculateTeamPerformanceMetrics(
        department!, 
        periodStart, 
        periodEnd
      );

      // TODO: Store team metrics in database
      // await this.storage.createTeamPerformanceMetrics(...)
    }
  }

  async aggregateWorkflowMetrics(periodStart: Date, periodEnd: Date): Promise<void> {
    const workflowMetrics = await this.calculateWorkflowEfficiencyMetrics(
      periodStart, 
      periodEnd
    );

    // TODO: Store workflow metrics in database
    // await this.storage.createWorkflowEfficiencyMetrics(...)
  }

  // ============= SUMMARY METHODS REQUIRED BY ROUTES =============

  async getAuditorPerformanceSummary(filters: AuditorPerformanceFilters): Promise<AuditorPerformanceSummary[]> {
    try {
      const { startDate, endDate, auditorIds, departmentNames, testTypes, riskLevels } = filters;
      
      // Get all users for auditor performance calculation
      const allUsers = await this.storage.getUsers();
      let targetAuditors = allUsers;
      
      // Apply filters if provided
      if (auditorIds && auditorIds.length > 0) {
        targetAuditors = allUsers.filter(user => auditorIds.includes(user.id));
      }
      
      // Calculate performance for each auditor
      const summaries: AuditorPerformanceSummary[] = [];
      for (const auditor of targetAuditors) {
        try {
          const summary = await this.calculateAuditorPerformanceMetrics(
            auditor.id,
            startDate,
            endDate
          );
          summaries.push(summary);
        } catch (error) {
          console.error(`Error calculating metrics for auditor ${auditor.id}:`, error);
        }
      }
      
      return summaries;
    } catch (error) {
      console.error('Error getting auditor performance summary:', error);
      return [];
    }
  }

  async getRiskTrendingSummary(filters: RiskTrendingFilters): Promise<RiskTrendingSummary[]> {
    try {
      const { startDate, endDate, riskIds, processIds, macroprocesoIds, riskCategories, riskLevels } = filters;
      
      // Get all risks or filter by specific IDs
      const allRisks = await this.storage.getRisks();
      let targetRisks = allRisks;
      
      // Apply filters if provided
      if (riskIds && riskIds.length > 0) {
        targetRisks = allRisks.filter(risk => riskIds.includes(risk.id));
      }
      if (processIds && processIds.length > 0) {
        targetRisks = targetRisks.filter(risk => risk.processId && processIds.includes(risk.processId));
      }
      if (macroprocesoIds && macroprocesoIds.length > 0) {
        targetRisks = targetRisks.filter(risk => risk.macroprocesoId && macroprocesoIds.includes(risk.macroprocesoId));
      }
      
      // Calculate trending data for each risk
      const summaries: RiskTrendingSummary[] = [];
      for (const risk of targetRisks) {
        try {
          const summary = await this.calculateRiskTrendingData(
            risk.id,
            startDate,
            endDate
          );
          summaries.push(summary);
        } catch (error) {
          console.error(`Error calculating trending for risk ${risk.id}:`, error);
        }
      }
      
      return summaries;
    } catch (error) {
      console.error('Error getting risk trending summary:', error);
      return [];
    }
  }

  async getTeamPerformanceSummary(filters: TeamPerformanceFilters): Promise<TeamPerformanceSummary[]> {
    try {
      const { startDate, endDate, departmentNames, teamIds, includedMetrics } = filters;
      
      // Since user.department is not available, create a mock department list
      const departments = ['General', 'Auditoría', 'Riesgos', 'Compliance'];
      let targetDepartments = departments;
      
      // Apply department name filters if provided
      if (departmentNames && departmentNames.length > 0) {
        targetDepartments = departments.filter(dept => departmentNames.includes(dept));
      }
      
      // Calculate performance for each department
      const summaries: TeamPerformanceSummary[] = [];
      for (const department of targetDepartments) {
        try {
          const summary = await this.calculateTeamPerformanceMetrics(
            department,
            startDate,
            endDate
          );
          summaries.push(summary);
        } catch (error) {
          console.error(`Error calculating metrics for department ${department}:`, error);
        }
      }
      
      return summaries;
    } catch (error) {
      console.error('Error getting team performance summary:', error);
      return [];
    }
  }

  async getWorkflowEfficiencySummary(filters: WorkflowEfficiencyFilters): Promise<WorkflowEfficiencySummary> {
    try {
      const { startDate, endDate } = filters;
      
      // Calculate workflow efficiency metrics for the specified period
      return await this.calculateWorkflowEfficiencyMetrics(startDate, endDate);
      
    } catch (error) {
      console.error('Error getting workflow efficiency summary:', error);
      return {
        averageCompletionTime: 0,
        medianCompletionTime: 0,
        onTimePercentage: 0,
        bottlenecks: [],
        revisionRate: 0,
        approvalTime: 0,
        seasonalTrends: []
      };
    }
  }
}