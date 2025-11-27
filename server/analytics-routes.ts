import express from 'express';
import { AnalyticsService } from './analytics-service';
import { ExportService } from './export-service';
import { storage } from './storage';
import { 
  type AuditorPerformanceFilters, 
  type RiskTrendingFilters,
  type TeamPerformanceFilters, 
  type WorkflowEfficiencyFilters,
  type ReportParameters,
  type ReportType
} from '@shared/schema';
import { z } from 'zod';

const router = express.Router();
const analyticsService = new AnalyticsService(storage);
const exportService = new ExportService();

// Validation schemas
const DateRangeSchema = z.object({
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str))
});

const AuditorPerformanceFiltersSchema = DateRangeSchema.extend({
  auditorIds: z.array(z.string()).optional(),
  departmentNames: z.array(z.string()).optional(),
  testTypes: z.array(z.string()).optional(),
  riskLevels: z.array(z.string()).optional()
});

const RiskTrendingFiltersSchema = DateRangeSchema.extend({
  riskIds: z.array(z.string()).optional(),
  processIds: z.array(z.string()).optional(),
  macroprocesoIds: z.array(z.string()).optional(),
  riskCategories: z.array(z.string()).optional(),
  riskLevels: z.array(z.enum(['low', 'medium', 'high', 'critical'])).optional()
});

const ReportParametersSchema = z.object({
  reportType: z.enum(['auditor_performance', 'team_comparison', 'risk_trending', 'workflow_efficiency', 'executive_summary', 'compliance_report', 'custom_report']),
  format: z.enum(['pdf', 'excel', 'csv', 'json']),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  filters: z.record(z.any()),
  includeCharts: z.boolean().optional(),
  includeRawData: z.boolean().optional(),
  groupBy: z.array(z.string()).optional(),
  sortBy: z.array(z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc'])
  })).optional()
});

// ============= AUDITOR PERFORMANCE ANALYTICS =============

router.get('/auditor-performance/summary', async (req, res) => {
  try {
    const filters = AuditorPerformanceFiltersSchema.parse(req.query);
    const summary = await analyticsService.getAuditorPerformanceSummary(filters);
    res.json(summary);
  } catch (error) {
    console.error('Error getting auditor performance summary:', error);
    res.status(500).json({ error: 'Failed to get auditor performance summary' });
  }
});

router.get('/auditor-performance/:auditorId', async (req, res) => {
  try {
    const { auditorId } = req.params;
    const { startDate, endDate } = DateRangeSchema.parse(req.query);
    
    const metrics = await analyticsService.calculateAuditorPerformanceMetrics(
      auditorId, 
      startDate, 
      endDate
    );
    
    res.json(metrics);
  } catch (error) {
    console.error('Error getting auditor performance:', error);
    res.status(500).json({ error: 'Failed to get auditor performance metrics' });
  }
});

router.get('/auditor-performance/comparison', async (req, res) => {
  try {
    const { auditorIds, startDate, endDate } = req.query;
    
    if (!auditorIds || !Array.isArray(auditorIds)) {
      return res.status(400).json({ error: 'auditorIds array is required' });
    }
    
    const dateRange = DateRangeSchema.parse({ startDate, endDate });
    
    const comparison = await analyticsService.getAuditorPerformanceComparison(
      auditorIds as string[], 
      dateRange.startDate, 
      dateRange.endDate
    );
    
    res.json(comparison);
  } catch (error) {
    console.error('Error getting auditor comparison:', error);
    res.status(500).json({ error: 'Failed to get auditor performance comparison' });
  }
});

router.get('/auditor-performance/:auditorId/trends', async (req, res) => {
  try {
    const { auditorId } = req.params;
    const { months = 12 } = req.query;
    
    const trends = await storage.getAuditorPerformanceTrends(auditorId, Number(months));
    res.json(trends);
  } catch (error) {
    console.error('Error getting auditor trends:', error);
    res.status(500).json({ error: 'Failed to get auditor performance trends' });
  }
});

// ============= RISK TRENDING ANALYTICS =============

router.get('/risk-trending/summary', async (req, res) => {
  try {
    const filters = RiskTrendingFiltersSchema.parse(req.query);
    const summary = await analyticsService.getRiskTrendingSummary(filters);
    res.json(summary);
  } catch (error) {
    console.error('Error getting risk trending summary:', error);
    res.status(500).json({ error: 'Failed to get risk trending summary' });
  }
});

router.get('/risk-trending/:riskId', async (req, res) => {
  try {
    const { riskId } = req.params;
    const { startDate, endDate } = DateRangeSchema.parse(req.query);
    
    const trending = await analyticsService.calculateRiskTrendingData(
      riskId, 
      startDate, 
      endDate
    );
    
    res.json(trending);
  } catch (error) {
    console.error('Error getting risk trending:', error);
    res.status(500).json({ error: 'Failed to get risk trending data' });
  }
});

router.get('/risk-trending/heatmap', async (req, res) => {
  try {
    const { organizationLevel = 'process' } = req.query;
    
    if (!['process', 'department', 'organization'].includes(organizationLevel as string)) {
      return res.status(400).json({ error: 'Invalid organization level' });
    }
    
    const heatMapData = await analyticsService.getRiskHeatMapData(
      organizationLevel as 'process' | 'department' | 'organization'
    );
    
    res.json(heatMapData);
  } catch (error) {
    console.error('Error getting risk heatmap:', error);
    res.status(500).json({ error: 'Failed to get risk heatmap data' });
  }
});

router.get('/risk-trending/:riskId/trends', async (req, res) => {
  try {
    const { riskId } = req.params;
    const { months = 12 } = req.query;
    
    const trends = await storage.getRiskTrends([riskId], Number(months));
    res.json(trends);
  } catch (error) {
    console.error('Error getting risk trends:', error);
    res.status(500).json({ error: 'Failed to get risk trends' });
  }
});

// ============= TEAM PERFORMANCE ANALYTICS =============

router.get('/team-performance/summary', async (req, res) => {
  try {
    const filters = DateRangeSchema.extend({
      departmentNames: z.array(z.string()).optional(),
      teamIds: z.array(z.string()).optional(),
      includedMetrics: z.array(z.enum(['completion', 'quality', 'productivity', 'onTime'])).optional()
    }).parse(req.query);
    
    const summary = await analyticsService.getTeamPerformanceSummary(filters);
    res.json(summary);
  } catch (error) {
    console.error('Error getting team performance summary:', error);
    res.status(500).json({ error: 'Failed to get team performance summary' });
  }
});

router.get('/team-performance/:departmentName', async (req, res) => {
  try {
    const { departmentName } = req.params;
    const { startDate, endDate } = DateRangeSchema.parse(req.query);
    
    const metrics = await analyticsService.calculateTeamPerformanceMetrics(
      departmentName, 
      startDate, 
      endDate
    );
    
    res.json(metrics);
  } catch (error) {
    console.error('Error getting team performance:', error);
    res.status(500).json({ error: 'Failed to get team performance metrics' });
  }
});

router.get('/team-performance/comparison', async (req, res) => {
  try {
    const { departmentNames, startDate, endDate } = req.query;
    
    if (!departmentNames || !Array.isArray(departmentNames)) {
      return res.status(400).json({ error: 'departmentNames array is required' });
    }
    
    const dateRange = DateRangeSchema.parse({ startDate, endDate });
    
    const comparison = await storage.getTeamPerformanceComparison(
      departmentNames as string[], 
      dateRange.startDate, 
      dateRange.endDate
    );
    
    res.json(comparison);
  } catch (error) {
    console.error('Error getting team comparison:', error);
    res.status(500).json({ error: 'Failed to get team performance comparison' });
  }
});

// ============= WORKFLOW EFFICIENCY ANALYTICS =============

router.get('/workflow-efficiency/summary', async (req, res) => {
  try {
    const filters = DateRangeSchema.extend({
      testTypes: z.array(z.string()).optional(),
      priorityLevels: z.array(z.string()).optional(),
      includedStages: z.array(z.enum(['assignment', 'execution', 'review', 'approval'])).optional()
    }).parse(req.query);
    
    const summary = await analyticsService.getWorkflowEfficiencySummary(filters);
    res.json(summary);
  } catch (error) {
    console.error('Error getting workflow efficiency summary:', error);
    res.status(500).json({ error: 'Failed to get workflow efficiency summary' });
  }
});

router.get('/workflow-efficiency/metrics', async (req, res) => {
  try {
    const { startDate, endDate } = DateRangeSchema.parse(req.query);
    
    const metrics = await analyticsService.calculateWorkflowEfficiencyMetrics(
      startDate, 
      endDate
    );
    
    res.json(metrics);
  } catch (error) {
    console.error('Error getting workflow efficiency metrics:', error);
    res.status(500).json({ error: 'Failed to get workflow efficiency metrics' });
  }
});

router.get('/workflow-efficiency/trends', async (req, res) => {
  try {
    const { months = 12 } = req.query;
    
    const trends = await storage.getWorkflowEfficiencyTrends(Number(months));
    res.json(trends);
  } catch (error) {
    console.error('Error getting workflow efficiency trends:', error);
    res.status(500).json({ error: 'Failed to get workflow efficiency trends' });
  }
});

// ============= CHART DATA GENERATION =============

router.get('/chart-data/time-series', async (req, res) => {
  try {
    const { type, ...filters } = req.query;
    
    if (!['auditor_performance', 'risk_trending', 'workflow_efficiency'].includes(type as string)) {
      return res.status(400).json({ error: 'Invalid chart type' });
    }
    
    const data = await analyticsService.generateTimeSeriesData(
      type as 'auditor_performance' | 'risk_trending' | 'workflow_efficiency',
      filters
    );
    
    res.json(data);
  } catch (error) {
    console.error('Error generating time series data:', error);
    res.status(500).json({ error: 'Failed to generate time series data' });
  }
});

router.get('/chart-data/comparison', async (req, res) => {
  try {
    const { type, ...filters } = req.query;
    
    if (!['auditor', 'team', 'risk'].includes(type as string)) {
      return res.status(400).json({ error: 'Invalid comparison type' });
    }
    
    const data = await analyticsService.generateComparisonData(
      type as 'auditor' | 'team' | 'risk',
      filters
    );
    
    res.json(data);
  } catch (error) {
    console.error('Error generating comparison data:', error);
    res.status(500).json({ error: 'Failed to generate comparison data' });
  }
});

router.get('/chart-data/heatmap', async (req, res) => {
  try {
    const { type, ...filters } = req.query;
    
    if (!['risk_coverage', 'team_performance', 'process_efficiency'].includes(type as string)) {
      return res.status(400).json({ error: 'Invalid heatmap type' });
    }
    
    const data = await storage.generateHeatMapData(
      type as 'risk_coverage' | 'team_performance' | 'process_efficiency',
      filters
    );
    
    res.json(data);
  } catch (error) {
    console.error('Error generating heatmap data:', error);
    res.status(500).json({ error: 'Failed to generate heatmap data' });
  }
});

// ============= REPORT GENERATION =============

router.post('/reports/generate', async (req, res) => {
  try {
    const parameters = ReportParametersSchema.parse(req.body);
    
    // Generate report data based on type
    const reportData = await storage.generateReportData(parameters.reportType, parameters);
    
    // Create report generation log
    const reportLog = await storage.createReportGenerationLog({
      reportType: parameters.reportType,
      reportFormat: parameters.format,
      parametersUsed: JSON.stringify(parameters),
      status: 'processing',
      requestedBy: 'current-user' // TODO: Get from authentication
    });

    // Generate the report file
    let fileBuffer: Buffer;
    let filename: string;
    let mimeType: string;

    if (parameters.format === 'pdf') {
      fileBuffer = await exportService.generatePDFReport(
        parameters.reportType,
        parameters,
        reportData
      );
      filename = `${parameters.reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
      mimeType = 'application/pdf';
    } else if (parameters.format === 'excel') {
      fileBuffer = await exportService.generateExcelReport(
        parameters.reportType,
        parameters,
        reportData
      );
      filename = `${parameters.reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      return res.status(400).json({ error: 'Unsupported format' });
    }

    // Update report log
    await storage.updateReportGenerationLog(reportLog.id, {
      status: 'completed',
      fileSize: fileBuffer.length
    });

    // Send the file
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    res.send(fileBuffer);

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

router.get('/reports/logs', async (req, res) => {
  try {
    const { userId, status } = req.query;
    
    const logs = await storage.getReportGenerationLogs(
      userId as string, 
      status as string
    );
    
    res.json(logs);
  } catch (error) {
    console.error('Error getting report logs:', error);
    res.status(500).json({ error: 'Failed to get report logs' });
  }
});

router.get('/reports/logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const log = await storage.getReportGenerationLog(id);
    
    if (!log) {
      return res.status(404).json({ error: 'Report log not found' });
    }
    
    res.json(log);
  } catch (error) {
    console.error('Error getting report log:', error);
    res.status(500).json({ error: 'Failed to get report log' });
  }
});

// ============= DATA AGGREGATION =============

router.post('/aggregation/auditor-metrics', async (req, res) => {
  try {
    const { startDate, endDate } = DateRangeSchema.parse(req.body);
    
    await analyticsService.aggregateAuditorMetrics(startDate, endDate);
    
    res.json({ message: 'Auditor metrics aggregation completed' });
  } catch (error) {
    console.error('Error aggregating auditor metrics:', error);
    res.status(500).json({ error: 'Failed to aggregate auditor metrics' });
  }
});

router.post('/aggregation/risk-trends', async (req, res) => {
  try {
    const { startDate, endDate } = DateRangeSchema.parse(req.body);
    
    await analyticsService.aggregateRiskTrends(startDate, endDate);
    
    res.json({ message: 'Risk trends aggregation completed' });
  } catch (error) {
    console.error('Error aggregating risk trends:', error);
    res.status(500).json({ error: 'Failed to aggregate risk trends' });
  }
});

router.post('/aggregation/team-performance', async (req, res) => {
  try {
    const { startDate, endDate } = DateRangeSchema.parse(req.body);
    
    await analyticsService.aggregateTeamPerformance(startDate, endDate);
    
    res.json({ message: 'Team performance aggregation completed' });
  } catch (error) {
    console.error('Error aggregating team performance:', error);
    res.status(500).json({ error: 'Failed to aggregate team performance' });
  }
});

router.post('/aggregation/workflow-metrics', async (req, res) => {
  try {
    const { startDate, endDate } = DateRangeSchema.parse(req.body);
    
    await analyticsService.aggregateWorkflowMetrics(startDate, endDate);
    
    res.json({ message: 'Workflow metrics aggregation completed' });
  } catch (error) {
    console.error('Error aggregating workflow metrics:', error);
    res.status(500).json({ error: 'Failed to aggregate workflow metrics' });
  }
});

// ============= CACHE MANAGEMENT =============

router.post('/cache/refresh', async (req, res) => {
  try {
    const { type } = req.body;
    
    await storage.refreshAnalyticsCache(type);
    
    res.json({ message: 'Analytics cache refreshed successfully' });
  } catch (error) {
    console.error('Error refreshing analytics cache:', error);
    res.status(500).json({ error: 'Failed to refresh analytics cache' });
  }
});

router.get('/cache/status', async (req, res) => {
  try {
    const { type } = req.query;
    
    const lastUpdate = await storage.getLastAnalyticsUpdate(
      type as 'auditor' | 'risk' | 'team' | 'workflow'
    );
    
    res.json({ lastUpdate });
  } catch (error) {
    console.error('Error getting cache status:', error);
    res.status(500).json({ error: 'Failed to get cache status' });
  }
});

// ============= HEALTH CHECK =============

router.get('/health', async (req, res) => {
  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        analytics: 'operational',
        export: 'operational',
        database: 'operational'
      }
    };
    
    res.json(health);
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;