/**
 * Risks Page Service
 * Servicio para el endpoint BFF /api/pages/risks
 * Usa read-model (risk_list_view) para consultas rápidas y predecibles
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { storage } from '../storage';

interface RiskFilters {
  status?: string;
  gerenciaId?: string;
  macroprocesoId?: string;
  processId?: string;
  subprocesoId?: string;
  search?: string;
  inherentRiskLevel?: string;
  residualRiskLevel?: string;
  ownerId?: string;
}

/**
 * Obtiene riesgos desde el read-model (vista materializada)
 * 1 query simple, rápida y predecible
 */
export async function getRisksFromReadModel(params: {
  limit: number;
  offset: number;
  filters: RiskFilters;
}): Promise<{
  risks: any[];
  total: number;
}> {
  // Usar db global
  const { limit, offset, filters } = params;

  // Construir condiciones WHERE
  const conditions: any[] = [sql`status <> 'deleted'`];

  if (filters.status && filters.status !== 'all') {
    conditions.push(sql`status = ${filters.status}`);
  }

  if (filters.search) {
    const searchPattern = `%${filters.search}%`;
    conditions.push(
      sql`(name ILIKE ${searchPattern} OR code ILIKE ${searchPattern} OR description ILIKE ${searchPattern})`
    );
  }

  if (filters.macroprocesoId && filters.macroprocesoId !== 'all') {
    conditions.push(sql`macroproceso_id = ${filters.macroprocesoId}`);
  }

  if (filters.processId && filters.processId !== 'all') {
    conditions.push(sql`process_id = ${filters.processId}`);
  }

  if (filters.subprocesoId && filters.subprocesoId !== 'all') {
    conditions.push(sql`subproceso_id = ${filters.subprocesoId}`);
  }

  // Filtros de nivel de riesgo (basados en rangos típicos)
  if (filters.inherentRiskLevel && filters.inherentRiskLevel !== 'all') {
    switch (filters.inherentRiskLevel) {
      case 'low':
        conditions.push(sql`inherent_risk < 9`);
        break;
      case 'medium':
        conditions.push(sql`inherent_risk >= 9 AND inherent_risk < 16`);
        break;
      case 'high':
        conditions.push(sql`inherent_risk >= 16 AND inherent_risk < 20`);
        break;
      case 'critical':
        conditions.push(sql`inherent_risk >= 20`);
        break;
    }
  }

  if (filters.residualRiskLevel && filters.residualRiskLevel !== 'all') {
    switch (filters.residualRiskLevel) {
      case 'low':
        conditions.push(sql`residual_risk_approx < 9`);
        break;
      case 'medium':
        conditions.push(sql`residual_risk_approx >= 9 AND residual_risk_approx < 16`);
        break;
      case 'high':
        conditions.push(sql`residual_risk_approx >= 16 AND residual_risk_approx < 20`);
        break;
      case 'critical':
        conditions.push(sql`residual_risk_approx >= 20`);
        break;
    }
  }

  const whereClause =
    conditions.length > 0
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``;

  // Query simple desde read-model (sin JOINs complejos)
  const queryStart = Date.now();
  const [risksResult, countResult] = await Promise.all([
    db.execute(sql`
      SELECT 
        id, code, name, description, status, probability, impact, inherent_risk,
        residual_risk_approx as residual_risk, category, macroproceso_id, process_id, subproceso_id,
        macroproceso_name, macroproceso_code, process_name, process_code,
        subproceso_name, subproceso_code,
        control_count, avg_effectiveness, process_count, action_plan_count,
        validation_status, created_at
      FROM risk_list_view
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `),
    db.execute(sql`
      SELECT COUNT(*)::int as total
      FROM risk_list_view
      ${whereClause}
    `),
  ]);
  
  const queryDuration = Date.now() - queryStart;
  if (queryDuration > 1000) {
    console.warn(`[PERF] Slow query in getRisksFromReadModel: ${queryDuration}ms (limit: ${limit}, offset: ${offset}, filters: ${Object.keys(filters).length})`);
  }

  // Normalize category field to always be a string array
  // PostgreSQL text[] can come as string '{val1,val2}' or array depending on driver
  const normalizedRisks = (risksResult.rows as any[]).map(risk => ({
    ...risk,
    category: normalizeCategory(risk.category),
  }));

  return {
    risks: normalizedRisks,
    total: (countResult.rows[0] as any)?.total || 0,
  };
}

/**
 * Normaliza el campo category a un array de strings
 * PostgreSQL text[] puede venir como:
 * - Array JavaScript: ['val1', 'val2']
 * - String PostgreSQL: '{val1,val2}' o '{}'
 * - null/undefined
 */
function normalizeCategory(category: any): string[] {
  if (!category) return [];
  if (Array.isArray(category)) return category.filter(c => typeof c === 'string' && c.trim());
  if (typeof category === 'string') {
    // Parse PostgreSQL array format: '{val1,val2}' or '{}'
    if (category.startsWith('{') && category.endsWith('}')) {
      const inner = category.slice(1, -1);
      if (!inner) return [];
      return inner.split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
    }
    // Single value string
    return category.trim() ? [category.trim()] : [];
  }
  return [];
}

/**
 * Obtiene counts básicos (1 query agregada)
 */
export async function getRiskCounts(
  filters: RiskFilters
): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byLevel: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}> {
  // Usar db global

  // Construir condiciones (mismas que getRisksFromReadModel)
  const conditions: any[] = [sql`status <> 'deleted'`];

  if (filters.search) {
    const searchPattern = `%${filters.search}%`;
    conditions.push(
      sql`(name ILIKE ${searchPattern} OR code ILIKE ${searchPattern})`
    );
  }

  if (filters.macroprocesoId && filters.macroprocesoId !== 'all') {
    conditions.push(sql`macroproceso_id = ${filters.macroprocesoId}`);
  }

  if (filters.processId && filters.processId !== 'all') {
    conditions.push(sql`process_id = ${filters.processId}`);
  }

  if (filters.subprocesoId && filters.subprocesoId !== 'all') {
    conditions.push(sql`subproceso_id = ${filters.subprocesoId}`);
  }

  const whereClause =
    conditions.length > 0
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``;

  const result = await db.execute(sql`
    SELECT 
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status = 'active')::int as active,
      COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
      COUNT(*) FILTER (WHERE status = 'inactive')::int as inactive,
      COUNT(*) FILTER (WHERE inherent_risk >= 20)::int as critical,
      COUNT(*) FILTER (WHERE inherent_risk >= 16 AND inherent_risk < 20)::int as high,
      COUNT(*) FILTER (WHERE inherent_risk >= 9 AND inherent_risk < 16)::int as medium,
      COUNT(*) FILTER (WHERE inherent_risk < 9)::int as low
    FROM risk_list_view
    ${whereClause}
  `);

  const row = result.rows[0] as any;
  return {
    total: row.total || 0,
    byStatus: {
      active: row.active || 0,
      pending: row.pending || 0,
      inactive: row.inactive || 0,
    },
    byLevel: {
      critical: row.critical || 0,
      high: row.high || 0,
      medium: row.medium || 0,
      low: row.low || 0,
    },
  };
}

/**
 * Obtiene catálogos mínimos (solo IDs y nombres para filtros)
 */
export async function getMinimalCatalogs(): Promise<{
  gerencias: Array<{ id: string; name: string; code: string }>;
  macroprocesos: Array<{ id: string; name: string; code: string; gerenciaId?: string }>;
  processes: Array<{ id: string; name: string; code: string; macroprocesoId?: string }>;
  subprocesos: Array<{ id: string; name: string; code: string; processId?: string }>;
  riskCategories: Array<{ id: string; name: string; color: string }>;
  processOwners: Array<{ id: string; name: string; position?: string }>;
  processGerencias: Array<{ processId: string; gerenciaId: string }>;
}> {
  const [
    gerencias,
    macroprocesos,
    processes,
    subprocesos,
    riskCategories,
    processOwners,
    processGerenciasRelations,
  ] = await Promise.all([
    storage.getGerencias(),
    storage.getMacroprocesos(),
    storage.getProcesses(),
    storage.getSubprocesosWithOwners(),
    storage.getRiskCategories(),
    storage.getProcessOwners(),
    storage.getAllProcessGerenciasRelations(),
  ]);

  return {
    gerencias: gerencias
      .filter((g: any) => g.status !== 'deleted')
      .map((g: any) => ({ id: g.id, name: g.name, code: g.code })),
    macroprocesos: macroprocesos
      .filter((m: any) => m.status !== 'deleted')
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        code: m.code,
        gerenciaId: m.gerenciaId,
      })),
    processes: processes
      .filter((p: any) => p.status !== 'deleted')
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        macroprocesoId: p.macroprocesoId,
      })),
    subprocesos: subprocesos
      .filter((s: any) => !s.deletedAt)
      .map((s: any) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        processId: s.procesoId,
      })),
    riskCategories: riskCategories
      .filter((c: any) => c.isActive)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        color: c.color || '#6b7280',
      })),
    processOwners: processOwners.map((po: any) => ({
      id: po.id,
      name: po.name,
      position: po.position,
    })),
    processGerencias: processGerenciasRelations.map((pg: any) => ({
      processId: pg.processId,
      gerenciaId: pg.gerenciaId,
    })),
  };
}

/**
 * Obtiene relaciones lite (solo totales, no detalles completos)
 * OPTIMIZADO: Solo procesa los riesgos de la página actual (limit/offset)
 * Devuelve Record en lugar de Map para serialización JSON
 */
export async function getRelationsLite(
  filters: RiskFilters,
  limit: number,
  offset: number
): Promise<{
  controlsByRisk: Record<string, { count: number; avgEffectiveness: number }>;
  processesByRisk: Record<string, string[]>; // Array de process IDs
  actionPlansByRisk: Record<string, number>;
}> {
  // Usar db global

  // CRITICAL OPTIMIZATION: Solo obtener IDs de la página actual (limit/offset)
  // Esto evita procesar miles de riesgos cuando solo necesitamos 25-50
  const baseConditions: any[] = [sql`status <> 'deleted'`];

  if (filters.search) {
    const searchPattern = `%${filters.search}%`;
    baseConditions.push(
      sql`(name ILIKE ${searchPattern} OR code ILIKE ${searchPattern} OR description ILIKE ${searchPattern})`
    );
  }

  if (filters.status && filters.status !== 'all') {
    baseConditions.push(sql`status = ${filters.status}`);
  }

  if (filters.macroprocesoId && filters.macroprocesoId !== 'all') {
    baseConditions.push(sql`macroproceso_id = ${filters.macroprocesoId}`);
  }

  if (filters.processId && filters.processId !== 'all') {
    baseConditions.push(sql`process_id = ${filters.processId}`);
  }

  if (filters.subprocesoId && filters.subprocesoId !== 'all') {
    baseConditions.push(sql`subproceso_id = ${filters.subprocesoId}`);
  }

  // Filtros de nivel de riesgo (mismos que getRisksFromReadModel)
  if (filters.inherentRiskLevel && filters.inherentRiskLevel !== 'all') {
    switch (filters.inherentRiskLevel) {
      case 'low':
        baseConditions.push(sql`inherent_risk < 9`);
        break;
      case 'medium':
        baseConditions.push(sql`inherent_risk >= 9 AND inherent_risk < 16`);
        break;
      case 'high':
        baseConditions.push(sql`inherent_risk >= 16 AND inherent_risk < 20`);
        break;
      case 'critical':
        baseConditions.push(sql`inherent_risk >= 20`);
        break;
    }
  }

  if (filters.residualRiskLevel && filters.residualRiskLevel !== 'all') {
    switch (filters.residualRiskLevel) {
      case 'low':
        baseConditions.push(sql`residual_risk_approx < 9`);
        break;
      case 'medium':
        baseConditions.push(sql`residual_risk_approx >= 9 AND residual_risk_approx < 16`);
        break;
      case 'high':
        baseConditions.push(sql`residual_risk_approx >= 16 AND residual_risk_approx < 20`);
        break;
      case 'critical':
        baseConditions.push(sql`residual_risk_approx >= 20`);
        break;
    }
  }

  const baseWhereClause =
    baseConditions.length > 0
      ? sql`WHERE ${sql.join(baseConditions, sql` AND `)}`
      : sql``;

  // CRITICAL: Solo obtener IDs de la página actual (mismo orden que getRisksFromReadModel)
  const queryStart = Date.now();
  const riskIdsResult = await db.execute(sql`
    SELECT id FROM risk_list_view
    ${baseWhereClause}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);
  const riskIds = (riskIdsResult.rows as any[]).map((r) => r.id);
  
  const queryDuration = Date.now() - queryStart;
  if (queryDuration > 500) {
    console.warn(`[PERF] Slow query in getRelationsLite (risk IDs): ${queryDuration}ms (limit: ${limit}, offset: ${offset})`);
  }

  if (riskIds.length === 0) {
    return {
      controlsByRisk: {},
      processesByRisk: {},
      actionPlansByRisk: {},
    };
  }

  const riskIdsSql = sql.join(riskIds.map((id) => sql`${id}`), sql`, `);

  // Queries agregadas en paralelo
  const [controlsResult, processesResult, actionsResult] = await Promise.all([
    // Controls por riesgo
    db.execute(sql`
      SELECT 
        rc.risk_id,
        COUNT(rc.id)::int as count,
        COALESCE(AVG(c.effectiveness), 0)::float as avg_effectiveness
      FROM risk_controls rc
      INNER JOIN controls c ON rc.control_id = c.id
      WHERE rc.risk_id IN (${riskIdsSql}) 
        AND c.deleted_at IS NULL
      GROUP BY rc.risk_id
    `),

    // Process IDs por riesgo (desde risk_process_links)
    db.execute(sql`
      SELECT 
        risk_id,
        ARRAY_AGG(DISTINCT process_id) FILTER (WHERE process_id IS NOT NULL) as process_ids
      FROM risk_process_links
      WHERE risk_id IN (${riskIdsSql})
      GROUP BY risk_id
    `),

    // Action plans count por riesgo
    db.execute(sql`
      SELECT 
        risk_id,
        COUNT(*)::int as count
      FROM actions
      WHERE risk_id IN (${riskIdsSql})
        AND origin = 'risk'
        AND deleted_at IS NULL
      GROUP BY risk_id
    `),
  ]);

  // Convertir a Record (serializable en JSON)
  const controlsByRisk: Record<string, { count: number; avgEffectiveness: number }> =
    {};
  for (const row of controlsResult.rows as any[]) {
    controlsByRisk[row.risk_id] = {
      count: row.count || 0,
      avgEffectiveness: row.avg_effectiveness || 0,
    };
  }

  const processesByRisk: Record<string, string[]> = {};
  for (const row of processesResult.rows as any[]) {
    processesByRisk[row.risk_id] = row.process_ids || [];
  }

  const actionPlansByRisk: Record<string, number> = {};
  for (const row of actionsResult.rows as any[]) {
    actionPlansByRisk[row.risk_id] = row.count || 0;
  }

  return {
    controlsByRisk,
    processesByRisk,
    actionPlansByRisk,
  };
}

