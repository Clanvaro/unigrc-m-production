/**
 * Risk Events Page Service
 * Servicio para el endpoint BFF /api/pages/risk-events
 * Usa read-model (risk_events_list_view) para consultas rápidas y predecibles
 */

import { db } from '../db';
import { sql, isNull } from 'drizzle-orm';
import { storage } from '../storage';
import { controls } from '@shared/schema';

interface RiskEventFilters {
  status?: string;
  severity?: string;
  eventType?: string;
  riskId?: string;
  controlId?: string;
  processId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Obtiene eventos desde el read-model (vista materializada)
 * 1 query simple, rápida y predecible
 */
export async function getRiskEventsFromReadModel(params: {
  limit: number;
  offset: number;
  filters: RiskEventFilters;
}): Promise<{
  events: any[];
  total: number;
}> {
  // Usar db global
  const { limit, offset, filters } = params;

  // NO filtrar por deleted_at (la columna puede no existir en la base de datos)
  const conditions: any[] = [];

  if (filters.status && filters.status !== 'all') {
    conditions.push(sql`status = ${filters.status}`);
  }

  if (filters.severity && filters.severity !== 'all') {
    conditions.push(sql`severity = ${filters.severity}`);
  }

  if (filters.eventType && filters.eventType !== 'all') {
    conditions.push(sql`event_type = ${filters.eventType}`);
  }

  if (filters.riskId && filters.riskId !== 'all') {
    conditions.push(sql`risk_id = ${filters.riskId}`);
  }

  if (filters.controlId && filters.controlId !== 'all') {
    conditions.push(sql`control_id = ${filters.controlId}`);
  }

  if (filters.search) {
    const searchPattern = `%${filters.search}%`;
    conditions.push(
      sql`(description ILIKE ${searchPattern} OR code ILIKE ${searchPattern})`
    );
  }

  if (filters.startDate) {
    conditions.push(sql`event_date >= ${filters.startDate}::timestamp`);
  }

  if (filters.endDate) {
    conditions.push(sql`event_date <= ${filters.endDate}::timestamp`);
  }

  const whereClause =
    conditions.length > 0
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``;

  // Query simple desde read-model
  // Si la vista no existe, fallback a tabla risk_events
  let eventsResult: any;
  let countResult: any;
  
  try {
    const queryStart = Date.now();
    [eventsResult, countResult] = await Promise.all([
      db.execute(sql`
        SELECT 
          id, code, event_date, event_type, status, severity,
          description, estimated_loss, actual_loss, risk_id, control_id,
          process_id, involved_persons, reported_by, investigated_by,
          resolution_notes, created_at,
          risk_code, risk_name, risk_category,
          control_code, control_name,
          macroproceso_ids, process_ids, subproceso_ids
        FROM risk_events_list_view
        ${whereClause}
        ORDER BY event_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `),
      db.execute(sql`
        SELECT COUNT(*)::int as total
        FROM risk_events_list_view
        ${whereClause}
      `),
    ]);
    
    const queryDuration = Date.now() - queryStart;
    if (queryDuration > 1000) {
      console.warn(`[PERF] Slow query in getRiskEventsFromReadModel: ${queryDuration}ms`);
    }
  } catch (error: any) {
    // Si la vista no existe, usar tabla risk_events directamente
    if (error?.message?.includes('does not exist') || error?.message?.includes('relation')) {
      console.warn('[WARN] risk_events_list_view does not exist, falling back to risk_events table');
      console.warn('[WARN] Run: npm run apply-risk-events-list-view to create the materialized view');
      
      // Fallback: usar tabla risk_events directamente
      // NO filtrar por deleted_at en fallback (la columna puede no existir)
      const fallbackConditions: any[] = [];
      
      if (filters.status && filters.status !== 'all') {
        fallbackConditions.push(sql`status = ${filters.status}`);
      }
      if (filters.severity && filters.severity !== 'all') {
        fallbackConditions.push(sql`severity = ${filters.severity}`);
      }
      if (filters.eventType && filters.eventType !== 'all') {
        fallbackConditions.push(sql`event_type = ${filters.eventType}`);
      }
      if (filters.riskId && filters.riskId !== 'all') {
        fallbackConditions.push(sql`risk_id = ${filters.riskId}`);
      }
      if (filters.controlId && filters.controlId !== 'all') {
        fallbackConditions.push(sql`control_id = ${filters.controlId}`);
      }
      if (filters.search) {
        const searchPattern = `%${filters.search}%`;
        fallbackConditions.push(
          sql`(description ILIKE ${searchPattern} OR code ILIKE ${searchPattern})`
        );
      }
      if (filters.startDate) {
        fallbackConditions.push(sql`event_date >= ${filters.startDate}::timestamp`);
      }
      if (filters.endDate) {
        fallbackConditions.push(sql`event_date <= ${filters.endDate}::timestamp`);
      }
      
      const fallbackWhereClause = fallbackConditions.length > 0
        ? sql`WHERE ${sql.join(fallbackConditions, sql` AND `)}`
        : sql``;
      
      [eventsResult, countResult] = await Promise.all([
        db.execute(sql`
          SELECT 
            id, code, event_date, event_type, status, severity,
            description, estimated_loss, actual_loss, risk_id, control_id,
            process_id, involved_persons, reported_by, investigated_by,
            resolution_notes, created_at,
            NULL as risk_code, NULL as risk_name, NULL as risk_category,
            NULL as control_code, NULL as control_name,
            ARRAY[]::text[] as macroproceso_ids, ARRAY[]::text[] as process_ids, ARRAY[]::text[] as subproceso_ids
          FROM risk_events
          ${fallbackWhereClause}
          ORDER BY event_date DESC
          LIMIT ${limit} OFFSET ${offset}
        `),
        db.execute(sql`
          SELECT COUNT(*)::int as total
          FROM risk_events
          ${fallbackWhereClause}
        `),
      ]);
    } else {
      throw error;
    }
  }

  return {
    events: eventsResult.rows as any[],
    total: (countResult.rows[0] as any)?.total || 0,
  };
}

/**
 * Obtiene counts básicos (1 query agregada)
 */
export async function getRiskEventCounts(
  filters: RiskEventFilters
): Promise<{
  total: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
}> {
  // Usar db global

  // NO filtrar por deleted_at (la columna puede no existir en la base de datos)
  const conditions: any[] = [];

  if (filters.search) {
    const searchPattern = `%${filters.search}%`;
    conditions.push(
      sql`(description ILIKE ${searchPattern} OR code ILIKE ${searchPattern})`
    );
  }

  if (filters.riskId && filters.riskId !== 'all') {
    conditions.push(sql`risk_id = ${filters.riskId}`);
  }

  if (filters.controlId && filters.controlId !== 'all') {
    conditions.push(sql`control_id = ${filters.controlId}`);
  }

  if (filters.startDate) {
    conditions.push(sql`event_date >= ${filters.startDate}::timestamp`);
  }

  if (filters.endDate) {
    conditions.push(sql`event_date <= ${filters.endDate}::timestamp`);
  }

  const whereClause =
    conditions.length > 0
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``;

  const result = await db.execute(sql`
    SELECT 
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status = 'abierto')::int as abierto,
      COUNT(*) FILTER (WHERE status = 'en_investigacion')::int as en_investigacion,
      COUNT(*) FILTER (WHERE status = 'cerrado')::int as cerrado,
      COUNT(*) FILTER (WHERE status = 'escalado')::int as escalado,
      COUNT(*) FILTER (WHERE severity = 'baja')::int as baja,
      COUNT(*) FILTER (WHERE severity = 'media')::int as media,
      COUNT(*) FILTER (WHERE severity = 'alta')::int as alta,
      COUNT(*) FILTER (WHERE severity = 'critica')::int as critica,
      COUNT(*) FILTER (WHERE event_type = 'materializado')::int as materializado,
      COUNT(*) FILTER (WHERE event_type = 'fraude')::int as fraude,
      COUNT(*) FILTER (WHERE event_type = 'delito')::int as delito
    FROM risk_events_list_view
    ${whereClause}
  `);

  const row = result.rows[0] as any;
  return {
    total: row.total || 0,
    byStatus: {
      abierto: row.abierto || 0,
      en_investigacion: row.en_investigacion || 0,
      cerrado: row.cerrado || 0,
      escalado: row.escalado || 0,
    },
    bySeverity: {
      baja: row.baja || 0,
      media: row.media || 0,
      alta: row.alta || 0,
      critica: row.critica || 0,
    },
    byType: {
      materializado: row.materializado || 0,
      fraude: row.fraude || 0,
      delito: row.delito || 0,
    },
  };
}

/**
 * Obtiene catálogos mínimos (solo IDs y nombres para filtros)
 */
export async function getMinimalCatalogsForEvents(): Promise<{
  risks: Array<{ id: string; code: string; name: string }>;
  controls: Array<{ id: string; code: string; name: string }>;
  macroprocesos: Array<{ id: string; code: string; name: string }>;
  processes: Array<{ id: string; code: string; name: string }>;
  subprocesos: Array<{ id: string; code: string; name: string }>;
}> {
  // Usar db global

  const [risks, controlsData, macroprocesos, processes, subprocesos] = await Promise.all([
    // Riesgos básicos
    storage.getRisksLite().then((risks) =>
      risks.map((r) => ({ id: r.id, code: r.code, name: r.name }))
    ),
    // Controles básicos (limitado a 1000 para no sobrecargar)
    db
      .select({
        id: controls.id,
        code: controls.code,
        name: controls.name,
      })
      .from(controls)
      .where(isNull(controls.deletedAt))
      .limit(1000),
    // Macroprocesos
    storage.getMacroprocesos().then((m) =>
      m
        .filter((m) => m.status !== 'deleted')
        .map((m) => ({ id: m.id, code: m.code, name: m.name }))
    ),
    // Procesos
    storage.getProcesses().then((p) =>
      p
        .filter((p) => p.status !== 'deleted')
        .map((p) => ({ id: p.id, code: p.code, name: p.name }))
    ),
    // Subprocesos
    storage.getSubprocesosWithOwners().then((s) =>
      s
        .filter((s) => !s.deletedAt)
        .map((s) => ({ id: s.id, code: s.code, name: s.name }))
    ),
  ]);

  return {
    risks,
    controls: controlsData as any[],
    macroprocesos,
    processes,
    subprocesos,
  };
}

