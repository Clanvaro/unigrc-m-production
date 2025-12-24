/**
 * Risk Events Page Service
 * Servicio para el endpoint BFF /api/pages/risk-events
 * Usa read-model (risk_events_list_view) para consultas rápidas y predecibles
 */

import { requireDb } from '../db';
import { sql } from 'drizzle-orm';
import { storage } from '../storage';
import { controls, isNull } from '@shared/schema';

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
  const db = requireDb();
  const { limit, offset, filters } = params;

  const conditions: any[] = [sql`deleted_at IS NULL`];

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
  const [eventsResult, countResult] = await Promise.all([
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
  const db = requireDb();

  const conditions: any[] = [sql`deleted_at IS NULL`];

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
  const db = requireDb();

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

