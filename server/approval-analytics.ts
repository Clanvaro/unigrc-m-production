import { 
  type ApprovalAnalytics, 
  type InsertApprovalAnalytics,
  type ApprovalRecord,
  type EscalationPath,
  type ApprovalMetrics,
  type ApproverPerformance,
  type User,
  approvalRecords,
  escalationPaths,
  approvalAnalytics,
  users,
  approvalPerformanceMetrics
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte, lte, count, avg, sum } from "drizzle-orm";

/**
 * Approval Analytics & Tracking System
 * 
 * Provides comprehensive analytics, performance monitoring, and tracking
 * for the approval workflow system
 */
export class ApprovalAnalyticsService {

  /**
   * Generate comprehensive approval metrics for a date range
   */
  async generateApprovalMetrics(
    startDate: Date, 
    endDate: Date, 
    department?: string
  ): Promise<ApprovalMetrics> {
    console.log(`📊 Generating approval metrics from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    try {
      // Base query for approval records in date range
      let baseQuery = db.select()
        .from(approvalRecords)
        .where(
          and(
            gte(approvalRecords.submittedAt, startDate),
            lte(approvalRecords.submittedAt, endDate)
          )
        );

      const records = await baseQuery;
      console.log(`📈 Found ${records.length} approval records in date range`);

      // Calculate basic metrics
      const totalApprovals = records.length;
      const automaticApprovals = records.filter(r => r.decisionMethod === 'automatic').length;
      const manualApprovals = records.filter(r => r.decisionMethod === 'manual').length;
      const escalatedApprovals = records.filter(r => r.approvalStatus === 'escalated').length;
      const rejectedApprovals = records.filter(r => r.approvalStatus === 'rejected').length;
      const expiredApprovals = records.filter(r => r.approvalStatus === 'expired').length;
      const approvedCount = records.filter(r => r.approvalStatus === 'approved').length;

      // Calculate processing time
      const processedRecords = records.filter(r => r.processingTimeMinutes && r.processingTimeMinutes > 0);
      const totalProcessingTime = processedRecords.reduce((sum, r) => sum + (r.processingTimeMinutes || 0), 0);
      const averageProcessingTime = processedRecords.length > 0 ? totalProcessingTime / processedRecords.length / 60 : 0; // hours

      // Calculate rates
      const approvalRate = totalApprovals > 0 ? (approvedCount / totalApprovals) * 100 : 0;
      const escalationRate = totalApprovals > 0 ? (escalatedApprovals / totalApprovals) * 100 : 0;
      const automaticApprovalRate = totalApprovals > 0 ? (automaticApprovals / totalApprovals) * 100 : 0;

      // Calculate policy compliance rate
      const compliantRecords = records.filter(r => {
        const compliance = r.policyCompliance as any;
        return compliance && compliance.isCompliant === true;
      });
      const policyComplianceRate = totalApprovals > 0 ? (compliantRecords.length / totalApprovals) * 100 : 0;

      // Department breakdown
      const departmentBreakdown = this.calculateDepartmentBreakdown(records);

      // Risk level breakdown
      const riskLevelBreakdown = this.calculateRiskLevelBreakdown(records);

      // Approver performance (top 10)
      const approverPerformance = await this.calculateTopApproverPerformance(startDate, endDate);

      const metrics: ApprovalMetrics = {
        totalApprovals,
        automaticApprovals,
        manualApprovals,
        escalatedApprovals,
        rejectedApprovals,
        expiredApprovals,
        averageProcessingTime,
        approvalRate,
        escalationRate,
        automaticApprovalRate,
        policyComplianceRate,
        departmentBreakdown,
        riskLevelBreakdown,
        approverPerformance
      };

      console.log(`✅ Generated approval metrics: ${totalApprovals} total, ${automaticApprovalRate.toFixed(1)}% automatic`);
      return metrics;
    } catch (error) {
      console.error(`❌ Error generating approval metrics:`, error);
      throw error;
    }
  }

  /**
   * Calculate department breakdown of approvals
   */
  private calculateDepartmentBreakdown(records: ApprovalRecord[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    records.forEach(record => {
      // For now, we'll use a default department since we don't have department info directly on records
      // In production, this would extract from organizationalContext or join with other tables
      const department = 'general'; // This should be extracted from record context
      breakdown[department] = (breakdown[department] || 0) + 1;
    });

    return breakdown;
  }

  /**
   * Calculate risk level breakdown of approvals
   */
  private calculateRiskLevelBreakdown(records: ApprovalRecord[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    records.forEach(record => {
      const riskLevel = record.riskLevel || 'unknown';
      breakdown[riskLevel] = (breakdown[riskLevel] || 0) + 1;
    });

    return breakdown;
  }

  /**
   * Calculate top approver performance for date range
   */
  private async calculateTopApproverPerformance(
    startDate: Date, 
    endDate: Date, 
    limit: number = 10
  ): Promise<Record<string, ApproverPerformance>> {
    try {
      // Get approvers with their performance data
      const approverData = await db.select({
        approverId: approvalRecords.approvedBy,
        approverName: users.fullName,
        approvalsCount: count(approvalRecords.id),
        avgProcessingTime: avg(approvalRecords.processingTimeMinutes)
      })
      .from(approvalRecords)
      .leftJoin(users, eq(approvalRecords.approvedBy, users.id))
      .where(
        and(
          gte(approvalRecords.submittedAt, startDate),
          lte(approvalRecords.submittedAt, endDate),
          sql`${approvalRecords.approvedBy} IS NOT NULL`
        )
      )
      .groupBy(approvalRecords.approvedBy, users.fullName)
      .orderBy(desc(count(approvalRecords.id)))
      .limit(limit);

      const performance: Record<string, ApproverPerformance> = {};

      for (const approver of approverData) {
        if (approver.approverId) {
          // Get current workload for this approver
          const currentWorkload = await this.getCurrentWorkload(approver.approverId);
          
          // Get escalations initiated by this approver
          const escalationsInitiated = await this.getEscalationsInitiated(approver.approverId, startDate, endDate);

          performance[approver.approverId] = {
            approverId: approver.approverId,
            approverName: approver.approverName || 'Unknown',
            approvalsProcessed: Number(approver.approvalsCount) || 0,
            averageDecisionTime: Number(approver.avgProcessingTime) || 0,
            accuracyScore: 95, // This would be calculated based on decision reversals
            workload: currentWorkload,
            overdueItems: 0, // This would be calculated based on pending items past due
            escalationInitiated: escalationsInitiated,
            policyViolations: 0, // This would be calculated based on policy compliance
            stakeholderFeedback: 4.5 // This would come from feedback surveys
          };
        }
      }

      return performance;
    } catch (error) {
      console.error(`❌ Error calculating approver performance:`, error);
      return {};
    }
  }

  /**
   * Get current workload for an approver
   */
  private async getCurrentWorkload(approverId: string): Promise<number> {
    try {
      const pendingEscalations = await db.select({ count: count() })
        .from(escalationPaths)
        .where(
          and(
            eq(escalationPaths.escalationStatus, 'pending'),
            sql`${approverId} = ANY(${escalationPaths.assignedApprovers})`
          )
        );

      return Number(pendingEscalations[0]?.count) || 0;
    } catch (error) {
      console.error(`❌ Error getting current workload:`, error);
      return 0;
    }
  }

  /**
   * Get escalations initiated by an approver
   */
  private async getEscalationsInitiated(approverId: string, startDate: Date, endDate: Date): Promise<number> {
    try {
      const escalations = await db.select({ count: count() })
        .from(escalationPaths)
        .innerJoin(approvalRecords, eq(escalationPaths.approvalRecordId, approvalRecords.id))
        .where(
          and(
            eq(approvalRecords.approvedBy, approverId),
            gte(escalationPaths.createdAt, startDate),
            lte(escalationPaths.createdAt, endDate)
          )
        );

      return Number(escalations[0]?.count) || 0;
    } catch (error) {
      console.error(`❌ Error getting escalations initiated:`, error);
      return 0;
    }
  }

  /**
   * Generate escalation analytics for performance monitoring
   */
  async generateEscalationAnalytics(startDate: Date, endDate: Date): Promise<any> {
    console.log(`📊 Generating escalation analytics from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    try {
      const escalations = await db.select()
        .from(escalationPaths)
        .where(
          and(
            gte(escalationPaths.createdAt, startDate),
            lte(escalationPaths.createdAt, endDate)
          )
        );

      const analytics = {
        totalEscalations: escalations.length,
        escalationsByLevel: {} as Record<string, number>,
        escalationsByUrgency: {} as Record<string, number>,
        escalationsByStatus: {} as Record<string, number>,
        averageResolutionTime: 0,
        timeoutRate: 0,
        escalationTrends: [] as any[]
      };

      let totalResolutionTime = 0;
      let resolvedCount = 0;
      let timeoutCount = 0;

      escalations.forEach(escalation => {
        // Count by level
        analytics.escalationsByLevel[escalation.escalationLevel] = 
          (analytics.escalationsByLevel[escalation.escalationLevel] || 0) + 1;

        // Count by urgency
        analytics.escalationsByUrgency[escalation.urgency] = 
          (analytics.escalationsByUrgency[escalation.urgency] || 0) + 1;

        // Count by status
        analytics.escalationsByStatus[escalation.escalationStatus] = 
          (analytics.escalationsByStatus[escalation.escalationStatus] || 0) + 1;

        // Calculate resolution time
        if (escalation.resolvedAt && escalation.createdAt) {
          const resolutionTime = escalation.resolvedAt.getTime() - escalation.createdAt.getTime();
          totalResolutionTime += resolutionTime;
          resolvedCount++;
        }

        // Count timeouts
        if (escalation.escalationStatus === 'timeout') {
          timeoutCount++;
        }
      });

      analytics.averageResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount / (1000 * 60 * 60) : 0; // hours
      analytics.timeoutRate = escalations.length > 0 ? (timeoutCount / escalations.length) * 100 : 0; // percentage

      console.log(`✅ Generated escalation analytics: ${escalations.length} total, ${analytics.timeoutRate.toFixed(1)}% timeout rate`);
      return analytics;
    } catch (error) {
      console.error(`❌ Error generating escalation analytics:`, error);
      throw error;
    }
  }

  /**
   * Generate approval trends over time
   */
  async generateApprovalTrends(
    startDate: Date, 
    endDate: Date, 
    granularity: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<any[]> {
    console.log(`📈 Generating approval trends with ${granularity} granularity`);
    
    try {
      let dateFormat: string;
      switch (granularity) {
        case 'daily':
          dateFormat = 'YYYY-MM-DD';
          break;
        case 'weekly':
          dateFormat = 'YYYY-"W"WW';
          break;
        case 'monthly':
          dateFormat = 'YYYY-MM';
          break;
      }

      const trends = await db.select({
        period: sql`TO_CHAR(${approvalRecords.submittedAt}, ${dateFormat})`,
        totalApprovals: count(approvalRecords.id),
        automaticApprovals: count(sql`CASE WHEN ${approvalRecords.decisionMethod} = 'automatic' THEN 1 END`),
        manualApprovals: count(sql`CASE WHEN ${approvalRecords.decisionMethod} = 'manual' THEN 1 END`),
        escalatedApprovals: count(sql`CASE WHEN ${approvalRecords.approvalStatus} = 'escalated' THEN 1 END`),
        avgProcessingTime: avg(approvalRecords.processingTimeMinutes)
      })
      .from(approvalRecords)
      .where(
        and(
          gte(approvalRecords.submittedAt, startDate),
          lte(approvalRecords.submittedAt, endDate)
        )
      )
      .groupBy(sql`TO_CHAR(${approvalRecords.submittedAt}, ${dateFormat})`)
      .orderBy(sql`TO_CHAR(${approvalRecords.submittedAt}, ${dateFormat})`);

      console.log(`✅ Generated ${trends.length} trend data points`);
      return trends.map(trend => ({
        period: trend.period,
        totalApprovals: Number(trend.totalApprovals),
        automaticApprovals: Number(trend.automaticApprovals),
        manualApprovals: Number(trend.manualApprovals),
        escalatedApprovals: Number(trend.escalatedApprovals),
        avgProcessingTime: Number(trend.avgProcessingTime) || 0,
        automaticApprovalRate: Number(trend.totalApprovals) > 0 ? 
          (Number(trend.automaticApprovals) / Number(trend.totalApprovals)) * 100 : 0
      }));
    } catch (error) {
      console.error(`❌ Error generating approval trends:`, error);
      return [];
    }
  }

  /**
   * Generate approval bottleneck analysis
   */
  async identifyApprovalBottlenecks(startDate: Date, endDate: Date): Promise<any> {
    console.log(`🔍 Identifying approval bottlenecks from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    try {
      // Find escalations with long processing times
      const longRunningEscalations = await db.select({
        escalationLevel: escalationPaths.escalationLevel,
        avgTimeoutHours: avg(escalationPaths.timeoutHours),
        count: count(escalationPaths.id),
        timeoutRate: sql`COUNT(CASE WHEN ${escalationPaths.escalationStatus} = 'timeout' THEN 1 END) * 100.0 / COUNT(*)`,
      })
      .from(escalationPaths)
      .where(
        and(
          gte(escalationPaths.createdAt, startDate),
          lte(escalationPaths.createdAt, endDate)
        )
      )
      .groupBy(escalationPaths.escalationLevel)
      .having(sql`COUNT(*) > 5`); // Only include levels with significant volume

      // Find approvers with high workload
      const overloadedApprovers = await db.select({
        approverId: users.id,
        approverName: users.fullName,
        pendingCount: count(escalationPaths.id),
        avgResponseTime: avg(sql`EXTRACT(EPOCH FROM (${escalationPaths.updatedAt} - ${escalationPaths.createdAt})) / 3600`)
      })
      .from(users)
      .innerJoin(escalationPaths, sql`${users.id} = ANY(${escalationPaths.assignedApprovers})`)
      .where(
        and(
          eq(escalationPaths.escalationStatus, 'pending'),
          gte(escalationPaths.createdAt, startDate)
        )
      )
      .groupBy(users.id, users.fullName)
      .having(sql`COUNT(*) > 10`); // Approvers with more than 10 pending items

      // Find policy violations causing delays
      const policyViolationBottlenecks = await db.select({
        riskLevel: approvalRecords.riskLevel,
        avgProcessingTime: avg(approvalRecords.processingTimeMinutes),
        violationRate: sql`COUNT(CASE WHEN (${approvalRecords.policyCompliance}->>'isCompliant')::boolean = false THEN 1 END) * 100.0 / COUNT(*)`,
        count: count(approvalRecords.id)
      })
      .from(approvalRecords)
      .where(
        and(
          gte(approvalRecords.submittedAt, startDate),
          lte(approvalRecords.submittedAt, endDate)
        )
      )
      .groupBy(approvalRecords.riskLevel);

      const bottleneckAnalysis = {
        longRunningEscalations: longRunningEscalations.map(e => ({
          level: e.escalationLevel,
          avgTimeoutHours: Number(e.avgTimeoutHours) || 0,
          count: Number(e.count),
          timeoutRate: Number(e.timeoutRate) || 0
        })),
        overloadedApprovers: overloadedApprovers.map(a => ({
          approverId: a.approverId,
          approverName: a.approverName || 'Unknown',
          pendingCount: Number(a.pendingCount),
          avgResponseTime: Number(a.avgResponseTime) || 0
        })),
        policyViolationBottlenecks: policyViolationBottlenecks.map(p => ({
          riskLevel: p.riskLevel,
          avgProcessingTime: Number(p.avgProcessingTime) || 0,
          violationRate: Number(p.violationRate) || 0,
          count: Number(p.count)
        })),
        recommendations: this.generateBottleneckRecommendations(longRunningEscalations, overloadedApprovers, policyViolationBottlenecks)
      };

      console.log(`✅ Identified ${bottleneckAnalysis.longRunningEscalations.length} escalation bottlenecks, ${bottleneckAnalysis.overloadedApprovers.length} overloaded approvers`);
      return bottleneckAnalysis;
    } catch (error) {
      console.error(`❌ Error identifying approval bottlenecks:`, error);
      return {
        longRunningEscalations: [],
        overloadedApprovers: [],
        policyViolationBottlenecks: [],
        recommendations: []
      };
    }
  }

  /**
   * Generate recommendations based on bottleneck analysis
   */
  private generateBottleneckRecommendations(
    longRunningEscalations: any[],
    overloadedApprovers: any[],
    policyViolations: any[]
  ): string[] {
    const recommendations = [];

    if (longRunningEscalations.length > 0) {
      const worstLevel = longRunningEscalations.reduce((prev, current) => 
        (current.timeoutRate > prev.timeoutRate) ? current : prev
      );
      recommendations.push(
        `Consider reducing timeout periods for ${worstLevel.level} level escalations (current timeout rate: ${worstLevel.timeoutRate.toFixed(1)}%)`
      );
    }

    if (overloadedApprovers.length > 0) {
      recommendations.push(
        `${overloadedApprovers.length} approvers are overloaded. Consider redistributing workload or adding backup approvers.`
      );
    }

    if (policyViolations.some(p => p.violationRate > 20)) {
      recommendations.push(
        'High policy violation rates detected. Review and simplify approval policies or provide additional training.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('No significant bottlenecks detected. System is operating efficiently.');
    }

    return recommendations;
  }

  /**
   * Store analytics data for historical tracking
   */
  async storeApprovalAnalytics(metrics: ApprovalMetrics, periodStart: Date, periodEnd: Date): Promise<ApprovalAnalytics> {
    try {
      const analyticsData: InsertApprovalAnalytics = {
        periodStart,
        periodEnd,
        totalApprovals: metrics.totalApprovals,
        automaticApprovals: metrics.automaticApprovals,
        manualApprovals: metrics.manualApprovals,
        escalatedApprovals: metrics.escalatedApprovals,
        rejectedApprovals: metrics.rejectedApprovals,
        averageProcessingTimeHours: metrics.averageProcessingTime,
        approvalRate: metrics.approvalRate,
        escalationRate: metrics.escalationRate,
        policyComplianceRate: metrics.policyComplianceRate,
        departmentBreakdown: metrics.departmentBreakdown,
        riskLevelBreakdown: metrics.riskLevelBreakdown
      };

      const [stored] = await db.insert(approvalAnalytics).values(analyticsData).returning();
      console.log(`💾 Stored analytics data for period ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);
      return stored;
    } catch (error) {
      console.error(`❌ Error storing approval analytics:`, error);
      throw error;
    }
  }

  /**
   * Get historical analytics data
   */
  async getHistoricalAnalytics(startDate: Date, endDate: Date): Promise<ApprovalAnalytics[]> {
    try {
      return await db.select()
        .from(approvalAnalytics)
        .where(
          and(
            gte(approvalAnalytics.periodStart, startDate),
            lte(approvalAnalytics.periodEnd, endDate)
          )
        )
        .orderBy(desc(approvalAnalytics.periodStart));
    } catch (error) {
      console.error(`❌ Error getting historical analytics:`, error);
      return [];
    }
  }

  /**
   * Generate real-time approval dashboard data
   */
  async generateDashboardData(): Promise<any> {
    console.log(`📊 Generating real-time approval dashboard data`);
    
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Today's metrics
      const todayMetrics = await this.generateApprovalMetrics(today, now);
      
      // Yesterday's metrics for comparison
      const yesterdayMetrics = await this.generateApprovalMetrics(yesterday, today);
      
      // Weekly trends
      const weeklyTrends = await this.generateApprovalTrends(lastWeek, now, 'daily');
      
      // Current pending approvals count
      const pendingCount = await db.select({ count: count() })
        .from(approvalRecords)
        .where(eq(approvalRecords.approvalStatus, 'pending'));
      
      // Current escalations count
      const escalationsCount = await db.select({ count: count() })
        .from(escalationPaths)
        .where(eq(escalationPaths.escalationStatus, 'pending'));
      
      // Overdue approvals count
      const overdueCount = await db.select({ count: count() })
        .from(approvalRecords)
        .where(
          and(
            eq(approvalRecords.approvalStatus, 'pending'),
            lte(approvalRecords.expiryDate, now)
          )
        );

      const dashboardData = {
        summary: {
          todayApprovals: todayMetrics.totalApprovals,
          pendingApprovals: Number(pendingCount[0]?.count) || 0,
          activeEscalations: Number(escalationsCount[0]?.count) || 0,
          overdueApprovals: Number(overdueCount[0]?.count) || 0,
          automaticApprovalRate: todayMetrics.automaticApprovalRate,
          avgProcessingTime: todayMetrics.averageProcessingTime
        },
        trends: {
          daily: weeklyTrends,
          todayVsYesterday: {
            today: todayMetrics.totalApprovals,
            yesterday: yesterdayMetrics.totalApprovals,
            change: todayMetrics.totalApprovals - yesterdayMetrics.totalApprovals,
            changePercent: yesterdayMetrics.totalApprovals > 0 ? 
              ((todayMetrics.totalApprovals - yesterdayMetrics.totalApprovals) / yesterdayMetrics.totalApprovals) * 100 : 0
          }
        },
        performance: {
          approvalRate: todayMetrics.approvalRate,
          escalationRate: todayMetrics.escalationRate,
          policyComplianceRate: todayMetrics.policyComplianceRate,
          avgProcessingTime: todayMetrics.averageProcessingTime
        },
        breakdown: {
          byRiskLevel: todayMetrics.riskLevelBreakdown,
          byDepartment: todayMetrics.departmentBreakdown,
          topApprovers: Object.entries(todayMetrics.approverPerformance)
            .slice(0, 5)
            .map(([id, perf]) => ({ id, ...perf }))
        }
      };

      console.log(`✅ Generated dashboard data: ${dashboardData.summary.todayApprovals} today, ${dashboardData.summary.pendingApprovals} pending`);
      return dashboardData;
    } catch (error) {
      console.error(`❌ Error generating dashboard data:`, error);
      return {
        summary: { todayApprovals: 0, pendingApprovals: 0, activeEscalations: 0, overdueApprovals: 0, automaticApprovalRate: 0, avgProcessingTime: 0 },
        trends: { daily: [], todayVsYesterday: { today: 0, yesterday: 0, change: 0, changePercent: 0 } },
        performance: { approvalRate: 0, escalationRate: 0, policyComplianceRate: 0, avgProcessingTime: 0 },
        breakdown: { byRiskLevel: {}, byDepartment: {}, topApprovers: [] }
      };
    }
  }
}

// Export singleton instance
export const approvalAnalytics = new ApprovalAnalyticsService();