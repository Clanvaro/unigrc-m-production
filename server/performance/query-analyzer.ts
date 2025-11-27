/**
 * Query Analyzer - On-demand EXPLAIN ANALYZE for PostgreSQL queries
 * 
 * This module provides utilities for analyzing query performance.
 * It only runs when explicitly called - no impact on normal application performance.
 */

import { pool } from '../db';

export interface QueryPlan {
  query: string;
  planningTime: number;
  executionTime: number;
  totalTime: number;
  plan: any[];
  summary: string;
}

export interface QueryAnalysisResult {
  success: boolean;
  error?: string;
  result?: QueryPlan;
}

export async function analyzeQuery(
  sql: string,
  params: any[] = []
): Promise<QueryAnalysisResult> {
  if (!pool) {
    return {
      success: false,
      error: 'Database connection not available'
    };
  }

  try {
    const explainSql = `EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) ${sql}`;
    const result = await pool.query(explainSql, params);
    
    if (!result.rows || result.rows.length === 0) {
      return {
        success: false,
        error: 'No execution plan returned'
      };
    }

    const planData = result.rows[0]['QUERY PLAN'];
    const plan = planData[0];
    
    const planningTime = plan['Planning Time'] || 0;
    const executionTime = plan['Execution Time'] || 0;
    const totalTime = planningTime + executionTime;

    const summary = generatePlanSummary(plan);

    return {
      success: true,
      result: {
        query: sql,
        planningTime,
        executionTime,
        totalTime,
        plan: planData,
        summary
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error during query analysis'
    };
  }
}

function generatePlanSummary(plan: any): string {
  const parts: string[] = [];
  const planNode = plan['Plan'];
  
  if (!planNode) {
    return 'Unable to parse execution plan';
  }

  const nodeType = planNode['Node Type'];
  const totalCost = planNode['Total Cost'];
  const actualRows = planNode['Actual Rows'];
  const planRows = planNode['Plan Rows'];

  parts.push(`Node Type: ${nodeType}`);
  parts.push(`Estimated Cost: ${totalCost?.toFixed(2) || 'N/A'}`);
  parts.push(`Actual Rows: ${actualRows ?? 'N/A'}`);
  parts.push(`Estimated Rows: ${planRows ?? 'N/A'}`);

  if (planRows && actualRows && planRows > 0) {
    const accuracy = ((actualRows / planRows) * 100).toFixed(1);
    parts.push(`Row Estimate Accuracy: ${accuracy}%`);
  }

  if (planNode['Shared Hit Blocks'] !== undefined) {
    const hits = planNode['Shared Hit Blocks'];
    const reads = planNode['Shared Read Blocks'] || 0;
    const hitRatio = hits + reads > 0 ? ((hits / (hits + reads)) * 100).toFixed(1) : 'N/A';
    parts.push(`Buffer Cache Hit Ratio: ${hitRatio}%`);
  }

  return parts.join(' | ');
}

export const CRITICAL_QUERIES = {
  risksWithProcesses: {
    name: 'Risks with Processes',
    description: 'Fetches risks with their associated process information',
    sql: `
      SELECT r.id, r.name, r.inherent_risk, r.residual_risk, p.name as process_name
      FROM risks r
      LEFT JOIN processes p ON r.process_id = p.id
      WHERE r.deleted_at IS NULL AND r.tenant_id = $1
      ORDER BY r.inherent_risk DESC
      LIMIT 100
    `,
    params: (tenantId: string) => [tenantId]
  },
  
  controlsWithRisks: {
    name: 'Controls with Risk Count',
    description: 'Fetches controls with the count of associated risks',
    sql: `
      SELECT c.id, c.name, c.effectiveness, COUNT(rc.risk_id) as risk_count
      FROM controls c
      LEFT JOIN risk_controls rc ON c.id = rc.control_id
      WHERE c.deleted_at IS NULL AND c.tenant_id = $1
      GROUP BY c.id, c.name, c.effectiveness
      ORDER BY c.effectiveness DESC
      LIMIT 100
    `,
    params: (tenantId: string) => [tenantId]
  },
  
  auditFindings: {
    name: 'Audit Findings Summary',
    description: 'Fetches audit findings grouped by severity',
    sql: `
      SELECT af.severity, COUNT(*) as count
      FROM audit_findings af
      JOIN audits a ON af.audit_id = a.id
      WHERE a.deleted_at IS NULL AND a.tenant_id = $1
      GROUP BY af.severity
      ORDER BY count DESC
    `,
    params: (tenantId: string) => [tenantId]
  },
  
  riskProcessLinks: {
    name: 'Risk-Process Links',
    description: 'Checks risk_process_links table performance',
    sql: `
      SELECT rpl.risk_id, COUNT(DISTINCT rpl.process_id) as process_count
      FROM risk_process_links rpl
      JOIN risks r ON rpl.risk_id = r.id
      WHERE r.deleted_at IS NULL AND r.tenant_id = $1
      GROUP BY rpl.risk_id
      LIMIT 100
    `,
    params: (tenantId: string) => [tenantId]
  },
  
  actionPlansByStatus: {
    name: 'Action Plans by Status',
    description: 'Fetches action plans grouped by status with due dates',
    sql: `
      SELECT ap.status, COUNT(*) as count, 
             COUNT(CASE WHEN ap.due_date < NOW() THEN 1 END) as overdue_count
      FROM action_plans ap
      WHERE ap.deleted_at IS NULL AND ap.tenant_id = $1
      GROUP BY ap.status
    `,
    params: (tenantId: string) => [tenantId]
  },

  validationCenterItems: {
    name: 'Validation Center Items',
    description: 'Fetches validation center statistics',
    sql: `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
      FROM risks
      WHERE deleted_at IS NULL AND tenant_id = $1
    `,
    params: (tenantId: string) => [tenantId]
  }
};

export type CriticalQueryKey = keyof typeof CRITICAL_QUERIES;

export async function analyzeCriticalQuery(
  queryKey: CriticalQueryKey,
  tenantId: string
): Promise<QueryAnalysisResult> {
  const queryDef = CRITICAL_QUERIES[queryKey];
  if (!queryDef) {
    return {
      success: false,
      error: `Unknown query key: ${queryKey}`
    };
  }

  const params = queryDef.params(tenantId);
  return analyzeQuery(queryDef.sql, params);
}

export async function analyzeAllCriticalQueries(
  tenantId: string
): Promise<Record<CriticalQueryKey, QueryAnalysisResult>> {
  const results: Record<string, QueryAnalysisResult> = {};
  
  for (const key of Object.keys(CRITICAL_QUERIES) as CriticalQueryKey[]) {
    results[key] = await analyzeCriticalQuery(key, tenantId);
  }
  
  return results as Record<CriticalQueryKey, QueryAnalysisResult>;
}

export async function getTableStatistics(tableName: string): Promise<any> {
  if (!pool) {
    return { error: 'Database connection not available' };
  }

  const allowedTables = [
    'risks', 'controls', 'processes', 'audits', 'audit_findings',
    'action_plans', 'risk_events', 'risk_controls', 'risk_process_links',
    'gerencias', 'subgerencias', 'macroprocesos', 'subprocesos'
  ];

  if (!allowedTables.includes(tableName)) {
    return { error: `Table ${tableName} is not allowed for analysis` };
  }

  try {
    const statsResult = await pool.query(`
      SELECT 
        relname as table_name,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      WHERE relname = $1
    `, [tableName]);

    const sizeResult = await pool.query(`
      SELECT 
        pg_size_pretty(pg_total_relation_size($1)) as total_size,
        pg_size_pretty(pg_table_size($1)) as table_size,
        pg_size_pretty(pg_indexes_size($1)) as index_size
    `, [tableName]);

    return {
      statistics: statsResult.rows[0] || null,
      size: sizeResult.rows[0] || null
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getIndexUsage(tableName: string): Promise<any> {
  if (!pool) {
    return { error: 'Database connection not available' };
  }

  try {
    const result = await pool.query(`
      SELECT 
        indexrelname as index_name,
        idx_scan as scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes
      WHERE relname = $1
      ORDER BY idx_scan DESC
    `, [tableName]);

    return { indexes: result.rows };
  } catch (error: any) {
    return { error: error.message };
  }
}
