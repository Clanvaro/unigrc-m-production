import { sql, isNull, isNotNull } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, numeric, jsonb, index, uniqueIndex, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Fiscal Entities - Entidades fiscales/empresas del sistema
export const fiscalEntities = pgTable("fiscal_entities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "matriz", "filial", "otra"
  taxId: text("tax_id").unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Gerencias - Unidades de gestión organizacional
export const gerencias = pgTable("gerencias", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  managerId: varchar("manager_id").references((): any => processOwners.id),
  order: integer("order").notNull().default(0),
  parentId: varchar("parent_id").references((): any => gerencias.id),
  level: text("level").notNull().default("gerencia"), // "gerencia", "subgerencia", "jefatura"
  status: text("status").notNull().default("active"),
  createdBy: varchar("created_by").notNull().references(() => users.id).default('user-1'),
  updatedBy: varchar("updated_by").references(() => users.id),
  deletedBy: varchar("deleted_by").references(() => users.id),
  deletedAt: timestamp("deleted_at"),
  deletionReason: text("deletion_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_gerencias_level").on(table.level),
  index("idx_gerencias_order").on(table.order),
]);

// Macroprocesos - Nivel superior de la jerarquía
export const macroprocesos = pgTable("macroprocesos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // "clave" o "apoyo"
  order: integer("order").notNull(),
  ownerId: varchar("owner_id").references((): any => processOwners.id),
  gerenciaId: varchar("gerencia_id").references(() => gerencias.id),
  fiscalEntityId: varchar("fiscal_entity_id").references(() => fiscalEntities.id),
  entityScope: text("entity_scope").notNull().default("transversal"), // "specific", "transversal", "selective"
  status: text("status").notNull().default("active"),
  createdBy: varchar("created_by").notNull().references(() => users.id).default('user-1'),
  updatedBy: varchar("updated_by").references(() => users.id),
  deletedBy: varchar("deleted_by").references(() => users.id),
  deletedAt: timestamp("deleted_at"),
  deletionReason: text("deletion_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_macroprocesos_order").on(table.order),
]);

// Procesos - Nivel medio, vinculados a macroprocesos
export const processes = pgTable("processes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: varchar("owner_id").references((): any => processOwners.id),
  macroprocesoId: varchar("macroproceso_id").references(() => macroprocesos.id),
  gerenciaId: varchar("gerencia_id").references(() => gerencias.id),
  fiscalEntityId: varchar("fiscal_entity_id").references(() => fiscalEntities.id),
  entityScope: text("entity_scope").notNull().default("transversal"),
  status: text("status").notNull().default("active"),
  createdBy: varchar("created_by").notNull().references(() => users.id).default('user-1'),
  updatedBy: varchar("updated_by").references(() => users.id),
  deletedBy: varchar("deleted_by").references(() => users.id),
  deletedAt: timestamp("deleted_at"),
  deletionReason: text("deletion_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_processes_macro").on(table.macroprocesoId),
]);

// Subprocesos - Nivel inferior, vinculados a procesos
export const subprocesos = pgTable("subprocesos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: varchar("owner_id").references((): any => processOwners.id),
  procesoId: varchar("proceso_id").notNull().references(() => processes.id),
  status: text("status").notNull().default("active"),
  createdBy: varchar("created_by").notNull().references(() => users.id).default('user-1'),
  updatedBy: varchar("updated_by").references(() => users.id),
  deletedBy: varchar("deleted_by").references(() => users.id),
  deletedAt: timestamp("deleted_at"),
  deletionReason: text("deletion_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_subprocesos_owner").on(table.ownerId),
  index("idx_subprocesos_proceso").on(table.procesoId),
]);

// Relación muchos a muchos: Procesos con Gerencias
export const processGerencias = pgTable("process_gerencias", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  processId: varchar("process_id").notNull().references(() => processes.id),
  gerenciaId: varchar("gerencia_id").notNull().references(() => gerencias.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueProcessGerencia: unique("unique_process_gerencia").on(table.processId, table.gerenciaId),
}));

// Relación muchos a muchos: Macroprocesos con Gerencias
export const macroprocesoGerencias = pgTable("macroproceso_gerencias", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  macroprocesoId: varchar("macroproceso_id").notNull().references(() => macroprocesos.id),
  gerenciaId: varchar("gerencia_id").notNull().references(() => gerencias.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueMacroprocesoGerencia: unique("unique_macroproceso_gerencia").on(table.macroprocesoId, table.gerenciaId),
}));

// Relación muchos a muchos: Subprocesos con Gerencias
export const subprocesoGerencias = pgTable("subproceso_gerencias", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subprocesoId: varchar("subproceso_id").notNull().references(() => subprocesos.id),
  gerenciaId: varchar("gerencia_id").notNull().references(() => gerencias.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueSubprocesoGerencia: unique("unique_subproceso_gerencia").on(table.subprocesoId, table.gerenciaId),
}));

// Relación muchos a muchos: Macroprocesos con entidades fiscales (para scope "selective")
export const macroprocesoFiscalEntities = pgTable("macroproceso_fiscal_entities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  macroprocesoId: varchar("macroproceso_id").notNull().references(() => macroprocesos.id),
  fiscalEntityId: varchar("fiscal_entity_id").notNull().references(() => fiscalEntities.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relación muchos a muchos: Procesos con entidades fiscales (para scope "selective")
export const processFiscalEntities = pgTable("process_fiscal_entities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  processId: varchar("process_id").notNull().references(() => processes.id),
  fiscalEntityId: varchar("fiscal_entity_id").notNull().references(() => fiscalEntities.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const risks = pgTable("risks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  // DEPRECATED: Estos campos se mantienen por compatibilidad pero ya no se usan activamente
  // La relación con procesos ahora se maneja a través de riskProcessLinks
  macroprocesoId: varchar("macroproceso_id").references(() => macroprocesos.id), // DEPRECATED - usar riskProcessLinks
  processId: varchar("process_id").references(() => processes.id), // DEPRECATED - usar riskProcessLinks
  subprocesoId: varchar("subproceso_id").references(() => subprocesos.id), // DEPRECATED - usar riskProcessLinks
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").array().default([]),

  // Factores para cálculo de probabilidad (1-5 cada uno)
  frequencyOccurrence: integer("frequency_occurrence").notNull().default(3), // 1=Casi nunca, 2=Improbable, 3=Moderado, 4=Probable, 5=Casi cierto
  exposureVolume: integer("exposure_volume").notNull().default(3), // 1=Bajo, 2=Bajo/Moderado, 3=Moderado, 4=Moderado/Alto, 5=Alto
  exposureMassivity: integer("exposure_massivity").notNull().default(3), // 1=1 persona, 2=2-5 personas, 3=1 área, 4=2-3 áreas, 5=≥4 áreas
  exposureCriticalPath: integer("exposure_critical_path").notNull().default(3), // 1=Soporte no crítico, 5=Core crítico
  complexity: integer("complexity").notNull().default(3), // 1=Simple, 5=Muy complejo
  changeVolatility: integer("change_volatility").notNull().default(3), // 1=Estable, 5=Alta volatilidad
  vulnerabilities: integer("vulnerabilities").notNull().default(3), // 1=Sin vulnerabilidades, 5=Críticas

  probability: integer("probability").notNull(), // 1-5 (calculado automáticamente)
  impact: integer("impact").notNull(), // 1-5 (calculado automáticamente desde dimensiones)
  
  // Dimensiones de impacto configurables - almacenadas como JSON
  // Ejemplo: {"infrastructure": 1, "reputation": 2, "economic": 3, ...}
  impactDimensions: jsonb("impact_dimensions").notNull().default(sql`'{}'::jsonb`),
  
  inherentRisk: integer("inherent_risk").notNull(), // probability * impact
  
  // Método de evaluación del riesgo inherente
  evaluationMethod: text("evaluation_method").notNull().default("factors"), // "factors" o "direct"
  
  status: text("status").notNull().default("active"), // active, inactive, deleted
  // DEPRECATED: Estos campos se calculan agregadamente desde riskProcessLinks
  processOwner: text("process_owner"), // DEPRECATED - calculado desde riskProcessLinks
  validationStatus: text("validation_status").notNull().default("pending_validation"), // DEPRECATED - calculado desde riskProcessLinks
  validatedBy: varchar("validated_by").references(() => users.id), // DEPRECATED - calculado desde riskProcessLinks
  validatedAt: timestamp("validated_at"), // DEPRECATED - calculado desde riskProcessLinks
  validationComments: text("validation_comments"), // DEPRECATED - calculado desde riskProcessLinks

  // Auditoría y soft-delete  
  createdBy: varchar("created_by").references(() => users.id), // Usuario que creó el registro (nullable para registros legacy)
  updatedBy: varchar("updated_by").references(() => users.id), // Usuario que modificó el registro
  deletedBy: varchar("deleted_by").references(() => users.id), // Usuario que eliminó el registro
  deletedAt: timestamp("deleted_at"), // Fecha de eliminación (soft-delete)
  deletionReason: text("deletion_reason"), // Motivo de la eliminación
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Composite index for soft-delete queries (most common pattern)
  // Indexes for deprecated FK columns (still in use by legacy queries)
  index("idx_risks_macroproceso").on(table.macroprocesoId),
  index("idx_risks_process").on(table.processId),
  index("idx_risks_subproceso").on(table.subprocesoId),
  // Performance optimization: Indexes for getRisksPaginated filtering and sorting
  index("idx_risks_status").on(table.status),
  index("idx_risks_created_at").on(table.createdAt),
  // Composite index for efficient pagination queries (filters by status, sorts by created_at)
]);

// Nueva tabla para manejar la relación muchos-a-muchos entre riesgos y procesos
// Cada enlace tiene su propio responsable y estado de validación
export const riskProcessLinks = pgTable("risk_process_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riskId: varchar("risk_id").notNull().references(() => risks.id),

  // Solo uno de estos debe estar presente (jerarquía: subproceso > proceso > macroproceso)
  macroprocesoId: varchar("macroproceso_id").references(() => macroprocesos.id),
  processId: varchar("process_id").references(() => processes.id),
  subprocesoId: varchar("subproceso_id").references(() => subprocesos.id),

  // Responsable específico para este enlace (puede sobrescribir el dueño del proceso)
  responsibleOverrideId: varchar("responsible_override_id").references(() => processOwners.id),

  // Estado de validación específico para esta relación riesgo-proceso
  validationStatus: text("validation_status").notNull().default("pending_validation"), // pending_validation, validated, observed, rejected
  validatedBy: varchar("validated_by").references(() => users.id),
  validatedAt: timestamp("validated_at"),
  validationComments: text("validation_comments"),

  // Notificaciones de validación
  notificationSent: boolean("notification_sent").notNull().default(false),
  lastNotificationSent: timestamp("last_notification_sent"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Índices para optimizar consultas con nombres únicos
  index("idx_rpl_risk_id").on(table.riskId),
  index("idx_rpl_macroproceso_id").on(table.macroprocesoId),
  index("idx_rpl_process_id").on(table.processId),
  index("idx_rpl_subproceso_id").on(table.subprocesoId),
  // Performance optimization: Composite index for validation center queries
  index("idx_rpl_risk_validation_status").on(table.riskId, table.validationStatus),
  // Performance optimization: Composite indexes for EXISTS subqueries in getRisksPaginated
  index("idx_rpl_risk_macroproceso").on(table.riskId, table.macroprocesoId),
  index("idx_rpl_risk_process").on(table.riskId, table.processId),
  index("idx_rpl_risk_subproceso").on(table.riskId, table.subprocesoId),
  // Evitar duplicados en la misma jerarquía con nombres únicos
  uniqueIndex("unique_rpl_risk_macroproceso").on(table.riskId, table.macroprocesoId).where(isNotNull(table.macroprocesoId)),
  uniqueIndex("unique_rpl_risk_process").on(table.riskId, table.processId).where(isNotNull(table.processId)),
  uniqueIndex("unique_rpl_risk_subproceso").on(table.riskId, table.subprocesoId).where(isNotNull(table.subprocesoId)),
]);

// Historial de validaciones de riskProcessLinks para auditoría completa
export const riskProcessLinkValidationHistory = pgTable("risk_process_link_validation_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riskProcessLinkId: varchar("risk_process_link_id").notNull().references(() => riskProcessLinks.id, { onDelete: 'cascade' }),
  
  // Estado de la validación
  previousStatus: text("previous_status"), // Estado anterior antes de esta validación
  validationStatus: text("validation_status").notNull(), // pending_validation, validated, observed, rejected
  validatedBy: varchar("validated_by").notNull().references(() => users.id),
  validatedAt: timestamp("validated_at").notNull().defaultNow(),
  validationComments: text("validation_comments"),
  
  // Contexto de cómo se realizó la validación
  processContext: text("process_context"), // "individual" | "bulk_process" | "bulk_multiple" - indica si fue validación individual o masiva
  processId: varchar("process_id").references(() => processes.id), // Si fue validación por proceso completo
  processName: text("process_name"), // Nombre del proceso al momento de validación
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_rplvh_risk_process_link_id").on(table.riskProcessLinkId),
  index("idx_rplvh_validated_by").on(table.validatedBy),
  index("idx_rplvh_validated_at").on(table.validatedAt),
  index("idx_rplvh_validation_status").on(table.validationStatus),
]);

export const controls = pgTable("controls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // preventive, detective, corrective
  automationLevel: text("automation_level"), // automatic, manual, semi_automatic
  frequency: text("frequency").notNull(), // continuous, daily, weekly, monthly
  evidence: text("evidence"), // Evidencia que el auditor debe revisar para probar la efectividad
  effectiveness: integer("effectiveness").notNull(), // 0-100 percentage (calculated from evaluation criteria)
  effectTarget: text("effect_target").notNull().default("both"), // "probability", "impact", or "both" - what dimension this control affects
  isActive: boolean("is_active").notNull().default(true),
  lastReview: timestamp("last_review"),
  evaluationCompletedAt: timestamp("evaluation_completed_at"), // When effectiveness evaluation was completed
  evaluatedBy: varchar("evaluated_by").references(() => users.id), // Who completed the evaluation

  // Campos para revalidación periódica
  revalidationFrequencyMonths: integer("revalidation_frequency_months").default(24), // Meses entre revalidaciones (default 24 meses)
  nextRevalidationDate: timestamp("next_revalidation_date"), // Próxima fecha de revalidación
  revalidationStatus: text("revalidation_status").notNull().default("vigente"), // "vigente", "proximo_vencimiento", "vencido", "revalidado"
  lastRevalidationDate: timestamp("last_revalidation_date"), // Última fecha de revalidación

  // Campos para validación de controles
  validationStatus: text("validation_status").notNull().default("pending_validation"), // pending_validation, validated, observed, rejected
  validatedBy: varchar("validated_by").references(() => users.id), // Usuario que validó
  validatedAt: timestamp("validated_at"), // Fecha de validación
  validationComments: text("validation_comments"), // Comentarios de la validación
  notifiedAt: timestamp("notified_at"), // Fecha cuando se envió la notificación por email al dueño del control

  // Campo para autoevaluación simplificada
  selfAssessment: text("self_assessment"), // "efectivo", "parcialmente_efectivo", "no_efectivo", "no_aplica"
  selfAssessmentComments: text("self_assessment_comments"), // Comentarios de la autoevaluación
  selfAssessmentDate: timestamp("self_assessment_date"), // Fecha de la autoevaluación
  selfAssessmentBy: varchar("self_assessment_by").references(() => users.id), // Usuario que realizó la autoevaluación

  // Auditoría y soft-delete
  createdBy: varchar("created_by").notNull().references(() => users.id).default('user-1'), // Usuario que creó el registro
  updatedBy: varchar("updated_by").references(() => users.id), // Usuario que modificó el registro
  deletedBy: varchar("deleted_by").references(() => users.id), // Usuario que eliminó el registro
  deletedAt: timestamp("deleted_at"), // Fecha de eliminación (soft-delete)
  deletionReason: text("deletion_reason"), // Motivo de la eliminación
  status: text("status").notNull().default("active"), // active, inactive, deleted - replaces isActive
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Composite indexes for performance optimization (controls module)
]);

// Historial de autoevaluaciones de controles
export const controlAssessmentHistory = pgTable("control_assessment_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  controlId: varchar("control_id").notNull().references(() => controls.id, { onDelete: 'cascade' }),
  selfAssessment: text("self_assessment").notNull(), // "efectivo", "parcialmente_efectivo", "no_efectivo", "no_aplica"
  evidenceDescription: text("evidence_description").notNull(), // Descripción de evidencia encontrada
  observations: text("observations"), // Comentarios de la autoevaluación
  evaluatedBy: varchar("evaluated_by").notNull().references(() => users.id),
  evaluatedAt: timestamp("evaluated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_assessment_history_control_id").on(table.controlId),
  index("idx_assessment_history_evaluated_at").on(table.evaluatedAt),
]);

// Criterios de evaluación configurables por administradores
export const controlEvaluationCriteria = pgTable("control_evaluation_criteria", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // ej: "Diseño del Control", "Implementación", "Documentación"
  description: text("description"),
  weight: integer("weight").notNull(), // Peso porcentual del criterio (ej: 30 para 30%)
  order: integer("order").notNull().default(0), // Orden de aparición en formulario
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
]);

// Opciones de calificación para cada criterio
export const controlEvaluationOptions = pgTable("control_evaluation_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  criteriaId: varchar("criteria_id").notNull().references(() => controlEvaluationCriteria.id, { onDelete: 'cascade' }),
  name: text("name").notNull(), // ej: "Preventivo", "Detectivo", "Correctivo"
  weight: integer("weight").notNull(), // Peso porcentual (ej: 100, 75, 50)
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_control_eval_options_criteria").on(table.criteriaId),
]);

// Evaluaciones específicas de cada control
export const controlEvaluations = pgTable("control_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  controlId: varchar("control_id").notNull().references(() => controls.id),
  criteriaId: varchar("criteria_id").notNull().references(() => controlEvaluationCriteria.id),
  optionId: varchar("option_id").notNull().references(() => controlEvaluationOptions.id),
  comments: text("comments"), // Comentarios específicos sobre esta evaluación
  evaluatedBy: varchar("evaluated_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Un control solo puede tener una evaluación por criterio
  uniqueControlCriteria: { columns: [table.controlId, table.criteriaId], name: "unique_control_criteria" }
}));

export const riskControls = pgTable("risk_controls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riskId: varchar("risk_id").notNull(), // Removed foreign key constraint temporarily
  controlId: varchar("control_id").notNull(), // Removed foreign key constraint temporarily  
  residualRisk: numeric("residual_risk", { precision: 5, scale: 1 }).notNull(), // calculated after control effectiveness, supports decimals like 6.8
}, (table) => [
  // Índices compuestos para optimizar queries con joins
  index("idx_rc_risk_id").on(table.riskId),
  index("idx_rc_control_id").on(table.controlId),
  index("idx_rc_risk_control").on(table.riskId, table.controlId),
]);

export const riskCategories = pgTable("risk_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#6b7280"), // Color hex para identificación visual
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
]);

export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: text("permissions").array().default([]), // Array de permisos
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_roles_id_active").on(table.id, table.isActive),
]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").unique(),
  email: text("email").unique(),
  fullName: text("full_name"),
  password: text("password"), // Hash de la contraseña - optional for OAuth users
  cargo: text("cargo"), // Cargo del usuario en la empresa
  phoneNumber: text("phone_number"), // Número de teléfono para notificaciones SMS
  
  // Replit Auth fields
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  isActive: boolean("is_active").notNull().default(true),
  isAdmin: boolean("is_admin").notNull().default(false), // Admin del sistema con permisos totales
  lastLogin: timestamp("last_login"),
  
  // Security & Password Policy (Phase 3)
  passwordHistory: text("password_history").array().default([]), // Array de hashes previos (últimas 5 contraseñas)
  passwordChangedAt: timestamp("password_changed_at"), // Fecha del último cambio de contraseña
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0), // Contador de intentos fallidos
  accountLockedUntil: timestamp("account_locked_until"), // Timestamp hasta cuando está bloqueada la cuenta
  passwordResetToken: text("password_reset_token"), // Token para recuperación de contraseña
  passwordResetExpires: timestamp("password_reset_expires"), // Expiración del token de reset
  lastPasswordResetAt: timestamp("last_password_reset_at"), // Última vez que se reseteo la contraseña
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  roleId: varchar("role_id").notNull().references(() => roles.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
}, (table) => [
  index("idx_user_roles_user_role").on(table.userId, table.roleId),
  index("idx_user_roles_user").on(table.userId),
]);

// ============= SESSION MANAGEMENT & SECURITY (PHASE 3) =============

// Sesiones activas con fingerprinting para prevenir session hijacking
export const activeSessions = pgTable("active_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sessionId: varchar("session_id").notNull().unique(), // Express session ID
  fingerprint: text("fingerprint").notNull(), // Hash del user-agent + IP + otros datos
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent").notNull(),
  deviceType: text("device_type"), // desktop, mobile, tablet
  lastActivity: timestamp("last_activity").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_active_sessions_user").on(table.userId),
  index("idx_active_sessions_expires").on(table.expiresAt),
]);

// Auditoría de autenticación y eventos de seguridad
export const authenticationAudit = pgTable("authentication_audit", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // Null si el intento falló antes de identificar usuario
  username: text("username"), // Username o email usado en el intento
  action: text("action").notNull(), // login_success, login_failed, logout, password_reset, account_locked, account_unlocked, session_expired
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  success: boolean("success").notNull(),
  failureReason: text("failure_reason"), // invalid_credentials, account_locked, account_inactive, expired_token, etc.
  metadata: jsonb("metadata"), // Información adicional (ej: tipo de autenticación, método 2FA, etc.)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_auth_audit_user").on(table.userId),
  index("idx_auth_audit_action").on(table.action),
  index("idx_auth_audit_created").on(table.createdAt),
]);

// ============= SISTEMA DE REVALIDACIÓN PERIÓDICA =============

// Tabla para asignar propietarios a controles (quien es responsable de revalidar)
export const controlOwners = pgTable("control_owners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  controlId: varchar("control_id").notNull().references(() => controls.id),
  processOwnerId: varchar("process_owner_id").notNull().references(() => processOwners.id), // Dueño de proceso responsable del control
  assignedBy: varchar("assigned_by").notNull().references(() => users.id), // Quien asignó (Admin/Analista)
  assignedAt: timestamp("assigned_at").defaultNow(),
  isActive: boolean("is_active").notNull().default(true), // Permite múltiples asignaciones históricas
}, (table) => [
  index("idx_control_owners_control_active").on(table.controlId, table.isActive),
  index("idx_control_owners_process_owner").on(table.processOwnerId),
]);

// Tabla para registrar todas las revalidaciones realizadas
export const revalidations = pgTable("revalidations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  controlId: varchar("control_id").notNull().references(() => controls.id),
  revalidatedBy: varchar("revalidated_by").notNull().references(() => users.id), // Usuario que realizó la revalidación
  status: text("status").notNull(), // "cumple", "no_cumple", "cumple_parcial"
  complianceDeclaration: text("compliance_declaration").notNull(), // Declaración de cumplimiento
  evidenceFiles: text("evidence_files").array().default([]), // URLs de archivos en object storage
  comments: text("comments"), // Comentarios adicionales
  nextRevalidationDate: timestamp("next_revalidation_date"), // Próxima fecha de revalidación calculada
  revalidationDate: timestamp("revalidation_date").notNull().defaultNow(), // Fecha cuando se realizó
  createdAt: timestamp("created_at").defaultNow(),
});

// Configuración de políticas de revalidación por nivel de riesgo
export const revalidationPolicies = pgTable("revalidation_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riskLevel: text("risk_level").notNull().unique(), // "alto", "medio", "bajo"
  frequencyMonths: integer("frequency_months").notNull(), // Frecuencia en meses
  warningDaysBefore: integer("warning_days_before").notNull().default(30), // Días de anticipación para alertas
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabla intermedia para relación many-to-many entre actions y risks
// Permite que una acción esté asociada a múltiples riesgos
export const actionPlanRisks = pgTable("action_plan_risks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actionPlanId: varchar("action_plan_id"), // DEPRECATED: Solo para compatibilidad con datos legacy (no tiene FK)
  actionId: varchar("action_id").references(() => actions.id, { onDelete: 'cascade' }), // Referencia a la tabla unificada actions
  riskId: varchar("risk_id").notNull().references(() => risks.id, { onDelete: 'cascade' }),
  
  // Marca el riesgo principal (el primero asociado)
  isPrimary: boolean("is_primary").notNull().default(false),
  
  // Estado de mitigación específico para este riesgo
  mitigationStatus: text("mitigation_status").default("pending"), // pending, in_progress, mitigated, not_mitigated
  
  // Notas específicas sobre cómo este plan mitiga este riesgo en particular
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_action_plan_risks_action_plan").on(table.actionPlanId),
  index("idx_action_plan_risks_action").on(table.actionId),
  index("idx_action_plan_risks_risk").on(table.riskId),
  // Performance: Composite index for JOIN queries
  index("idx_action_plan_risks_action_risk").on(table.actionId, table.riskId),
]);

// ============= TABLA UNIFICADA DE ACCIONES =============
// Unifica planes de acción (de riesgos) y compromisos (de hallazgos de auditoría)
export const actions = pgTable("actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),

  // Campo discriminador para identificar el origen
  origin: text("origin").notNull(), // 'risk' | 'audit' | 'compliance'

  // Referencias según el origen
  riskId: varchar("risk_id").references(() => risks.id), // Para origen 'risk'
  auditFindingId: varchar("audit_finding_id").references(() => auditFindings.id), // Para origen 'audit'

  // Campos comunes a ambos tipos
  title: text("title").notNull(), // name para riesgos, title para hallazgos
  description: text("description"),
  responsible: varchar("responsible"), // Responsable (process owner name, not FK to users) - nullable para permitir migración de datos legacy
  dueDate: timestamp("due_date"),
  originalDueDate: timestamp("original_due_date"), // Fecha original antes del primer reagendamiento
  rescheduleCount: integer("reschedule_count").default(0), // Contador de reagendamientos
  priority: text("priority").notNull(), // low, medium, high, critical
  status: text("status").notNull().default("pending"), // pending, in_progress, evidence_submitted, under_review, completed, implemented, audited, overdue, closed, deleted
  progress: integer("progress").notNull().default(0), // 0-100 percentage
  
  // Campos para estado de implementación
  implementedAt: timestamp("implemented_at"), // Fecha cuando se marcó como implementado
  implementedBy: varchar("implemented_by").references(() => users.id), // Usuario que marcó como implementado
  implementationComments: text("implementation_comments"), // Comentarios sobre la implementación

  // Campos específicos para acciones de auditoría (compromisos)
  managementResponse: text("management_response"), // Respuesta de la administración
  agreedAction: text("agreed_action"), // Acción acordada específica

  // Campos para workflow de evidencias
  evidenceSubmittedAt: timestamp("evidence_submitted_at"), // Fecha de envío de evidencias
  evidenceSubmittedBy: varchar("evidence_submitted_by").references(() => users.id), // Usuario que subió evidencias
  reviewedAt: timestamp("reviewed_at"), // Fecha de revisión
  reviewedBy: varchar("reviewed_by").references(() => users.id), // Auditor que revisó
  reviewComments: text("review_comments"), // Comentarios de la revisión

  // Campos para validación
  validationStatus: text("validation_status").default("pending_validation"), // pending_validation, validated, observed, rejected
  validatedBy: varchar("validated_by").references(() => users.id), // Usuario que validó
  validatedAt: timestamp("validated_at"), // Fecha de validación
  validationComments: text("validation_comments"), // Comentarios de validación
  notifiedAt: timestamp("notified_at"), // Fecha de notificación de validación

  // Auditoría y soft-delete
  createdBy: varchar("created_by").notNull().references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  deletedBy: varchar("deleted_by").references(() => users.id),
  deletedAt: timestamp("deleted_at"),
  deletionReason: text("deletion_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Performance: Partial index for active records queries (soft-delete pattern)
  index("idx_actions_code").on(table.code),
  index("idx_actions_status").on(table.status),
]);

// Adjuntos de evidencias para acciones
export const actionPlanAttachments = pgTable("action_plan_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actionPlanId: varchar("action_plan_id"), // DEPRECATED: Solo para compatibilidad con datos legacy (no tiene FK)
  actionId: varchar("action_id").references(() => actions.id), // Referencia a la tabla unificada actions
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(), // Ruta en object storage
  fileSize: integer("file_size").notNull(), // Tamaño en bytes
  fileType: text("file_type").notNull(), // MIME type
  description: text("description"), // Descripción opcional del adjunto
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Evidencias de implementación para acciones
// Permite subir múltiples archivos como evidencia de que el plan fue implementado
export const actionEvidence = pgTable("action_evidence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actionId: varchar("action_id").notNull().references(() => actions.id, { onDelete: 'cascade' }),
  
  // Información del archivo
  fileName: text("file_name").notNull(),
  originalFileName: text("original_file_name").notNull(),
  fileSize: integer("file_size").notNull(), // Tamaño en bytes
  mimeType: text("mime_type").notNull(), // MIME type (application/pdf, application/vnd.ms-excel, etc.)
  storageUrl: text("storage_url").notNull(), // URL de almacenamiento en object storage
  objectPath: text("object_path").notNull(), // Ruta completa en object storage
  
  // Clasificación y descripción
  description: text("description"), // Descripción opcional de la evidencia
  category: text("category").notNull().default("implementation_evidence"), // Categoría del documento
  
  // Metadatos de carga
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  
  // Auditoría
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_action_evidence_action").on(table.actionId),
  index("idx_action_evidence_uploaded_by").on(table.uploadedBy),
]);

// Tokens de acceso temporal para links seguros en emails
export const actionPlanAccessTokens = pgTable("action_plan_access_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(), // Token único y seguro
  actionPlanId: varchar("action_plan_id"), // DEPRECATED: Solo para compatibilidad con datos legacy (no tiene FK)
  actionId: varchar("action_id").references(() => actions.id), // Referencia a la tabla unificada actions
  purpose: text("purpose").notNull(), // 'upload_evidence', 'view_details'
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"), // Registro de cuando fue usado
  usedBy: varchar("used_by").references(() => users.id), // Usuario que lo usó (opcional)
  ipAddress: text("ip_address"), // IP desde donde se usó
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Configuración global del sistema para parámetros de efectividad de controles
export const systemConfig = pgTable("system_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  configKey: text("config_key").notNull().unique(), // ej: "max_effectiveness_limit"
  configValue: text("config_value").notNull(), // Valor como texto
  description: text("description"), // Descripción del parámetro
  dataType: text("data_type").notNull().default("string"), // string, number, boolean, json
  isActive: boolean("is_active").notNull().default(true),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============= VALIDACIÓN CENTRADA EN PROCESOS =============

// Estado general de validación por proceso
export const processValidations = pgTable("process_validations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  processId: varchar("process_id").notNull().references(() => processes.id),
  validationStatus: text("validation_status").notNull().default("pending"), // pending, in_progress, completed
  totalRisks: integer("total_risks").notNull().default(0),
  validatedRisks: integer("validated_risks").notNull().default(0),
  rejectedRisks: integer("rejected_risks").notNull().default(0),
  totalControls: integer("total_controls").notNull().default(0),
  validatedControls: integer("validated_controls").notNull().default(0),
  rejectedControls: integer("rejected_controls").notNull().default(0),
  completionPercentage: integer("completion_percentage").notNull().default(0), // 0-100
  assignedValidator: varchar("assigned_validator").references(() => users.id), // Validador principal del proceso
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Solo una fila de resumen por proceso
  uniqueProcessValidation: uniqueIndex("process_validations_process_unique").on(table.processId),
  // Performance optimization: Composite index for dashboard queries
  processValidationsStatusIdx: index("process_validations_status_idx").on(table.processId, table.validationStatus),
}));

// Validación específica de riesgo en contexto de proceso
export const processRiskValidations = pgTable("process_risk_validations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  processId: varchar("process_id").notNull().references(() => processes.id),
  riskId: varchar("risk_id").notNull().references(() => risks.id),
  validationStatus: text("validation_status").notNull().default("pending"), // pending, validated, rejected
  validatedBy: varchar("validated_by").references(() => users.id),
  validatedAt: timestamp("validated_at"),
  validationComments: text("validation_comments"),
  processContext: text("process_context"), // Contexto específico del riesgo en este proceso
  notificationSent: boolean("notification_sent").notNull().default(false),
  lastNotificationSent: timestamp("last_notification_sent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Un riesgo solo puede tener una validación por proceso
  uniqueProcessRisk: { columns: [table.processId, table.riskId], name: "unique_process_risk_validation" },
  // Índices para consultas eficientes
  processRiskValidationsProcessIdx: index("process_risk_validations_process_idx").on(table.processId),
  processRiskValidationsRiskIdx: index("process_risk_validations_risk_idx").on(table.riskId),
  processRiskValidationsStatusIdx: index("process_risk_validations_status_idx").on(table.validationStatus),
}));

// Validación específica de control en contexto de proceso
export const processControlValidations = pgTable("process_control_validations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  processId: varchar("process_id").notNull().references(() => processes.id),
  controlId: varchar("control_id").notNull().references(() => controls.id),
  riskId: varchar("risk_id").references(() => risks.id), // Control asociado a qué riesgo en este proceso
  validationStatus: text("validation_status").notNull().default("pending"), // pending, validated, rejected
  effectivenessInProcess: integer("effectiveness_in_process"), // Efectividad específica en este proceso
  validatedBy: varchar("validated_by").references(() => users.id),
  validatedAt: timestamp("validated_at"),
  validationComments: text("validation_comments"),
  processContext: text("process_context"), // Contexto específico del control en este proceso
  notificationSent: boolean("notification_sent").notNull().default(false),
  lastNotificationSent: timestamp("last_notification_sent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Un control solo puede tener una validación por proceso (manejo correcto de riskId nullable)
  uniqueProcessControlNoRisk: uniqueIndex("proc_ctrl_no_risk_unique").on(table.processId, table.controlId).where(isNull(table.riskId)),
  uniqueProcessControlWithRisk: uniqueIndex("proc_ctrl_with_risk_unique").on(table.processId, table.controlId, table.riskId).where(isNotNull(table.riskId)),
  // Índices para consultas eficientes
  processControlValidationsProcessIdx: index("process_control_validations_process_idx").on(table.processId),
  processControlValidationsControlIdx: index("process_control_validations_control_idx").on(table.controlId),
  processControlValidationsRiskIdx: index("process_control_validations_risk_idx").on(table.riskId),
  processControlValidationsStatusIdx: index("process_control_validations_status_idx").on(table.validationStatus),
}));

// Tabla para historial de riesgos - permite comparaciones temporales
export const riskSnapshots = pgTable("risk_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riskId: varchar("risk_id").notNull().references(() => risks.id),
  snapshotDate: timestamp("snapshot_date").notNull(),
  probability: integer("probability").notNull(), // 1-5
  impact: integer("impact").notNull(), // 1-5
  inherentRisk: integer("inherent_risk").notNull(), // probability * impact
  residualRisk: integer("residual_risk"), // Riesgo después de controles
  validationStatus: text("validation_status").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertFiscalEntitySchema = createInsertSchema(fiscalEntities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  type: z.enum(["matriz", "filial", "otra"]),
});

export const insertMacroprocesoFiscalEntitySchema = createInsertSchema(macroprocesoFiscalEntities).omit({
  id: true,
  createdAt: true,
});

export const insertProcessFiscalEntitySchema = createInsertSchema(processFiscalEntities).omit({
  id: true,
  createdAt: true,
});

export const insertGerenciaSchema = createInsertSchema(gerencias).omit({
  id: true,
  code: true,
  order: true,
  createdBy: true,
  updatedBy: true,
  deletedBy: true,
  deletedAt: true,
  deletionReason: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  parentId: z.string().nullable().optional(),
  level: z.enum(["gerencia", "subgerencia", "jefatura"]).default("gerencia"),
});

export const insertProcessGerenciaSchema = createInsertSchema(processGerencias).omit({
  id: true,
  createdAt: true,
});

export const insertMacroprocesoGerenciaSchema = createInsertSchema(macroprocesoGerencias).omit({
  id: true,
  createdAt: true,
});

export const insertSubprocesoGerenciaSchema = createInsertSchema(subprocesoGerencias).omit({
  id: true,
  createdAt: true,
});

export const insertMacroprocesoSchema = createInsertSchema(macroprocesos).omit({
  id: true,
  code: true,
  order: true,
  createdBy: true,
  updatedBy: true,
  deletedBy: true,
  deletedAt: true,
  deletionReason: true,
  createdAt: true,
  updatedAt: true,
});

export const updateMacroprocesoSchema = createInsertSchema(macroprocesos).omit({
  id: true,
  code: true,
  order: true,
  createdBy: true,
  updatedBy: true,
  deletedBy: true,
  deletedAt: true,
  deletionReason: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertProcessSchema = createInsertSchema(processes).omit({
  id: true,
  createdBy: true,
  updatedBy: true,
  deletedBy: true,
  deletedAt: true,
  deletionReason: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubprocesoSchema = createInsertSchema(subprocesos).omit({
  id: true,
  code: true,
  createdBy: true,
  updatedBy: true,
  deletedBy: true,
  deletedAt: true,
  deletionReason: true,
  createdAt: true,
  updatedAt: true,
});

// Base schema for risks without refinement (allows .partial())
export const baseInsertRiskSchema = createInsertSchema(risks).omit({
  id: true,
  code: true,
  probability: true, // Calculado automáticamente
  inherentRisk: true,
  validatedBy: true,
  validatedAt: true,
  createdBy: true,
  updatedBy: true,
  deletedBy: true,
  deletedAt: true,
  deletionReason: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  directProbability: z.number().int().min(1).max(5).optional(), // Campo adicional para evaluación directa de probabilidad
  probabilityOverride: z.number().int().min(1).max(5).optional(), // Campo para sobreescribir probabilidad calculada
});

// Schema with validation for creating risks
export const insertRiskSchema = baseInsertRiskSchema.refine((data) => {
  // Al menos uno de macroprocesoId, processId o subprocesoId debe estar presente
  return data.macroprocesoId || data.processId || data.subprocesoId;
}, {
  message: "Un riesgo debe estar asociado a un macroproceso, proceso o subproceso",
});

// Schema específico para validación de riesgos
export const validateRiskSchema = z.object({
  validationStatus: z.enum(["validated", "rejected"]),
  validationComments: z.string().optional(),
});

// Schema específico para validación de controles
export const validateControlSchema = z.object({
  validationStatus: z.enum(["validated", "rejected"]),
  validationComments: z.string().optional(),
});

export const insertControlSchema = createInsertSchema(controls).omit({
  id: true,
  code: true,
  createdBy: true,
  updatedBy: true,
  deletedBy: true,
  deletedAt: true,
  deletionReason: true,
  createdAt: true,
  updatedAt: true,
  evaluationCompletedAt: true,
  evaluatedBy: true,
  validatedBy: true,
  validatedAt: true,
  selfAssessmentDate: true,
  selfAssessmentBy: true,
});

// Schema específico para autoevaluación de controles
export const selfAssessmentSchema = z.object({
  selfAssessment: z.enum(["efectivo", "parcialmente_efectivo", "no_efectivo", "no_aplica"]),
  selfAssessmentComments: z.string().max(1000).optional(),
});

// Schema para historial de evaluaciones de controles
export const insertControlAssessmentHistorySchema = createInsertSchema(controlAssessmentHistory).omit({
  id: true,
  createdAt: true,
  evaluatedAt: true,
});

// Control Evaluation Criteria schemas
export const insertControlEvaluationCriteriaSchema = createInsertSchema(controlEvaluationCriteria).omit({
  id: true,
  createdAt: true,
});

export const insertControlEvaluationOptionsSchema = createInsertSchema(controlEvaluationOptions).omit({
  id: true,
  createdAt: true,
});

export const insertControlEvaluationSchema = createInsertSchema(controlEvaluations).omit({
  id: true,
  createdAt: true,
});

export const insertRiskControlSchema = createInsertSchema(riskControls).omit({
  id: true,
});

// ============= SCHEMAS PARA REVALIDACIÓN =============

export const insertControlOwnerSchema = createInsertSchema(controlOwners).omit({
  id: true,
  assignedAt: true,
});

export const insertRevalidationSchema = createInsertSchema(revalidations).omit({
  id: true,
  revalidationDate: true,
  createdAt: true,
}).extend({
  status: z.enum(["cumple", "no_cumple", "cumple_parcial"]),
});

export const insertRevalidationPolicySchema = createInsertSchema(revalidationPolicies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  riskLevel: z.enum(["alto", "medio", "bajo"]),
});

// Schema para agregar riesgos a planes de acción (relación many-to-many)
export const insertActionPlanRiskSchema = createInsertSchema(actionPlanRisks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  mitigationStatus: z.enum(["pending", "in_progress", "mitigated", "not_mitigated"]).optional(),
});

// Nuevo esquema unificado para acciones
export const insertActionSchema = createInsertSchema(actions).omit({
  id: true,
  code: true, // Se genera automáticamente en el servidor
  createdBy: true, // Se deriva del usuario autenticado
  updatedBy: true,
  deletedBy: true,
  deletedAt: true,
  deletionReason: true,
  createdAt: true,
  updatedAt: true,
  evidenceSubmittedAt: true,
  evidenceSubmittedBy: true,
  reviewedAt: true,
  reviewedBy: true,
  implementedAt: true,
  implementedBy: true,
}).extend({
  origin: z.enum(["risk", "audit", "compliance"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["pending", "in_progress", "evidence_submitted", "under_review", "completed", "implemented", "audited", "overdue", "closed", "deleted"]),
  dueDate: z.date().nullable().optional(), // Explícitamente nullable
  riskId: z.string().nullable().optional(),
  auditFindingId: z.string().nullable().optional(),
}).refine((data) => {
  // Validar que tenga la referencia correcta según el origen
  if (data.origin === "risk" && !data.riskId) {
    return false;
  }
  if (data.origin === "audit" && !data.auditFindingId) {
    return false;
  }
  // Las acciones de compliance pueden no tener referencia específica
  return true;
}, {
  message: "Las acciones de riesgo requieren riskId y las de auditoría requieren auditFindingId",
});

// Esquema para adjuntos de evidencias
export const insertActionPlanAttachmentSchema = createInsertSchema(actionPlanAttachments).omit({
  id: true,
  uploadedAt: true,
  createdAt: true,
  uploadedBy: true, // Se deriva del usuario autenticado
});

// Esquema para evidencias de implementación
export const insertActionEvidenceSchema = createInsertSchema(actionEvidence).omit({
  id: true,
  uploadedAt: true,
  createdAt: true,
  updatedAt: true,
  uploadedBy: true, // Se deriva del usuario autenticado
});

// Esquema para tokens de acceso
export const insertActionPlanAccessTokenSchema = createInsertSchema(actionPlanAccessTokens).omit({
  id: true,
  usedAt: true,
  usedBy: true,
  ipAddress: true,
  createdAt: true,
  createdBy: true, // Se deriva del usuario autenticado
}).extend({
  purpose: z.enum(["upload_evidence", "view_details"]),
  expiresAt: z.date(),
});

export const insertSystemConfigSchema = createInsertSchema(systemConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRiskCategorySchema = createInsertSchema(riskCategories).omit({
  id: true,
  createdAt: true,
});

export const insertRiskCategoryFormSchema = createInsertSchema(riskCategories).omit({
  id: true,
  createdAt: true,
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  passwordHistory: true, // Manejado automáticamente por el sistema
  failedLoginAttempts: true, // Manejado por el sistema de bloqueo
  accountLockedUntil: true, // Manejado por el sistema de bloqueo
  passwordResetToken: true, // Manejado por flujo de recuperación
  passwordResetExpires: true, // Manejado por flujo de recuperación
  lastPasswordResetAt: true, // Manejado por flujo de recuperación
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  assignedAt: true,
});

export const insertRiskSnapshotSchema = createInsertSchema(riskSnapshots).omit({
  id: true,
  createdAt: true,
});

// ============= SCHEMAS PARA VALIDACIÓN CENTRADA EN PROCESOS =============

export const insertProcessValidationSchema = createInsertSchema(processValidations).omit({
  id: true,
  totalRisks: true, // Calculado automáticamente
  validatedRisks: true, // Calculado automáticamente  
  rejectedRisks: true, // Calculado automáticamente
  totalControls: true, // Calculado automáticamente
  validatedControls: true, // Calculado automáticamente
  rejectedControls: true, // Calculado automáticamente
  completionPercentage: true, // Calculado automáticamente
  lastUpdated: true, // Manejado por el servidor
  createdAt: true,
  updatedAt: true,
}).extend({
  validationStatus: z.enum(["pending", "in_progress", "completed"]),
});

export const insertProcessRiskValidationSchema = createInsertSchema(processRiskValidations).omit({
  id: true,
  validatedBy: true,
  validatedAt: true,
  notificationSent: true,
  lastNotificationSent: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  validationStatus: z.enum(["pending", "validated", "rejected"]),
});

export const insertProcessControlValidationSchema = createInsertSchema(processControlValidations).omit({
  id: true,
  validatedBy: true,
  validatedAt: true,
  notificationSent: true,
  lastNotificationSent: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  validationStatus: z.enum(["pending", "validated", "rejected"]),
});

// ============= TIPOS TYPESCRIPT PARA ACCIONES UNIFICADAS =============

// Tipo base para la tabla actions
export type Action = typeof actions.$inferSelect;
export type InsertAction = z.infer<typeof insertActionSchema>;

// Risk Events types
export type RiskEvent = typeof riskEvents.$inferSelect;
export type InsertRiskEvent = z.infer<typeof insertRiskEventSchema>;

// ============= TIPOS PARA VALIDACIÓN CENTRADA EN PROCESOS =============

// Tipos para validación de procesos
export type ProcessValidation = typeof processValidations.$inferSelect;
export type InsertProcessValidation = z.infer<typeof insertProcessValidationSchema>;

export type ProcessRiskValidation = typeof processRiskValidations.$inferSelect;
export type InsertProcessRiskValidation = z.infer<typeof insertProcessRiskValidationSchema>;

export type ProcessControlValidation = typeof processControlValidations.$inferSelect;
export type InsertProcessControlValidation = z.infer<typeof insertProcessControlValidationSchema>;

// Tipos extendidos con información relacionada
export type ProcessValidationWithDetails = ProcessValidation & {
  process: {
    id: string;
    code: string;
    name: string;
    owner?: {
      id: string;
      name: string;
      email: string;
    };
  };
  assignedValidatorUser?: {
    id: string;
    fullName: string;
    email: string;
  };
};

export type ProcessRiskValidationWithDetails = ProcessRiskValidation & {
  process: {
    id: string;
    code: string;
    name: string;
  };
  risk: {
    id: string;
    code: string;
    name: string;
    inherentRisk: number;
    probability: number;
    impact: number;
  };
  validatedByUser?: {
    id: string;
    fullName: string;
    email: string;
  };
};

export type ProcessControlValidationWithDetails = ProcessControlValidation & {
  process: {
    id: string;
    code: string;
    name: string;
  };
  control: {
    id: string;
    code: string;
    name: string;
    type: string;
    effectiveness: number;
  };
  risk?: {
    id: string;
    code: string;
    name: string;
  };
  validatedByUser?: {
    id: string;
    fullName: string;
    email: string;
  };
};

// Tipos específicos por origen
export type RiskAction = Action & { origin: "risk"; riskId: string; auditFindingId: null };
export type AuditAction = Action & { origin: "audit"; auditFindingId: string; riskId: null };

// Tipo para acciones con detalles relacionados
export type ActionWithDetails = Action & {
  // Para acciones de riesgo
  risk?: {
    id: string;
    code: string;
    name: string;
    inherentRisk: number;
  };
  // Para acciones de auditoría
  auditFinding?: {
    id: string;
    code: string;
    title: string;
    severity: string;
    audit: {
      id: string;
      code: string;
      name: string;
    };
  };
  // Dueño de proceso responsable
  processOwner?: {
    id: string;
    name: string;
    email: string;
    position?: string;
  };
  // Usuario responsable (legacy)
  responsibleUser?: {
    id: string;
    fullName: string;
    email: string;
  };
  // Usuario que creó
  createdByUser?: {
    id: string;
    fullName: string;
    email: string;
  };
};

// ============= MÓDULO DE AUDITORÍA =============

// Plan Anual de Auditoría
export const auditPlans = pgTable("audit_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  year: integer("year").notNull(),
  description: text("description"),

  // Configuración del periodo del plan
  periodType: text("period_type").notNull().default("calendar"), // calendar, fiscal, multi_year
  startMonth: integer("start_month"), // 1-12, usado para periodo fiscal
  endMonth: integer("end_month"), // 1-12, usado para periodo fiscal
  endYear: integer("end_year"), // usado para planes multi-año

  status: text("status").notNull().default("draft"), // draft, approved, in_progress, completed, deleted
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),

  // Wizard progress tracking for progressive saving
  wizardStep: integer("wizard_step").default(0), // Current step in wizard (0-3)
  wizardData: jsonb("wizard_data"), // Serialized wizard state for progressive saving

  // Auditoría y soft-delete
  createdBy: varchar("created_by").notNull().references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  deletedBy: varchar("deleted_by").references(() => users.id),
  deletedAt: timestamp("deleted_at"),
  deletionReason: text("deletion_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
]);

// Auditorías Específicas
export const audits = pgTable("audits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(), // risk_based, compliance, operational, financial
  scope: text("scope").notNull(), // Alcance de la auditoría
  scopeEntity: text("scope_entity"), // subproceso, proceso o macroproceso específico a auditar - legacy
  scopeEntities: text("scope_entities").array().default([]), // Nueva funcionalidad - múltiples procesos/subprocesos
  reviewPeriod: text("review_period"), // período a revisar (ej: "Q1 2024", "Enero-Marzo 2024") - obsoleto, usar campos de fecha
  reviewPeriodStartDate: timestamp("review_period_start_date"), // Fecha de inicio del período a revisar
  reviewPeriodEndDate: timestamp("review_period_end_date"), // Fecha de fin del período a revisar
  objectives: text("objectives").array().default([]), // Objetivos específicos
  evaluationCriteria: text("evaluation_criteria").array().default([]), // Criterios de evaluación generales
  planId: varchar("plan_id").references(() => auditPlans.id), // Opcional si es parte del plan anual
  processId: varchar("process_id").references(() => processes.id),
  subprocesoId: varchar("subproceso_id").references(() => subprocesos.id),
  regulationId: varchar("regulation_id").references(() => regulations.id), // Para auditorías de cumplimiento
  status: text("status").notNull().default("borrador"), // borrador, en_revision, alcance_aprobado, en_ejecucion, cierre_tecnico, informe_preliminar, informe_final, seguimiento, cancelado
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  plannedStartDate: timestamp("planned_start_date"),
  plannedEndDate: timestamp("planned_end_date"),
  actualStartDate: timestamp("actual_start_date"),
  actualEndDate: timestamp("actual_end_date"),
  leadAuditor: varchar("lead_auditor").notNull().references(() => users.id),
  auditTeam: text("audit_team").array().default([]), // Array de user IDs
  // Aprobación del Programa de Trabajo (completo)
  programApprovalStatus: text("program_approval_status").default("borrador"), // borrador, pendiente_aprobacion, aprobado, rechazado
  programApprovedBy: varchar("program_approved_by").references(() => users.id), // Director de AI que aprobó el programa
  programApprovedAt: timestamp("program_approved_at"), // Fecha de aprobación del programa

  // Auditoría y soft-delete
  createdBy: varchar("created_by").notNull().references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  deletedBy: varchar("deleted_by").references(() => users.id),
  deletedAt: timestamp("deleted_at"),
  deletionReason: text("deletion_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Performance optimization: Composite index for audit queries with sorting
]);

// Registro de cambios de estado de auditorías (Workflow Log)
export const auditStateLog = pgTable("audit_state_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").notNull().references(() => audits.id, { onDelete: 'cascade' }),
  fromState: text("from_state"), // Estado anterior (null si es el primer estado)
  toState: text("to_state").notNull(), // Estado nuevo
  transitionName: text("transition_name"), // Nombre de la transición desde workflow.json
  comment: text("comment"), // Comentario opcional/requerido según workflow
  changedBy: varchar("changed_by").notNull().references(() => users.id), // Usuario que hizo el cambio
  changedAt: timestamp("changed_at").defaultNow(), // Timestamp del cambio
  metadata: text("metadata"), // JSON con metadata adicional (ej: campos validados, etc)
}, (table) => ({
  auditStateLogAuditIdx: index("audit_state_log_audit_idx").on(table.auditId),
  auditStateLogChangedAtIdx: index("audit_state_log_changed_at_idx").on(table.changedAt),
}));

// Versionado de Alcance de Auditoría (NOGAI 13.3 - Documentar objetivos y alcance, justificar cambios)
export const auditScopeVersions = pgTable("audit_scope_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").notNull().references(() => audits.id, { onDelete: 'cascade' }),
  versionNumber: integer("version_number").notNull(), // 1, 2, 3...
  generalObjective: text("general_objective").notNull(), // Objetivo general
  specificObjectives: text("specific_objectives").array().default([]), // Objetivos específicos
  evaluationCriteria: text("evaluation_criteria").array().default([]), // Criterios de evaluación (políticas, normas, marcos)
  areasUnits: text("areas_units").array().default([]), // Áreas/Unidades auditadas
  periodStart: timestamp("period_start"), // Periodo auditado - inicio
  periodEnd: timestamp("period_end"), // Periodo auditado - fin
  scopeDescription: text("scope_description").notNull(), // Descripción del alcance
  risksInScope: text("risks_in_scope").array().default([]), // IDs de riesgos en alcance
  changeReason: text("change_reason"), // Motivo del cambio (para versiones > 1)
  status: text("status").notNull().default("borrador"), // borrador, en_revision, aprobado, reemplazado
  approvedBy: varchar("approved_by").references(() => users.id), // Quien aprobó esta versión
  approvedAt: timestamp("approved_at"), // Fecha de aprobación
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  auditVersionIdx: index("audit_scope_versions_audit_idx").on(table.auditId, table.versionNumber),
}));

// Criterios de Auditoría (NOGAI 13 - Elementos internos/externos para evaluar aspectos bajo revisión)
export const auditCriteria = pgTable("audit_criteria", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").notNull().references(() => audits.id, { onDelete: 'cascade' }),
  objectiveId: varchar("objective_id"), // Enlace opcional a objetivos específicos (puede ser ID de un objetivo en el array)
  scopeItemId: varchar("scope_item_id"), // Enlace opcional a elementos del alcance (proceso/subproceso/macroproceso)
  
  // Tipo de origen del criterio
  sourceType: text("source_type").notNull().default("manual"), // "regulation" | "document" | "manual"
  
  // Referencias opcionales (solo se usa una según sourceType)
  regulationId: varchar("regulation_id").references(() => regulations.id, { onDelete: 'set null' }), // Referencia a normativa
  documentId: varchar("document_id").references(() => complianceDocuments.id, { onDelete: 'set null' }), // Referencia a documento de gestión
  
  title: text("title").notNull(), // Título del criterio
  description: text("description"), // Descripción detallada
  criterionType: text("criterion_type").notNull().default("interno"), // "interno" | "externo"
  normativeReference: text("normative_reference"), // Referencia normativa (ej: "NOGAI 13", "ISO 9001", "Política Interna XYZ") - se mantiene para compatibilidad
  evidenceExpectations: text("evidence_expectations"), // Qué evidencia se espera para este criterio
  ownerArea: text("owner_area"), // Área responsable del criterio
  applicabilityNotes: text("applicability_notes"), // Notas sobre aplicabilidad
  status: text("status").notNull().default("draft"), // "draft" | "approved"
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  auditCriteriaIdx: index("audit_criteria_audit_idx").on(table.auditId),
  regulationIdx: index("audit_criteria_regulation_idx").on(table.regulationId),
  documentIdx: index("audit_criteria_document_idx").on(table.documentId),
}));

// Alcance de Auditoría (procesos y subprocesos auditados) - Legacy, mantener para compatibilidad
export const auditScope = pgTable("audit_scope", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").notNull().references(() => audits.id, { onDelete: 'cascade' }),
  riskId: varchar("risk_id").notNull().references(() => risks.id),
  controlId: varchar("control_id").references(() => controls.id),
  testingApproach: text("testing_approach"),
  samplingMethod: text("sampling_method"),
  estimatedHours: integer("estimated_hours").default(0),
  priority: text("priority").default('medium'),
  isSelected: boolean("is_selected").default(true).notNull(),
  selectionReason: text("selection_reason"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
}));

// Controles Específicos de Auditoría (para auditorías de cumplimiento)
export const auditControls = pgTable("audit_controls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").notNull().references(() => audits.id),
  controlId: varchar("control_id").notNull().references(() => controls.id),
  riskId: varchar("risk_id").references(() => risks.id), // Riesgo asociado al control en esta auditoría
  testObjective: text("test_objective"), // Objetivo específico de la prueba para este control
  plannedTestDate: timestamp("planned_test_date"),
  actualTestDate: timestamp("actual_test_date"),
  testResult: text("test_result"), // not_tested, effective, ineffective, partially_effective
  testNotes: text("test_notes"), // Notas de la prueba
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Un control solo puede tener una asociación por auditoría
  uniqueAuditControl: { columns: [table.auditId, table.controlId], name: "unique_audit_control" }
}));

// Programas de Trabajo de Auditoría
export const auditPrograms = pgTable("audit_programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").notNull().references(() => audits.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
  objective: text("objective").notNull(),
  procedures: text("procedures").array().default([]), // Procedimientos de auditoría
  estimatedHours: integer("estimated_hours"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, not_applicable
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Hallazgos de Auditoría
export const auditFindings = pgTable("audit_findings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  auditId: varchar("audit_id").notNull().references(() => audits.id),
  programId: varchar("program_id").references(() => auditPrograms.id),
  riskId: varchar("risk_id").references(() => risks.id), // Vinculación con riesgos existentes
  controlId: varchar("control_id").references(() => controls.id), // Vinculación con controles
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // deficiency, weakness, observation, opportunity
  severity: text("severity").notNull(), // low, medium, high, critical
  condition: text("condition").notNull(), // Lo que encontramos
  criteria: text("criteria").notNull(), // Lo que debería ser
  cause: text("cause").notNull(), // Por qué ocurrió
  effect: text("effect").notNull(), // Impacto o consecuencias
  recommendation: text("recommendation").notNull(),
  managementResponse: text("management_response"),
  agreedAction: text("agreed_action"),
  responsiblePerson: varchar("responsible_person").references(() => users.id),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default("open"), // open, in_progress, implemented, overdue, closed
  identifiedBy: varchar("identified_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Performance optimization: Composite index for findings queries by audit
]);

// Seguimiento de Hallazgos
export const findingFollowUps = pgTable("finding_follow_ups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  findingId: varchar("finding_id").notNull().references(() => auditFindings.id),
  followUpDate: timestamp("follow_up_date").notNull(),
  status: text("status").notNull(), // on_track, delayed, completed, not_started
  progress: integer("progress").notNull().default(0), // 0-100
  comments: text("comments"),
  evidence: text("evidence").array().default([]), // URLs o referencias de evidencia
  reviewedBy: varchar("reviewed_by").notNull().references(() => users.id),
  nextReviewDate: timestamp("next_review_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Papeles de Trabajo
export const workingPapers = pgTable("working_papers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull(),
  auditId: varchar("audit_id").notNull().references(() => audits.id),
  programId: varchar("program_id").references(() => auditPrograms.id),
  title: text("title").notNull(),
  description: text("description"),
  workPerformed: text("work_performed").notNull(),
  conclusions: text("conclusions").notNull(),
  references: text("references").array().default([]), // Referencias cruzadas
  preparedBy: varchar("prepared_by").notNull().references(() => users.id),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  preparedDate: timestamp("prepared_date").notNull(),
  reviewedDate: timestamp("reviewed_date"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
]);

// Evaluación de Controles en Auditoría
// Re-evaluación de Controles en Auditoría (NOGAI 13.2 - Identificar riesgos y evaluar controles)
export const auditControlEvaluations = pgTable("audit_control_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").notNull().references(() => audits.id, { onDelete: 'cascade' }),
  controlId: varchar("control_id").notNull().references(() => controls.id),
  riskId: varchar("risk_id").references(() => risks.id), // Riesgo asociado al control
  // Estado y suficiencia del control (Fase 4: Re-evaluación)
  controlStatus: text("control_status").notNull().default("existing"), // existing, informal, inexistent
  controlSufficiency: text("control_sufficiency").notNull().default("sufficient"), // sufficient, partial, insufficient
  // Evaluación de efectividad
  designEffectiveness: text("design_effectiveness").notNull(), // effective, partially_effective, ineffective, not_applicable
  operatingEffectiveness: text("operating_effectiveness").notNull(), // effective, partially_effective, ineffective, not_tested
  // Soporte de la evaluación
  evaluationEvidence: text("evaluation_evidence"), // Evidencia que soporta la evaluación
  professionalJustification: text("professional_justification"), // Justificación profesional del auditor
  // Pruebas realizadas
  testingNature: text("testing_nature"), // inquiry, observation, inspection, reperformance
  testingExtent: text("testing_extent"), // Alcance de las pruebas
  testingResults: text("testing_results"),
  deficiencies: text("deficiencies"),
  recommendations: text("recommendations"),
  // Recálculo de efectividad y residual
  newEffectivenessRating: integer("new_effectiveness_rating"), // 0-100, nueva calificación propuesta basada en re-evaluación
  adjustedResidualRisk: numeric("adjusted_residual_risk"), // Riesgo residual recalculado
  // Auditoría
  evaluatedBy: varchar("evaluated_by").notNull().references(() => users.id),
  evaluatedDate: timestamp("evaluated_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  auditControlIdx: index("audit_control_evaluations_audit_idx").on(table.auditId),
  controlIdx: index("audit_control_evaluations_control_idx").on(table.controlId),
  riskIdx: index("audit_control_evaluations_risk_idx").on(table.riskId),
}));

// Re-evaluación de Riesgos en Auditoría (NOGAI 13.2)
export const auditRiskEvaluations = pgTable("audit_risk_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").notNull().references(() => audits.id, { onDelete: 'cascade' }),
  riskId: varchar("risk_id").references(() => risks.id), // Riesgo del universo de riesgos
  auditRiskId: varchar("audit_risk_id").references(() => auditRisks.id), // O riesgo ad-hoc de auditoría
  // Estado previo del riesgo inherente (antes de re-evaluación)
  previousProbability: integer("previous_probability"),
  previousImpact: integer("previous_impact"),
  previousInherentRisk: integer("previous_inherent_risk"),
  // Nueva evaluación del riesgo inherente
  confirmed: boolean("confirmed").notNull().default(false), // Si confirma el riesgo actual o lo re-evalúa
  newProbability: integer("new_probability"), // Nueva probabilidad (1-5) si no confirma
  newImpact: integer("new_impact"), // Nuevo impacto (1-5) si no confirma
  newInherentRisk: integer("new_inherent_risk"), // Nuevo riesgo inherente calculado
  // Riesgo residual recalculado después de re-evaluar controles
  recalculatedResidualRisk: numeric("recalculated_residual_risk"),
  // Justificación profesional
  evaluationJustification: text("evaluation_justification").notNull(),
  evaluationEvidence: text("evaluation_evidence"), // Evidencia que soporta la evaluación
  // Auditoría
  evaluatedBy: varchar("evaluated_by").notNull().references(() => users.id),
  evaluatedDate: timestamp("evaluated_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  auditRiskEvalAuditIdx: index("audit_risk_evaluations_audit_idx").on(table.auditId),
  auditRiskEvalRiskIdx: index("audit_risk_evaluations_risk_idx").on(table.riskId),
  auditRiskEvalAuditRiskIdx: index("audit_risk_evaluations_audit_risk_idx").on(table.auditRiskId),
}));

// Informes de Auditoría
export const auditReports = pgTable("audit_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").notNull().references(() => audits.id),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  executiveSummary: text("executive_summary").notNull(),
  background: text("background"),
  scope: text("scope").notNull(),
  methodology: text("methodology").notNull(),
  keyFindings: text("key_findings").array().default([]),
  conclusions: text("conclusions").notNull(),
  overallOpinion: text("overall_opinion").notNull(), // satisfactory, needs_improvement, unsatisfactory
  recommendations: text("recommendations").array().default([]),
  managementComments: text("management_comments"),
  reportType: text("report_type").notNull(), // draft, final, management_letter
  issuedDate: timestamp("issued_date"),
  draftDate: timestamp("draft_date"),
  preparedBy: varchar("prepared_by").notNull().references(() => users.id),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============= MÓDULO DE COMPLIANCE =============

// Normativas/Regulaciones
export const regulations = pgTable("regulations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  issuingOrganization: text("issuing_organization").notNull(), // Organismo emisor
  sourceType: text("source_type").notNull(), // "internal" | "external"
  law: text("law"), // Ley aplicable
  article: text("article"), // Artículo específico
  clause: text("clause"), // Numeral/inciso específico
  promulgationDate: timestamp("promulgation_date"), // Fecha de promulgación
  effectiveDate: timestamp("effective_date"), // Fecha de entrada en vigor
  lastUpdateDate: timestamp("last_update_date"), // Última actualización de la norma
  status: text("status").notNull().default("active"), // active, superseded, revoked
  criticality: text("criticality").notNull().default("medium"), // low, medium, high, critical
  applicability: text("applicability"), // A qué áreas/procesos aplica
  agrupacion: text("agrupacion"), // Agrupación o familia de delitos
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
]);

// Tabla de Aplicabilidad de Normativas (asociación con macroprocesos, procesos y subprocesos)
export const regulationApplicability = pgTable("regulation_applicability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  regulationId: varchar("regulation_id").notNull().references(() => regulations.id, { onDelete: "cascade" }),

  // Tipo de entidad a la que aplica
  entityType: text("entity_type").notNull(), // "all", "macroproceso", "proceso", "subproceso"

  // Referencias opcionales (null cuando entityType es "all")
  macroprocesoId: varchar("macroproceso_id").references(() => macroprocesos.id, { onDelete: "cascade" }),
  processId: varchar("process_id").references(() => processes.id, { onDelete: "cascade" }),
  subprocesoId: varchar("subproceso_id").references(() => subprocesos.id, { onDelete: "cascade" }),

  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => ({
  // Índices para mejorar performance
  regulationIdx: index("regulation_applicability_regulation_idx").on(table.regulationId),
  entityTypeIdx: index("regulation_applicability_entity_type_idx").on(table.entityType),
  macroprocesoIdx: index("regulation_applicability_macroproceso_idx").on(table.macroprocesoId),
  processIdx: index("regulation_applicability_process_idx").on(table.processId),
  subprocesoIdx: index("regulation_applicability_subproceso_idx").on(table.subprocesoId),

  // Evitar duplicados para la misma entidad
  uniqueApplicability: { 
    columns: [table.regulationId, table.entityType, table.macroprocesoId, table.processId, table.subprocesoId], 
    name: "unique_regulation_applicability" 
  }
}));

// Asociación de Riesgos con Normativas
export const riskRegulations = pgTable("risk_regulations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riskId: varchar("risk_id").notNull().references(() => risks.id),
  regulationId: varchar("regulation_id").notNull().references(() => regulations.id),
  complianceRequirement: text("compliance_requirement").notNull(), // Qué se debe cumplir específicamente
  nonComplianceImpact: text("non_compliance_impact"), // Impacto del incumplimiento
  criticality: text("criticality").notNull().default("medium"), // Criticidad del incumplimiento
  status: text("status").notNull().default("compliant"), // compliant, non_compliant, under_review, not_assessed
  lastAssessmentDate: timestamp("last_assessment_date"),
  nextAssessmentDate: timestamp("next_assessment_date"),
  assessedBy: varchar("assessed_by").references(() => users.id),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Un riesgo solo puede tener una asociación por regulación
  uniqueRiskRegulation: { columns: [table.riskId, table.regulationId], name: "unique_risk_regulation" }
}));

// Pruebas de Cumplimiento/Auditoría de Compliance
export const complianceTests = pgTable("compliance_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  regulationId: varchar("regulation_id").notNull().references(() => regulations.id),
  testType: text("test_type").notNull(), // "regulation", "law", "article", "clause" - nivel de granularidad
  scope: text("scope").notNull(), // Alcance específico de la prueba
  objectives: text("objectives").array().default([]), // Objetivos específicos de la prueba
  testProcedures: text("test_procedures").array().default([]), // Procedimientos de prueba
  plannedStartDate: timestamp("planned_start_date"),
  plannedEndDate: timestamp("planned_end_date"),
  actualStartDate: timestamp("actual_start_date"),
  actualEndDate: timestamp("actual_end_date"),
  status: text("status").notNull().default("planned"), // planned, in_progress, completed, cancelled
  priority: text("priority").notNull().default("medium"), // low, medium, high, critical
  leadAuditor: varchar("lead_auditor").notNull().references(() => users.id),
  auditTeam: text("audit_team").array().default([]), // Array de user IDs del equipo
  complianceResult: text("compliance_result"), // compliant, non_compliant, partially_compliant, not_assessed
  overallRating: integer("overall_rating"), // 0-100 calificación general de cumplimiento
  keyFindings: text("key_findings").array().default([]), // Hallazgos principales
  recommendations: text("recommendations").array().default([]), // Recomendaciones
  conclusions: text("conclusions"), // Conclusiones generales
  evidenceCollected: text("evidence_collected").array().default([]), // Evidencia recopilada
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Controles Probados en las Pruebas de Cumplimiento
export const complianceTestControls = pgTable("compliance_test_controls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  complianceTestId: varchar("compliance_test_id").notNull().references(() => complianceTests.id),
  controlId: varchar("control_id").notNull().references(() => controls.id),
  riskId: varchar("risk_id").references(() => risks.id), // Riesgo asociado al control en esta prueba
  testResult: text("test_result").notNull(), // effective, ineffective, partially_effective, not_tested
  testingNature: text("testing_nature"), // inquiry, observation, inspection, reperformance, analytical
  testingExtent: text("testing_extent"), // Alcance de las pruebas realizadas
  sampleSize: integer("sample_size"), // Tamaño de muestra si aplica
  testingDetails: text("testing_details"), // Detalles específicos de la prueba
  exceptions: text("exceptions").array().default([]), // Excepciones encontradas
  deficiencies: text("deficiencies"), // Deficiencias identificadas
  effectivenessRating: integer("effectiveness_rating"), // 0-100 - nueva calificación de efectividad encontrada
  complianceLevel: text("compliance_level"), // compliant, non_compliant, partially_compliant
  recommendations: text("recommendations"), // Recomendaciones específicas para este control
  managementResponse: text("management_response"), // Respuesta de la gerencia
  correctiveActions: text("corrective_actions"), // Acciones correctivas acordadas
  actionDueDate: timestamp("action_due_date"), // Fecha límite para acciones correctivas
  responsiblePerson: varchar("responsible_person").references(() => users.id),
  testedBy: varchar("tested_by").notNull().references(() => users.id),
  testedDate: timestamp("tested_date").notNull(),
  followUpRequired: boolean("follow_up_required").notNull().default(false),
  followUpDate: timestamp("follow_up_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Un control solo puede ser probado una vez por prueba de compliance
  uniqueTestControl: { columns: [table.complianceTestId, table.controlId], name: "unique_test_control" }
}));

// ============= EXPANSIÓN DEL MÓDULO DE AUDITORÍA COMO PROYECTOS =============

// Pruebas de Auditoría - Tareas específicas asignadas a auditores con workflow completo
export const auditTests = pgTable("audit_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // Código único para cada test
  auditId: varchar("audit_id").notNull().references(() => audits.id),
  programId: varchar("program_id").references(() => auditPrograms.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  objective: text("objective").array().default([]).notNull(),
  testProcedures: text("test_procedures").array().default([]), // Procedimientos específicos
  riskId: varchar("risk_id").references(() => risks.id), // Riesgo oficial evaluado
  auditRiskId: varchar("audit_risk_id").references(() => auditRisks.id), // Riesgo ad-hoc evaluado
  controlId: varchar("control_id").references(() => controls.id), // Control probado

  // Asignación de auditores con roles diferenciados
  assignedTo: varchar("assigned_to").notNull().references(() => users.id), // Auditor asignado (ejecutor principal)
  executorId: varchar("executor_id").notNull().references(() => users.id), // Ejecutor del trabajo (puede ser distinto al asignado)
  supervisorId: varchar("supervisor_id").references(() => users.id), // Supervisor asignado
  reviewedBy: varchar("reviewed_by").references(() => users.id), // Revisor final
  assignedAt: timestamp("assigned_at"), // Cuándo se asignó

  plannedStartDate: timestamp("planned_start_date"),
  plannedEndDate: timestamp("planned_end_date"),
  actualStartDate: timestamp("actual_start_date"),
  actualEndDate: timestamp("actual_end_date"),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours"),
  status: text("status").notNull().default("planned"), // planned, assigned, in_progress, under_review, completed, rejected, cancelled
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  progress: integer("progress").notNull().default(0), // 0-100 percentage of completion
  // Resultados de la prueba
  workPerformed: text("work_performed"), // Trabajo realizado
  testingNature: text("testing_nature"), // inquiry, observation, inspection, reperformance
  testingExtent: text("testing_extent"), // Alcance de las pruebas
  sampleSize: integer("sample_size"), // Tamaño de muestra
  testResult: text("test_result"), // effective, ineffective, partially_effective, not_tested
  exceptions: text("exceptions").array().default([]), // Excepciones encontradas
  deficiencies: text("deficiencies"), // Deficiencias identificadas
  conclusions: text("conclusions"), // Conclusiones del auditor
  recommendations: text("recommendations"), // Recomendaciones
  reviewComments: text("review_comments"), // Comentarios del revisor
  reviewStatus: text("review_status").default("pending"), // pending, approved, rejected, needs_revision

  // Campos para cumplimiento Norma 13.6 - Programa de Trabajo
  evaluationCriteria: text("evaluation_criteria").array().default([]).notNull(), // Criterios que se emplearán para evaluar cada objetivo
  methodologies: text("methodologies").array().default([]), // Metodologías y procedimientos analíticos
  tools: text("tools").array().default([]), // Herramientas para realizar las tareas

  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Validación de progreso: debe estar entre 0 y 100
  progressCheck: sql`CHECK (${table.progress} >= 0 AND ${table.progress} <= 100)`,
  // Índices críticos para workflow
  auditTestsAuditIdx: index("audit_tests_audit_idx").on(table.auditId),
  auditTestsExecutorIdx: index("audit_tests_executor_idx").on(table.executorId),
  auditTestsSupervisorIdx: index("audit_tests_supervisor_idx").on(table.supervisorId),
  auditTestsStatusIdx: index("audit_tests_status_idx").on(table.status),
  auditTestsCodeIdx: index("audit_tests_code_idx").on(table.code),
  // Performance optimization: Composite index for test queries by audit and status
  auditTestsAuditStatusIdx: index("audit_tests_audit_status_idx").on(table.auditId, table.status)
}));

// Adjuntos de Auditoría - Para respaldos y documentos con códigos únicos obligatorios
export const auditAttachments = pgTable("audit_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // Código único del documento REQUERIDO
  auditId: varchar("audit_id").references(() => audits.id),
  testId: varchar("test_id").references(() => auditTests.id),
  findingId: varchar("finding_id").references(() => auditFindings.id),
  programId: varchar("program_id").references(() => auditPrograms.id),
  workingPaperId: varchar("working_paper_id").references(() => workingPapers.id),
  fileName: text("file_name").notNull(),
  originalFileName: text("original_file_name").notNull(),
  fileSize: integer("file_size").notNull(), // Tamaño en bytes
  mimeType: text("mime_type").notNull(),
  objectPath: text("object_path").notNull(), // Ruta en object storage
  description: text("description"),
  category: text("category").notNull(), // evidence, working_paper, communication, regulation, procedure
  isConfidential: boolean("is_confidential").notNull().default(false),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// ============= SISTEMA DE ADJUNTOS PARA AUDIT TESTS CON CODIFICACIÓN JERÁRQUICA =============

// Adjuntos específicos para audit tests con códigos jerárquicos únicos (AT-###-DOC-###)
export const auditTestAttachments = pgTable("audit_test_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditTestId: varchar("audit_test_id").notNull().references(() => auditTests.id),
  fileName: text("file_name").notNull(), // Nombre del archivo para mostrar
  originalFileName: text("original_file_name").notNull(), // Nombre original del archivo subido
  fileSize: integer("file_size").notNull(), // Tamaño en bytes
  mimeType: text("mime_type").notNull(), // Tipo MIME del archivo
  attachmentCode: text("attachment_code").notNull().unique(), // Código jerárquico único: AT-###-DOC-###
  storageUrl: text("storage_url").notNull(), // URL en object storage
  objectPath: text("object_path").notNull(), // Ruta específica en object storage
  description: text("description"), // Descripción opcional del archivo
  category: text("category").notNull(), // evidence, workpaper, reference, communication, regulation
  tags: text("tags").array().default([]), // Tags adicionales para categorización
  isConfidential: boolean("is_confidential").notNull().default(false), // Si contiene información confidencial
  isActive: boolean("is_active").notNull().default(true), // Para soft deletion

  // ===== WORKFLOW INTEGRATION FIELDS =====
  // Relacionar con diferentes etapas del workflow de desarrollo de auditoría
  workLogId: varchar("work_log_id").references(() => auditTestWorkLogs.id), // Link to specific work log entry
  reviewCommentId: varchar("review_comment_id").references(() => auditReviewComments.id), // Link to review comment
  progressPercentage: integer("progress_percentage"), // Progress level when attached (0-100)
  workflowStage: text("workflow_stage").notNull().default("general"), // general, work_log, progress_update, review, milestone
  workflowAction: text("workflow_action"), // created, updated, reviewed, approved, rejected
  progressMilestone: text("progress_milestone"), // started, mid_progress, near_completion, completed
  reviewStage: text("review_stage"), // initial_review, feedback, corrections, final_approval
  attachmentPurpose: text("attachment_purpose"), // evidence, supporting_document, correction, feedback_request, approval_doc

  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Índices críticos para performance
  auditTestAttachmentsTestIdx: index("audit_test_attachments_test_idx").on(table.auditTestId),
  auditTestAttachmentsCodeIdx: index("audit_test_attachments_code_idx").on(table.attachmentCode),
  auditTestAttachmentsCategoryIdx: index("audit_test_attachments_category_idx").on(table.category),
  auditTestAttachmentsUploadedByIdx: index("audit_test_attachments_uploaded_by_idx").on(table.uploadedBy),
  // Workflow integration indexes
  auditTestAttachmentsWorkLogIdx: index("audit_test_attachments_work_log_idx").on(table.workLogId),
  auditTestAttachmentsReviewIdx: index("audit_test_attachments_review_idx").on(table.reviewCommentId),
  auditTestAttachmentsWorkflowStageIdx: index("audit_test_attachments_workflow_stage_idx").on(table.workflowStage),
  auditTestAttachmentsProgressIdx: index("audit_test_attachments_progress_idx").on(table.progressPercentage),
  // Compound indexes for workflow queries
  auditTestAttachmentsTestWorkflowIdx: index("audit_test_attachments_test_workflow_idx").on(table.auditTestId, table.workflowStage),
  auditTestAttachmentsTestProgressIdx: index("audit_test_attachments_test_progress_idx").on(table.auditTestId, table.progressPercentage),
  // Constraints de validación
  fileSizeCheck: sql`CHECK (${table.fileSize} > 0)`, // Archivo debe tener tamaño
  attachmentCodeFormat: sql`CHECK (${table.attachmentCode} ~ '^AT-[0-9]{3}-DOC-[0-9]{3}$')`, // Validar formato jerárquico
  // Workflow validation constraints
  progressPercentageRangeCheck: sql`CHECK (${table.progressPercentage} IS NULL OR (${table.progressPercentage} >= 0 AND ${table.progressPercentage} <= 100))`,
  workflowStageValidation: sql`CHECK (${table.workflowStage} IN ('general', 'work_log', 'progress_update', 'review', 'milestone'))`,
  progressMilestoneValidation: sql`CHECK (${table.progressMilestone} IS NULL OR ${table.progressMilestone} IN ('started', 'mid_progress', 'near_completion', 'completed'))`,
  reviewStageValidation: sql`CHECK (${table.reviewStage} IS NULL OR ${table.reviewStage} IN ('initial_review', 'feedback', 'corrections', 'final_approval'))`
}));

// Secuencias para generar códigos jerárquicos únicos de adjuntos por audit test
export const auditAttachmentCodeSequences = pgTable("audit_attachment_code_sequences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditTestId: varchar("audit_test_id").notNull().references(() => auditTests.id),
  testSequenceNumber: integer("test_sequence_number").notNull(), // Número secuencial del test (ej: 001)
  lastDocumentNumber: integer("last_document_number").notNull().default(0), // Último número de documento usado
  prefix: text("prefix").notNull().default("AT"), // Prefijo para los códigos
  format: text("format").notNull().default("AT-{test}-DOC-{doc}"), // Formato del código
  description: text("description"), // Descripción de la secuencia
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Un audit test solo puede tener una secuencia activa
  uniqueActiveAuditTestSequence: { 
    columns: [table.auditTestId], 
    name: "unique_active_audit_test_sequence",
    where: sql`${table.isActive} = true`
  },
  // Índice para queries rápidas
  auditAttachmentCodeSeqTestIdx: index("audit_attachment_code_seq_test_idx").on(table.auditTestId),
  // Constraint para validar números secuenciales
  testSequenceCheck: sql`CHECK (${table.testSequenceNumber} > 0 AND ${table.testSequenceNumber} <= 999)`,
  docNumberCheck: sql`CHECK (${table.lastDocumentNumber} >= 0 AND ${table.lastDocumentNumber} <= 999)`
}));

// Comentarios de Revisión - Sistema de comentarios detallado
export const auditReviewComments = pgTable("audit_review_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").references(() => audits.id),
  testId: varchar("test_id").references(() => auditTests.id),
  findingId: varchar("finding_id").references(() => auditFindings.id),
  workingPaperId: varchar("working_paper_id").references(() => workingPapers.id),
  commentType: text("comment_type").notNull(), // review, clarification, correction, approval, rejection
  comment: text("comment").notNull(),
  severity: text("severity").notNull().default("info"), // info, warning, error, critical
  section: text("section"), // Sección específica comentada (ej: "conclusions", "procedures", etc.)
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  parentCommentId: varchar("parent_comment_id"), // Para hilos de conversación - eliminamos la auto-referencia por ahora
  commentedBy: varchar("commented_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Hitos del Proyecto de Auditoría - Para seguimiento de progreso
export const auditMilestones = pgTable("audit_milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").notNull().references(() => audits.id),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("reunion_inicio"), // reunion_inicio, reunion_cierre
  plannedDate: timestamp("planned_date").notNull(),
  actualDate: timestamp("actual_date"),
  meetingDate: timestamp("meeting_date"), // Fecha específica de la reunión
  participants: text("participants").array().default([]), // IDs de usuarios participantes en reuniones
  meetingMinutesUrl: text("meeting_minutes_url"), // URL del documento de minuta de reunión
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, delayed, cancelled
  isDeliverable: boolean("is_deliverable").notNull().default(false), // Si requiere entregable
  deliverableDescription: text("deliverable_description"),
  responsibleId: varchar("responsible_id").references(() => users.id),
  completedBy: varchar("completed_by").references(() => users.id),
  order: integer("order").notNull().default(0), // Orden de los hitos
  createdAt: timestamp("created_at").defaultNow(),
});

// Riesgos Identificados en Auditoría - Riesgos ad-hoc específicos de cada auditoría
export const auditRisks = pgTable("audit_risks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").notNull().references(() => audits.id, { onDelete: 'cascade' }),
  code: text("code").notNull(), // No unique globally, pero unique per audit
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").array().default([]),

  // Método de evaluación: 'factors' (por factores) o 'direct' (directo)
  evaluationMethod: text("evaluation_method").notNull().default("factors"),

  // Factores para cálculo de probabilidad (1-5 cada uno) - usa configuración global
  frequencyOccurrence: integer("frequency_occurrence").notNull().default(3),
  exposureVolume: integer("exposure_volume").notNull().default(3), 
  exposureMassivity: integer("exposure_massivity").notNull().default(3),
  exposureCriticalPath: integer("exposure_critical_path").notNull().default(3),
  complexity: integer("complexity").notNull().default(3),
  changeVolatility: integer("change_volatility").notNull().default(3),
  vulnerabilities: integer("vulnerabilities").notNull().default(3),

  probability: integer("probability").notNull(), // 1-5 (calculado automáticamente si evaluationMethod='factors', o valor directo)
  impact: integer("impact").notNull(), // 1-5
  inherentRisk: integer("inherent_risk").notNull(), // probability * impact
  status: text("status").notNull().default("identified"), // identified, assessed, mitigated, closed

  // Campos específicos de auditoría
  identifiedBy: varchar("identified_by").notNull().references(() => users.id),
  identifiedDate: timestamp("identified_date").defaultNow(),
  source: text("source").notNull().default("audit_fieldwork"), // audit_fieldwork, stakeholder_interview, document_review, process_observation
  potentialImpact: text("potential_impact"), // Descripción del impacto potencial
  recommendedControls: text("recommended_controls"), // Controles recomendados

  // Metadatos
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint: código único por auditoría
  uniqueAuditRiskCode: { columns: [table.auditId, table.code], name: "unique_audit_risk_code" },
  // Índices para consultas eficientes
  auditRisksAuditIdx: index("audit_risks_audit_idx").on(table.auditId),
  auditRisksStatusIdx: index("audit_risks_status_idx").on(table.status),
  auditRisksIdentifiedByIdx: index("audit_risks_identified_by_idx").on(table.identifiedBy),
  auditRisksCreatedByIdx: index("audit_risks_created_by_idx").on(table.createdBy),
}));

// ============= SISTEMA COMPLETO DE NOTIFICACIONES INTELIGENTES =============

// Notificaciones del Sistema - Tabla principal con soporte completo
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientId: varchar("recipient_id").notNull().references(() => users.id),

  // Contexto de la notificación
  auditId: varchar("audit_id").references(() => audits.id),
  auditTestId: varchar("audit_test_id").references(() => auditTests.id),
  auditFindingId: varchar("audit_finding_id").references(() => auditFindings.id),
  actionId: varchar("action_id").references(() => actions.id),
  riskId: varchar("risk_id").references(() => risks.id),
  controlId: varchar("control_id").references(() => controls.id),

  // Tipo y metadatos
  type: text("type").notNull(), // deadline_approaching, deadline_overdue, assignment, status_change, milestone, review_request, comment_added, system_alert
  category: text("category").notNull().default("audit"), // audit, system, security, maintenance, feature
  priority: text("priority").notNull().default("normal"), // critical, important, normal, low

  // Contenido
  title: text("title").notNull(),
  message: text("message").notNull(),
  actionText: text("action_text"), // Texto del botón de acción (ej: "View Test", "Review Now")
  actionUrl: text("action_url"), // URL para dirigir al usuario al elemento específico

  // Datos adicionales en JSON
  data: jsonb("data").default({}), // Datos contextuales adicionales

  // Canales de entrega
  channels: text("channels").array().notNull().default(["in_app"]), // in_app, email, push

  // Estado y tracking
  status: text("status").notNull().default("pending"), // pending, sent, delivered, read, clicked, failed
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),

  // Programación
  scheduledFor: timestamp("scheduled_for").defaultNow(), // Cuándo debe enviarse
  sentAt: timestamp("sent_at"), // Cuándo se envió realmente

  // Metadatos de entrega
  deliveryAttempts: integer("delivery_attempts").notNull().default(0),
  lastDeliveryError: text("last_delivery_error"),
  deliveryStatus: jsonb("delivery_status").default({}), // Estado por canal: {email: "sent", push: "failed"}

  // Agrupación para evitar spam
  groupingKey: text("grouping_key"), // Clave para agrupar notificaciones similares
  replacesNotificationId: varchar("replaces_notification_id"), // Si esta notificación reemplaza otra

  createdBy: varchar("created_by").references(() => users.id), // Quién generó la notificación (null para sistema)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Índices para performance
  notificationsRecipientIdx: index("notifications_recipient_idx").on(table.recipientId),
  notificationsTypeIdx: index("notifications_type_idx").on(table.type),
  notificationsPriorityIdx: index("notifications_priority_idx").on(table.priority),
  notificationsStatusIdx: index("notifications_status_idx").on(table.status),
  notificationsScheduledIdx: index("notifications_scheduled_idx").on(table.scheduledFor),
  notificationsReadIdx: index("notifications_read_idx").on(table.isRead),
  // Índices compuestos para queries comunes
  notificationsRecipientUnreadIdx: index("notifications_recipient_unread_idx").on(table.recipientId, table.isRead),
  notificationsRecipientTypeIdx: index("notifications_recipient_type_idx").on(table.recipientId, table.type),
  notificationsAuditTestIdx: index("notifications_audit_test_idx").on(table.auditTestId),
  // Índice optimizado para getUnreadCount query (recipient + read status)
  notificationsRecipientUnreadOptimizedIdx: index("notifications_recipient_unread_optimized_idx").on(table.recipientId, table.isRead),
  // Constraint de validación
  deliveryAttemptsCheck: sql`CHECK (${table.deliveryAttempts} >= 0)`,
  priorityValidation: sql`CHECK (${table.priority} IN ('critical', 'important', 'normal', 'low'))`,
  statusValidation: sql`CHECK (${table.status} IN ('pending', 'sent', 'delivered', 'read', 'clicked', 'failed', 'cancelled'))`
}));

// Preferencias de Notificaciones por Usuario
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),

  // Tipo de notificación
  notificationType: text("notification_type").notNull(), // deadline_approaching, assignment, status_change, etc.
  category: text("category").notNull().default("audit"), // audit, system, security, etc.

  // Canales habilitados para este tipo
  enabledChannels: text("enabled_channels").array().notNull().default(["in_app"]), // in_app, email, push

  // Configuración de frecuencia
  frequency: text("frequency").notNull().default("immediate"), // immediate, batched, daily_digest, weekly_digest, disabled

  // Horas de silencio
  quietHoursEnabled: boolean("quiet_hours_enabled").notNull().default(false),
  quietHoursStart: text("quiet_hours_start").default("22:00"), // Formato HH:MM
  quietHoursEnd: text("quiet_hours_end").default("08:00"), // Formato HH:MM

  // Configuración de prioridad mínima
  minPriority: text("min_priority").notNull().default("normal"), // Solo notificaciones de esta prioridad o superior

  // Configuración específica por tipo
  config: jsonb("config").default({}), // Configuraciones específicas del tipo de notificación

  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Un usuario solo puede tener una preferencia activa por tipo y categoría
  uniqueUserTypeCategory: {
    columns: [table.userId, table.notificationType, table.category],
    name: "unique_user_notification_type_category",
    where: sql`${table.isActive} = true`
  },
  // Índices para queries rápidas
  notificationPreferencesUserIdx: index("notification_preferences_user_idx").on(table.userId),
  notificationPreferencesTypeIdx: index("notification_preferences_type_idx").on(table.notificationType)
}));

// Templates de Notificaciones
export const notificationTemplates = pgTable("notification_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(), // Clave única del template (ej: "audit_test_assignment")
  name: text("name").notNull(), // Nombre descriptivo
  description: text("description"),

  // Configuración por canal
  channels: text("channels").array().notNull().default(["in_app"]), // Canales soportados

  // Templates por canal
  inAppTitle: text("in_app_title"), // Template del título para in-app
  inAppMessage: text("in_app_message"), // Template del mensaje para in-app
  inAppActionText: text("in_app_action_text"), // Template del texto de acción

  emailSubject: text("email_subject"), // Template del asunto del email
  emailHtmlBody: text("email_html_body"), // Template HTML del email
  emailTextBody: text("email_text_body"), // Template de texto plano del email

  pushTitle: text("push_title"), // Template del título para push
  pushMessage: text("push_message"), // Template del mensaje para push

  // Variables disponibles en el template
  variables: text("variables").array().default([]), // Variables que puede usar el template
  exampleData: jsonb("example_data").default({}), // Datos de ejemplo para preview

  // Metadatos
  category: text("category").notNull().default("audit"),
  priority: text("priority").notNull().default("normal"),
  isActive: boolean("is_active").notNull().default(true),

  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  notificationTemplatesKeyIdx: index("notification_templates_key_idx").on(table.key),
  notificationTemplatesCategoryIdx: index("notification_templates_category_idx").on(table.category)
}));

// Cola de Notificaciones para Procesamiento Asíncrono
export const notificationQueue = pgTable("notification_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  notificationId: varchar("notification_id").notNull().references(() => notifications.id),
  channel: text("channel").notNull(), // in_app, email, push

  // Estado de procesamiento
  status: text("status").notNull().default("queued"), // queued, processing, completed, failed
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  lastError: text("last_error"),

  // Programación
  scheduledFor: timestamp("scheduled_for").notNull(),
  processedAt: timestamp("processed_at"),
  nextRetryAt: timestamp("next_retry_at"),

  // Prioridad de cola
  queuePriority: integer("queue_priority").notNull().default(5), // 1 (más alta) a 10 (más baja)

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Índices para procesamiento eficiente de cola
  notificationQueueStatusIdx: index("notification_queue_status_idx").on(table.status),
  notificationQueueScheduledIdx: index("notification_queue_scheduled_idx").on(table.scheduledFor),
  notificationQueuePriorityIdx: index("notification_queue_priority_idx").on(table.queuePriority),
  notificationQueueChannelIdx: index("notification_queue_channel_idx").on(table.channel),
  // Compound index for queue processing
  notificationQueueProcessingIdx: index("notification_queue_processing_idx").on(table.status, table.scheduledFor, table.queuePriority),
  // Constraint de validación
  attemptsCheck: sql`CHECK (${table.attempts} >= 0 AND ${table.attempts} <= ${table.maxAttempts})`,
  priorityCheck: sql`CHECK (${table.queuePriority} >= 1 AND ${table.queuePriority} <= 10)`,
  statusValidation: sql`CHECK (${table.status} IN ('queued', 'processing', 'completed', 'failed', 'cancelled'))`
}));

// Estadísticas de Notificaciones para Analytics
export const notificationStats = pgTable("notification_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(), // Fecha de las estadísticas
  notificationType: text("notification_type").notNull(),
  channel: text("channel").notNull(),

  // Contadores
  totalSent: integer("total_sent").notNull().default(0),
  totalDelivered: integer("total_delivered").notNull().default(0),
  totalRead: integer("total_read").notNull().default(0),
  totalClicked: integer("total_clicked").notNull().default(0),
  totalFailed: integer("total_failed").notNull().default(0),

  // Métricas calculadas
  deliveryRate: numeric("delivery_rate", { precision: 5, scale: 2 }), // Porcentaje de entrega exitosa
  readRate: numeric("read_rate", { precision: 5, scale: 2 }), // Porcentaje de lectura
  clickRate: numeric("click_rate", { precision: 5, scale: 2 }), // Porcentaje de clics

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Un registro por día, tipo y canal
  uniqueDateTypeChannel: {
    columns: [table.date, table.notificationType, table.channel],
    name: "unique_notification_stats_date_type_channel"
  },
  notificationStatsDateIdx: index("notification_stats_date_idx").on(table.date),
  notificationStatsTypeIdx: index("notification_stats_type_idx").on(table.notificationType)
}));

// Mantener tabla legacy por compatibilidad (deprecated)
export const auditNotifications = pgTable("audit_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").references(() => audits.id),
  testId: varchar("test_id").references(() => auditTests.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // assignment, review_request, deadline_reminder, status_change, comment_added
  title: text("title").notNull(),
  message: text("message").notNull(),
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
  isRead: boolean("is_read").notNull().default(false),
  actionUrl: text("action_url"), // URL para dirigir al usuario al elemento específico
  createdAt: timestamp("created_at").defaultNow(),
});

// ============= NUEVAS TABLAS PARA PROGRAMA DE TRABAJO DE AUDITORÍA =============

// Registro de Trabajo de Pruebas de Auditoría - Para tracking de tiempo y trabajo con validaciones críticas
export const auditTestWorkLogs = pgTable("audit_test_work_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditTestId: varchar("audit_test_id").notNull().references(() => auditTests.id),
  entryDate: timestamp("entry_date").notNull(), // Fecha del trabajo realizado
  description: text("description").notNull(), // Descripción del trabajo realizado
  workType: text("work_type").notNull(), // planning, fieldwork, review, documentation, follow_up
  hoursWorked: numeric("hours_worked", { precision: 4, scale: 2 }).notNull(), // Horas trabajadas (permite decimales como 2.5)
  progressPercentage: integer("progress_percentage").default(0), // % de progreso estimado (0-100)
  challengesEncountered: text("challenges_encountered"), // Desafíos o problemas encontrados
  nextSteps: text("next_steps"), // Próximos pasos planificados
  isReviewed: boolean("is_reviewed").notNull().default(false), // Si fue revisado por supervisor
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewComments: text("review_comments"), // Comentarios del revisor
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Validaciones críticas
  progressPercentageCheck: sql`CHECK (${table.progressPercentage} >= 0 AND ${table.progressPercentage} <= 100)`,
  hoursWorkedCheck: sql`CHECK (${table.hoursWorked} >= 0 AND ${table.hoursWorked} <= 24)`, // Máximo 24 horas por entrada
  entryDateCheck: sql`CHECK (${table.entryDate} <= CURRENT_DATE + INTERVAL '1 day')`, // No puede ser futuro
  // Índices críticos para performance
  auditTestWorkLogsTestIdx: index("audit_test_work_logs_test_idx").on(table.auditTestId),
  auditTestWorkLogsDateIdx: index("audit_test_work_logs_date_idx").on(table.entryDate),
  auditTestWorkLogsCreatedByIdx: index("audit_test_work_logs_created_by_idx").on(table.createdBy),
  // Índice compuesto para queries de timesheet
  auditTestWorkLogsTestDateIdx: index("audit_test_work_logs_test_date_idx").on(table.auditTestId, table.entryDate)
}));

// Secuencias de Códigos de Auditoría - Para generar códigos únicos jerárquicos con atomicidad
export const auditCodeSequences = pgTable("audit_code_sequences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").notNull().references(() => audits.id),
  entityType: text("entity_type").notNull(), // "test", "attachment", "working_paper", "finding"
  scope: text("scope").notNull(), // "PT" (Programa de Trabajo), "PW" (Papel de Trabajo), "AT" (Archivo de Trabajo), "ET" (Evidencia de Trabajo)
  nextNumber: integer("next_number").notNull().default(1), // Próximo número disponible
  prefix: text("prefix").notNull(), // Prefijo requerido (ej: "AUD2024")
  format: text("format").notNull().default("sequential"), // sequential, quarterly, monthly
  description: text("description"), // Descripción del tipo de secuencia
  lastUsedAt: timestamp("last_used_at"), // Última vez que se usó
  lastGeneratedCode: text("last_generated_code"), // Último código generado para verificación
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Único por auditoría, tipo de entidad y scope - garantiza atomicidad
  uniqueAuditEntityScope: { columns: [table.auditId, table.entityType, table.scope], name: "unique_audit_entity_scope" },
  // Único por auditoría y prefijo - evita prefijos duplicados
  uniqueAuditPrefix: { columns: [table.auditId, table.prefix], name: "unique_audit_prefix" },
  // Índice para queries rápidas
  auditCodeSeqAuditIdx: index("audit_code_seq_audit_idx").on(table.auditId)
}));

// Insert schemas para auditoría
export const insertAuditPlanSchema = createInsertSchema(auditPlans).omit({
  id: true,
  updatedBy: true,
  deletedBy: true,
  deletedAt: true,
  deletionReason: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  code: z.string().optional() // Make code optional so it can be generated server-side
});

export const insertAuditSchema = createInsertSchema(audits).omit({
  id: true,
  code: true,
  updatedBy: true,
  deletedBy: true,
  deletedAt: true,
  deletionReason: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditStateLogSchema = createInsertSchema(auditStateLog).omit({
  id: true,
  changedAt: true,
});

export const insertAuditScopeVersionSchema = createInsertSchema(auditScopeVersions).omit({
  id: true,
  createdAt: true,
});

export const insertAuditCriterionSchema = createInsertSchema(auditCriteria).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditScopeSchema = createInsertSchema(auditScope).omit({
  id: true,
  createdAt: true,
});

export const insertAuditControlSchema = createInsertSchema(auditControls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditProgramSchema = createInsertSchema(auditPrograms).omit({
  id: true,
  createdAt: true,
});

export const insertAuditFindingSchema = createInsertSchema(auditFindings).omit({
  id: true,
  code: true,
  createdAt: true,
});

export const insertFindingFollowUpSchema = createInsertSchema(findingFollowUps).omit({
  id: true,
  createdAt: true,
});

export const insertWorkingPaperSchema = createInsertSchema(workingPapers).omit({
  id: true,
  createdAt: true,
});

export const insertAuditControlEvaluationSchema = createInsertSchema(auditControlEvaluations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditRiskEvaluationSchema = createInsertSchema(auditRiskEvaluations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditReportSchema = createInsertSchema(auditReports).omit({
  id: true,
  code: true,
  createdAt: true,
});

export const insertAuditMilestoneSchema = createInsertSchema(auditMilestones).omit({
  id: true,
  createdAt: true,
});

export const insertAuditRiskSchema = createInsertSchema(auditRisks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditTestSchema = createInsertSchema(auditTests).omit({
  id: true,
  code: true,
  createdAt: true,
  updatedAt: true,
});

export const updateAuditTestSchema = createInsertSchema(auditTests).omit({
  id: true,
  code: true,
  auditId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertAuditAttachmentSchema = createInsertSchema(auditAttachments).omit({
  id: true,
  code: true,
  uploadedAt: true,
});

export const insertAuditReviewCommentSchema = createInsertSchema(auditReviewComments).omit({
  id: true,
  createdAt: true,
});

export const insertAuditNotificationSchema = createInsertSchema(auditNotifications).omit({
  id: true,
  createdAt: true,
});

// Insert schemas para sistema de adjuntos de audit tests con codificación jerárquica
export const insertAuditTestAttachmentSchema = createInsertSchema(auditTestAttachments).omit({
  id: true,
  uploadedAt: true,
  updatedAt: true,
}).extend({
  category: z.enum(["evidence", "workpaper", "reference", "communication", "regulation"]),
  fileSize: z.coerce.number().min(1, "File size must be greater than 0"),
  fileName: z.string().min(1, "File name is required"),
  originalFileName: z.string().min(1, "Original file name is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  attachmentCode: z.string().regex(/^AT-[0-9]{3}-DOC-[0-9]{3}$/, "Attachment code must follow format AT-###-DOC-###"),
  storageUrl: z.string().url("Storage URL must be valid"),
  objectPath: z.string().min(1, "Object path is required"),
  tags: z.array(z.string()).default([]),
});

export const insertAuditAttachmentCodeSequenceSchema = createInsertSchema(auditAttachmentCodeSequences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  testSequenceNumber: z.coerce.number().min(1).max(999),
  lastDocumentNumber: z.coerce.number().min(0).max(999),
  prefix: z.string().default("AT"),
  format: z.string().default("AT-{test}-DOC-{doc}"),
});

// Insert schemas para compliance
export const insertRegulationSchema = createInsertSchema(regulations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRegulationApplicabilitySchema = createInsertSchema(regulationApplicability).omit({
  id: true,
  createdAt: true,
});

export const insertRiskRegulationSchema = createInsertSchema(riskRegulations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertComplianceTestSchema = createInsertSchema(complianceTests).omit({
  id: true,
  code: true,
  createdAt: true,
  updatedAt: true,
});

export const insertComplianceTestControlSchema = createInsertSchema(complianceTestControls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Insert schemas para nuevas tablas de programa de trabajo de auditoría

export const insertAuditTestWorkLogSchema = createInsertSchema(auditTestWorkLogs).omit({
  id: true,
  createdAt: true,
}).extend({
  entryDate: z.coerce.date(), // Accept string/date and convert to Date
  hoursWorked: z.coerce.number().min(0).max(24), // Accept number and convert to string internally
});

export const insertAuditCodeSequenceSchema = createInsertSchema(auditCodeSequences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Insert schemas para sistema de notificaciones
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationQueueSchema = createInsertSchema(notificationQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationStatsSchema = createInsertSchema(notificationStats).omit({
  id: true,
  createdAt: true,
});

// Additional validation schemas for audit scope endpoints
export const auditScopeSelectionsSchema = z.object({
  selections: z.array(z.object({
    entityType: z.string(),
    entityId: z.string(),
    scope: z.string(),
    isIncluded: z.boolean()
  }))
});

export const auditScopeInitializeSchema = z.object({
  entityType: z.enum(['risks', 'controls', 'processes', 'subprocesses']),
  entityIds: z.array(z.string())
});

export const auditGenerateTestsSchema = z.object({
  scopeSelections: z.array(z.object({
    riskId: z.string(),
    controlId: z.string().optional(),
    isSelected: z.boolean()
  }))
});

// Types para auditoría
export type AuditPlan = typeof auditPlans.$inferSelect;
export type InsertAuditPlan = z.infer<typeof insertAuditPlanSchema>;

export type Audit = typeof audits.$inferSelect;
export type InsertAudit = z.infer<typeof insertAuditSchema>;

export type AuditScopeVersion = typeof auditScopeVersions.$inferSelect;
export type InsertAuditScopeVersion = z.infer<typeof insertAuditScopeVersionSchema>;

export type AuditCriterion = typeof auditCriteria.$inferSelect;
export type InsertAuditCriterion = z.infer<typeof insertAuditCriterionSchema>;

export type AuditScope = typeof auditScope.$inferSelect;
export type InsertAuditScope = z.infer<typeof insertAuditScopeSchema>;

export type AuditProgram = typeof auditPrograms.$inferSelect;
export type InsertAuditProgram = z.infer<typeof insertAuditProgramSchema>;

export type AuditFinding = typeof auditFindings.$inferSelect;
export type InsertAuditFinding = z.infer<typeof insertAuditFindingSchema>;

export type FindingFollowUp = typeof findingFollowUps.$inferSelect;
export type InsertFindingFollowUp = z.infer<typeof insertFindingFollowUpSchema>;

export type WorkingPaper = typeof workingPapers.$inferSelect;
export type InsertWorkingPaper = z.infer<typeof insertWorkingPaperSchema>;

export type AuditControlEvaluation = typeof auditControlEvaluations.$inferSelect;
export type InsertAuditControlEvaluation = z.infer<typeof insertAuditControlEvaluationSchema>;

export type AuditRiskEvaluation = typeof auditRiskEvaluations.$inferSelect;
export type InsertAuditRiskEvaluation = z.infer<typeof insertAuditRiskEvaluationSchema>;

export type AuditReport = typeof auditReports.$inferSelect;
export type InsertAuditReport = z.infer<typeof insertAuditReportSchema>;

export type AuditControl = typeof auditControls.$inferSelect;
export type InsertAuditControl = z.infer<typeof insertAuditControlSchema>;

// Types para sistema de adjuntos de audit tests con codificación jerárquica
export type AuditTestAttachment = typeof auditTestAttachments.$inferSelect;
export type InsertAuditTestAttachment = z.infer<typeof insertAuditTestAttachmentSchema>;

export type AuditAttachmentCodeSequence = typeof auditAttachmentCodeSequences.$inferSelect;
export type InsertAuditAttachmentCodeSequence = z.infer<typeof insertAuditAttachmentCodeSequenceSchema>;

// Extended types para consultas con joins
export type AuditWithDetails = Audit & {
  plan?: AuditPlan;
  process?: Process;
  subproceso?: Subproceso;
  regulation?: Regulation;
  leadAuditorDetails?: User;
  programs: AuditProgram[];
  findings: AuditFinding[];
  reports: AuditReport[];
  auditControls: (AuditControl & { control: Control; risk?: Risk })[];
};

export type AuditFindingWithDetails = AuditFinding & {
  audit?: Audit;
  risk?: Risk;
  control?: Control;
  followUps: FindingFollowUp[];
};

// Extended types para audit test attachments con joins
export type AuditTestAttachmentWithDetails = AuditTestAttachment & {
  auditTest?: {
    id: string;
    code: string;
    name: string;
    status: string;
    progress: number;
  };
  uploadedByUser?: {
    id: string;
    fullName: string;
    email: string;
  };
};

export type AuditTestWithAttachments = {
  id: string;
  code: string;
  name: string;
  status: string;
  progress: number;
  attachments: AuditTestAttachment[];
  attachmentCodeSequence?: AuditAttachmentCodeSequence;
};

// Types para compliance
export type Regulation = typeof regulations.$inferSelect;
export type InsertRegulation = z.infer<typeof insertRegulationSchema>;

export type RegulationApplicability = typeof regulationApplicability.$inferSelect;
export type InsertRegulationApplicability = z.infer<typeof insertRegulationApplicabilitySchema>;

export type RiskRegulation = typeof riskRegulations.$inferSelect;
export type InsertRiskRegulation = z.infer<typeof insertRiskRegulationSchema>;

export type ComplianceTest = typeof complianceTests.$inferSelect;
export type InsertComplianceTest = z.infer<typeof insertComplianceTestSchema>;

export type ComplianceTestControl = typeof complianceTestControls.$inferSelect;
export type InsertComplianceTestControl = z.infer<typeof insertComplianceTestControlSchema>;

// Extended types para compliance con joins
export type RegulationWithDetails = Regulation & {
  associatedRisks: (RiskRegulation & { risk: Risk })[];
  complianceTests: ComplianceTest[];
  createdByUser?: User;
  updatedByUser?: User;
};

export type RiskRegulationWithDetails = RiskRegulation & {
  regulation: Regulation;
  risk: Risk;
  assessedByUser?: User;
};

export type ComplianceTestWithDetails = ComplianceTest & {
  regulation: Regulation;
  leadAuditorDetails?: User;
  auditTeamDetails: User[];
  testedControls: (ComplianceTestControl & { 
    control: Control; 
    risk?: Risk;
    testedByUser: User;
    responsiblePersonDetails?: User;
  })[];
  createdByUser?: User;
};

export type ComplianceTestControlWithDetails = ComplianceTestControl & {
  complianceTest: ComplianceTest;
  control: Control;
  risk?: Risk;
  testedByUser: User;
  responsiblePersonDetails?: User;
};

// Types
export type Macroproceso = typeof macroprocesos.$inferSelect;
export type InsertMacroproceso = z.infer<typeof insertMacroprocesoSchema>;
export type UpdateMacroproceso = z.infer<typeof updateMacroprocesoSchema>;

export type Process = typeof processes.$inferSelect;
export type InsertProcess = z.infer<typeof insertProcessSchema>;

export type Subproceso = typeof subprocesos.$inferSelect;
export type InsertSubproceso = z.infer<typeof insertSubprocesoSchema>;

export type ControlEvaluationCriteria = typeof controlEvaluationCriteria.$inferSelect;
export type InsertControlEvaluationCriteria = z.infer<typeof insertControlEvaluationCriteriaSchema>;

export type ControlEvaluationOptions = typeof controlEvaluationOptions.$inferSelect;
export type InsertControlEvaluationOptions = z.infer<typeof insertControlEvaluationOptionsSchema>;

export type ControlEvaluation = typeof controlEvaluations.$inferSelect;
export type InsertControlEvaluation = z.infer<typeof insertControlEvaluationSchema>;

export type Risk = typeof risks.$inferSelect;
export type InsertRisk = z.infer<typeof insertRiskSchema>;

export type Control = typeof controls.$inferSelect;
export type InsertControl = z.infer<typeof insertControlSchema>;

export type ControlAssessmentHistory = typeof controlAssessmentHistory.$inferSelect;
export type InsertControlAssessmentHistory = z.infer<typeof insertControlAssessmentHistorySchema>;

export type RiskControl = typeof riskControls.$inferSelect;
export type InsertRiskControl = z.infer<typeof insertRiskControlSchema>;

// ============= TIPOS PARA REVALIDACIÓN =============

export type ControlOwner = typeof controlOwners.$inferSelect;
export type InsertControlOwner = z.infer<typeof insertControlOwnerSchema>;

export type Revalidation = typeof revalidations.$inferSelect;
export type InsertRevalidation = z.infer<typeof insertRevalidationSchema>;

export type RevalidationPolicy = typeof revalidationPolicies.$inferSelect;
export type InsertRevalidationPolicy = z.infer<typeof insertRevalidationPolicySchema>;

export type ActionPlanRisk = typeof actionPlanRisks.$inferSelect;
export type InsertActionPlanRisk = z.infer<typeof insertActionPlanRiskSchema>;

export type ActionPlanAttachment = typeof actionPlanAttachments.$inferSelect;
export type InsertActionPlanAttachment = z.infer<typeof insertActionPlanAttachmentSchema>;

export type ActionEvidence = typeof actionEvidence.$inferSelect;
export type InsertActionEvidence = z.infer<typeof insertActionEvidenceSchema>;

export type ActionPlanAccessToken = typeof actionPlanAccessTokens.$inferSelect;
export type InsertActionPlanAccessToken = z.infer<typeof insertActionPlanAccessTokenSchema>;

export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;

export type FiscalEntity = typeof fiscalEntities.$inferSelect;
export type InsertFiscalEntity = z.infer<typeof insertFiscalEntitySchema>;

export type MacroprocesoFiscalEntity = typeof macroprocesoFiscalEntities.$inferSelect;
export type InsertMacroprocesoFiscalEntity = z.infer<typeof insertMacroprocesoFiscalEntitySchema>;

export type ProcessFiscalEntity = typeof processFiscalEntities.$inferSelect;
export type InsertProcessFiscalEntity = z.infer<typeof insertProcessFiscalEntitySchema>;

export type Gerencia = typeof gerencias.$inferSelect;
export type InsertGerencia = z.infer<typeof insertGerenciaSchema>;

export type ProcessGerencia = typeof processGerencias.$inferSelect;
export type InsertProcessGerencia = z.infer<typeof insertProcessGerenciaSchema>;

export type MacroprocesoGerencia = typeof macroprocesoGerencias.$inferSelect;
export type InsertMacroprocesoGerencia = z.infer<typeof insertMacroprocesoGerenciaSchema>;

export type SubprocesoGerencia = typeof subprocesoGerencias.$inferSelect;
export type InsertSubprocesoGerencia = z.infer<typeof insertSubprocesoGerenciaSchema>;

export type RiskCategory = typeof riskCategories.$inferSelect;
export type InsertRiskCategory = z.infer<typeof insertRiskCategorySchema>;

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;

export type RiskSnapshot = typeof riskSnapshots.$inferSelect;
export type InsertRiskSnapshot = z.infer<typeof insertRiskSnapshotSchema>;

// Extended types for joined queries
export type RiskWithProcess = Risk & {
  process?: Process;
  subproceso?: Subproceso;
  macroproceso?: Macroproceso;
  controls: (RiskControl & { control: Control })[];
  actions: Action[]; // Changed from actionPlans (deprecated) to actions (unified table)
};

export type ProcessWithRisks = Process & {
  risks: Risk[];
  subprocesos: Subproceso[];
};

export type MacroprocesoWithProcesses = Macroproceso & {
  processes: ProcessWithRisks[];
};

export type SubprocesoWithRisks = Subproceso & {
  risks: Risk[];
};

// ============= GESTIÓN DE EQUIPO DE AUDITORÍA =============

// Roles específicos de auditoría (diferentes a los roles generales del sistema)
export const auditorRoles = pgTable("auditor_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // auditor, supervisor, jefe, gerente
  description: text("description"),
  level: integer("level").notNull(), // 1=auditor, 2=supervisor, 3=jefe, 4=gerente
  hourlyRate: integer("hourly_rate"), // Tarifa por hora opcional
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Miembros del equipo de auditoría
export const auditTeamMembers = pgTable("audit_team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  auditorRoleId: varchar("auditor_role_id").notNull().references(() => auditorRoles.id),
  employeeCode: text("employee_code").unique(), // Código de empleado interno
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  department: text("department"), // Departamento al que pertenece
  position: text("position"), // Cargo/posición
  hireDate: timestamp("hire_date"), // Fecha de contratación
  certifications: text("certifications").array().default([]), // Certificaciones profesionales
  specializations: text("specializations").array().default([]), // Especializaciones de auditoría
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Disponibilidad de horas por auditor (configuración base)
export const auditorAvailability = pgTable("auditor_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamMemberId: varchar("team_member_id").notNull().references(() => auditTeamMembers.id),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  totalWorkingDays: integer("total_working_days").notNull(), // Días laborables en el mes
  totalWorkingHours: integer("total_working_hours").notNull(), // Horas disponibles base
  availableHours: integer("available_hours").notNull(), // Horas disponibles tras descuentos
  allocatedHours: integer("allocated_hours").notNull().default(0), // Horas ya asignadas a auditorías
  remainingHours: integer("remaining_hours").notNull(), // Horas restantes disponibles
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Descuentos de horas (vacaciones, licencias médicas, permisos, etc.)
export const auditorTimeDeductions = pgTable("auditor_time_deductions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamMemberId: varchar("team_member_id").notNull().references(() => auditTeamMembers.id),
  type: text("type").notNull(), // vacation, medical_leave, personal_leave, training, other
  reason: text("reason").notNull(), // Motivo específico del descuento
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalDays: integer("total_days").notNull(), // Total de días de descuento
  totalHours: integer("total_hours").notNull(), // Total de horas descontadas
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  comments: text("comments"), // Comentarios adicionales
  documentReference: text("document_reference"), // Referencia a documento justificativo
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas para gestión de equipo
export const insertAuditorRoleSchema = createInsertSchema(auditorRoles).omit({
  id: true,
  createdAt: true,
});

export const insertAuditTeamMemberSchema = createInsertSchema(auditTeamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditorAvailabilitySchema = createInsertSchema(auditorAvailability).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditorTimeDeductionSchema = createInsertSchema(auditorTimeDeductions).omit({
  id: true,
  createdAt: true,
});

// Types para gestión de equipo
export type AuditorRole = typeof auditorRoles.$inferSelect;
export type InsertAuditorRole = z.infer<typeof insertAuditorRoleSchema>;

export type AuditTeamMember = typeof auditTeamMembers.$inferSelect;
export type InsertAuditTeamMember = z.infer<typeof insertAuditTeamMemberSchema>;

export type AuditorAvailability = typeof auditorAvailability.$inferSelect;
export type InsertAuditorAvailability = z.infer<typeof insertAuditorAvailabilitySchema>;

export type AuditorTimeDeduction = typeof auditorTimeDeductions.$inferSelect;
export type InsertAuditorTimeDeduction = z.infer<typeof insertAuditorTimeDeductionSchema>;

// Extended types para consultas con joins
export type AuditTeamMemberWithDetails = AuditTeamMember & {
  user?: User;
  auditorRole?: AuditorRole;
  availability: AuditorAvailability[];
  timeDeductions: AuditorTimeDeduction[];
};

export type AuditorAvailabilityWithDetails = AuditorAvailability & {
  teamMember?: AuditTeamMemberWithDetails;
  deductions: AuditorTimeDeduction[];
};

// ============= PLANIFICACIÓN BASADA EN RIESGO =============

// Universo de Auditoría - Define qué procesos/subprocesos deben ser considerados para auditoría
export const auditUniverse = pgTable("audit_universe", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  macroprocesoId: varchar("macroproceso_id").references(() => macroprocesos.id),
  processId: varchar("process_id").references(() => processes.id),
  subprocesoId: varchar("subproceso_id"), // Sin FK - puede ser proceso o macroproceso ID cuando actúan como subproceso
  auditableEntity: text("auditable_entity").notNull(), // Nombre de la entidad auditable (proceso o subproceso)
  entityType: text("entity_type").notNull(), // "process" o "subproceso"
  isActive: boolean("is_active").notNull().default(true), // Si debe considerarse en la planificación
  mandatoryAudit: boolean("mandatory_audit").notNull().default(false), // Si es auditoría obligatoria (regulatoria)
  auditFrequency: integer("audit_frequency").notNull().default(3), // Frecuencia en años (cada cuántos años debe auditarse)
  lastAuditDate: timestamp("last_audit_date"), // Última vez que se auditó
  nextScheduledAudit: timestamp("next_scheduled_audit"), // Próxima auditoría programada
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Factores de Priorización para cada entidad del universo de auditoría
export const auditPrioritizationFactors = pgTable("audit_prioritization_factors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  universeId: varchar("universe_id").notNull().references(() => auditUniverse.id),
  planId: varchar("plan_id").notNull().references(() => auditPlans.id), // Para que sea específico por plan anual

  // Factores de priorización según criterios específicos
  riskScore: integer("risk_score").notNull().default(0), // Resultado del scoring de riesgo residual (0-100)
  previousAuditResult: text("previous_audit_result").default("ninguna"), // Resultado auditoría anterior: "buena", "regular", "mala", "ninguna"
  strategicPriority: integer("strategic_priority").notNull().default(1), // Prioridad estratégica del proceso (1-3)
  fraudHistory: boolean("fraud_history").notNull().default(false), // Si ha habido fraude en el proceso
  regulatoryRequirement: boolean("regulatory_requirement").notNull().default(false), // Si hay requerimiento legal
  managementRequest: boolean("management_request").notNull().default(false), // Si fue solicitado por directorio/alta administración
  timesSinceLastAudit: integer("times_since_last_audit").notNull().default(0), // Años desde última auditoría
  auditComplexity: integer("audit_complexity").notNull().default(50), // Complejidad estimada (0-100)

  // Puntaje final calculado
  totalPriorityScore: integer("total_priority_score").notNull().default(0), // Puntaje final (0-1000)
  calculatedRanking: integer("calculated_ranking").default(0), // Ranking calculado en el plan

  // Horas estimadas para la auditoría
  estimatedAuditHours: integer("estimated_audit_hours").notNull().default(40), // Horas estimadas

  // Comentarios y justificaciones
  riskJustification: text("risk_justification"), // Justificación del puntaje de riesgo
  changesDescription: text("changes_description"), // Descripción de cambios en el proceso
  strategicJustification: text("strategic_justification"), // Justificación de importancia estratégica

  calculatedAt: timestamp("calculated_at").defaultNow(), // Cuándo se calculó
  calculatedBy: varchar("calculated_by").notNull().references(() => users.id),
  isApproved: boolean("is_approved").notNull().default(false), // Si el cálculo fue aprobado
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Items del Plan de Auditoría con priorización
export const auditPlanItems = pgTable("audit_plan_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull().references(() => auditPlans.id),
  universeId: varchar("universe_id").notNull().references(() => auditUniverse.id),
  prioritizationId: varchar("prioritization_id").notNull().references(() => auditPrioritizationFactors.id),

  // Estado en el plan
  status: text("status").notNull().default("proposed"), // proposed, selected, scheduled, excluded
  selectionReason: text("selection_reason"), // Razón de selección o exclusión

  // Programación
  plannedQuarter: integer("planned_quarter"), // Trimestre planificado (1-4)
  plannedMonth: integer("planned_month"), // Mes planificado (1-12)
  estimatedDuration: integer("estimated_duration").notNull().default(40), // Duración en horas

  // Asignación de equipo
  proposedLeadAuditor: varchar("proposed_lead_auditor").references(() => users.id),
  proposedTeamMembers: text("proposed_team_members").array().default([]), // Array de user IDs

  // Justificación de inclusión/exclusión
  inclusionJustification: text("inclusion_justification"),
  riskMitigationApproach: text("risk_mitigation_approach"), // Si se excluye, cómo se mitiga el riesgo

  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Configuración de capacidad del equipo para el plan
export const auditPlanCapacity = pgTable("audit_plan_capacity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull().references(() => auditPlans.id),

  // Capacidad total del equipo
  totalAvailableHours: integer("total_available_hours").notNull(), // Total de horas disponibles en el año
  allocatedHours: integer("allocated_hours").notNull().default(0), // Horas ya asignadas
  reservedHours: integer("reserved_hours").notNull().default(0), // Horas reservadas (contingencia, vacaciones, etc.)

  // Distribución por trimestre
  q1AvailableHours: integer("q1_available_hours").notNull().default(0),
  q2AvailableHours: integer("q2_available_hours").notNull().default(0),
  q3AvailableHours: integer("q3_available_hours").notNull().default(0),
  q4AvailableHours: integer("q4_available_hours").notNull().default(0),

  q1AllocatedHours: integer("q1_allocated_hours").notNull().default(0),
  q2AllocatedHours: integer("q2_allocated_hours").notNull().default(0),
  q3AllocatedHours: integer("q3_allocated_hours").notNull().default(0),
  q4AllocatedHours: integer("q4_allocated_hours").notNull().default(0),

  // Configuración de cálculo automático
  contingencyPercentage: integer("contingency_percentage").notNull().default(15), // % de contingencia
  targetUtilization: integer("target_utilization").notNull().default(85), // % de utilización objetivo

  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas para planificación
export const insertAuditUniverseSchema = createInsertSchema(auditUniverse).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditPrioritizationFactorsSchema = createInsertSchema(auditPrioritizationFactors).omit({
  id: true,
  calculatedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditPlanItemSchema = createInsertSchema(auditPlanItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditPlanCapacitySchema = createInsertSchema(auditPlanCapacity).omit({
  id: true,
  calculatedAt: true,
  createdAt: true,
  updatedAt: true,
});

// Types para planificación
export type AuditUniverse = typeof auditUniverse.$inferSelect;
export type InsertAuditUniverse = z.infer<typeof insertAuditUniverseSchema>;

export type AuditPrioritizationFactors = typeof auditPrioritizationFactors.$inferSelect;
export type InsertAuditPrioritizationFactors = z.infer<typeof insertAuditPrioritizationFactorsSchema>;

export type AuditPlanItem = typeof auditPlanItems.$inferSelect;
export type InsertAuditPlanItem = z.infer<typeof insertAuditPlanItemSchema>;

export type AuditPlanCapacity = typeof auditPlanCapacity.$inferSelect;
export type InsertAuditPlanCapacity = z.infer<typeof insertAuditPlanCapacitySchema>;

// Extended types para consultas con joins de planificación
export type AuditUniverseWithDetails = AuditUniverse & {
  macroproceso: Macroproceso;
  process?: Process;
  subproceso?: Subproceso;
  prioritizationFactors?: AuditPrioritizationFactors[];
  calculatedRisks?: Risk[];
  hierarchicalPath: string; // Ruta jerárquica completa (e.g., "Gestión Financiera > Contabilidad > Cierre Mensual")
};

export type AuditPlanItemWithDetails = AuditPlanItem & {
  universe: AuditUniverseWithDetails;
  prioritization: AuditPrioritizationFactors;
  plan: AuditPlan;
  proposedLeadAuditorUser?: User;
};

// Types para el sistema expandido de auditoría
export type AuditTest = typeof auditTests.$inferSelect;
export type InsertAuditTest = z.infer<typeof insertAuditTestSchema>;
export type UpdateAuditTest = z.infer<typeof updateAuditTestSchema>;

export type AuditAttachment = typeof auditAttachments.$inferSelect;
export type InsertAuditAttachment = z.infer<typeof insertAuditAttachmentSchema>;

export type AuditReviewComment = typeof auditReviewComments.$inferSelect;
export type InsertAuditReviewComment = z.infer<typeof insertAuditReviewCommentSchema>;

export type AuditMilestone = typeof auditMilestones.$inferSelect;
export type InsertAuditMilestone = z.infer<typeof insertAuditMilestoneSchema>;

export type AuditRisk = typeof auditRisks.$inferSelect;
export type InsertAuditRisk = z.infer<typeof insertAuditRiskSchema>;

export type AuditNotification = typeof auditNotifications.$inferSelect;
export type InsertAuditNotification = z.infer<typeof insertAuditNotificationSchema>;

// Types para nuevas tablas de programa de trabajo de auditoría

export type AuditTestWorkLog = typeof auditTestWorkLogs.$inferSelect;
export type InsertAuditTestWorkLog = z.infer<typeof insertAuditTestWorkLogSchema>;

export type AuditCodeSequence = typeof auditCodeSequences.$inferSelect;
export type InsertAuditCodeSequence = z.infer<typeof insertAuditCodeSequenceSchema>;

// Extended types para consultas con joins del sistema expandido
export type AuditTestWithDetails = AuditTest & {
  audit: Audit;
  program?: AuditProgram;
  risk?: Risk; // Official risk
  auditRisk?: AuditRisk; // Ad-hoc risk
  control?: Control;
  assignedToUser: User;
  reviewedByUser?: User;
  createdByUser: User;
  attachments?: AuditAttachment[];
  comments?: AuditReviewComment[];
};

export type AuditAttachmentWithDetails = AuditAttachment & {
  audit?: Audit;
  test?: AuditTest;
  finding?: AuditFinding;
  program?: AuditProgram;
  workingPaper?: WorkingPaper;
  uploadedByUser: User;
};

export type AuditWithProjectDetails = Audit & {
  plan?: AuditPlan;
  process?: Process;
  subproceso?: Subproceso;
  leadAuditorUser: User;
  createdByUser: User;
  programs?: AuditProgram[];
  tests?: AuditTestWithDetails[];
  findings?: AuditFinding[];
  milestones?: AuditMilestone[];
  attachments?: AuditAttachment[];
};

// ============= GESTIÓN DOCUMENTAL DE CUMPLIMIENTO =============

// Documentos de Cumplimiento - Gestión de leyes, oficios, circulares, políticas, procedimientos, etc.
export const complianceDocuments = pgTable("compliance_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  internalCode: text("internal_code").notNull(), // Código interno personalizable
  name: text("name").notNull(), // Nombre del documento
  macroprocesoId: varchar("macroproceso_id").references(() => macroprocesos.id), // Macroproceso al que pertenece (null si aplica a todos)
  appliesToAllMacroprocesos: boolean("applies_to_all_macroprocesos").notNull().default(false), // Si aplica a todos los macroprocesos
  issuingOrganization: text("issuing_organization").notNull(), // Tipo de organismo emisor
  publicationDate: timestamp("publication_date").notNull(), // Fecha de publicación
  classification: text("classification").notNull(), // Clasificación del documento
  description: text("description"), // Descripción del documento
  documentUrl: text("document_url"), // URL del documento si es externo
  fileName: text("file_name"), // Nombre del archivo adjunto
  originalFileName: text("original_file_name"), // Nombre original del archivo
  fileSize: integer("file_size"), // Tamaño en bytes
  mimeType: text("mime_type"), // Tipo MIME del archivo
  objectPath: text("object_path"), // Ruta en object storage
  isActive: boolean("is_active").notNull().default(true),
  tags: text("tags").array().default([]), // Etiquetas para búsqueda
  createdBy: varchar("created_by").notNull().references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Índice único para códigos internos activos
  uniqueActiveCode: {
    columns: [table.internalCode],
    name: "unique_active_internal_code",
    where: sql`${table.isActive} = true`
  },
}));

// Insert schemas para documentos de cumplimiento
export const insertComplianceDocumentSchema = createInsertSchema(complianceDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types para documentos de cumplimiento
export type ComplianceDocument = typeof complianceDocuments.$inferSelect;
export type InsertComplianceDocument = z.infer<typeof insertComplianceDocumentSchema>;

export type ComplianceDocumentWithDetails = ComplianceDocument & {
  createdByUser: User;
  updatedByUser?: User;
};

// Types para sistema de notificaciones
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;

export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type InsertNotificationTemplate = z.infer<typeof insertNotificationTemplateSchema>;

export type NotificationQueue = typeof notificationQueue.$inferSelect;
export type InsertNotificationQueue = z.infer<typeof insertNotificationQueueSchema>;

export type NotificationStats = typeof notificationStats.$inferSelect;
export type InsertNotificationStats = z.infer<typeof insertNotificationStatsSchema>;

// ============= SISTEMA DE ANALYTICS Y REPORTES AVANZADOS =============

// Analytics Agregadas para Performance de Auditores
// ============= SISTEMA COMPLETO DE GENERACIÓN AUTOMÁTICA DE AUDIT TESTS =============

// Template Categories - Categorización de plantillas por tipo de riesgo
export const auditTestTemplateCategories = pgTable("audit_test_template_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // ej: "Financial Risks", "Operational Risks"
  code: text("code").notNull().unique(), // ej: "FIN", "OPS", "COMP"
  description: text("description"),
  color: text("color").default("#6b7280"), // Color hex para identificación visual
  riskTypes: text("risk_types").array().default([]), // Tipos de riesgo que maneja esta categoría
  order: integer("order").notNull().default(0), // Orden de presentación
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  templateCategoriesOrderIdx: index("template_categories_order_idx").on(table.order),
  templateCategoriesActiveIdx: index("template_categories_active_idx").on(table.isActive)
}));

// Audit Test Templates - Plantillas base para diferentes tipos de riesgos
export const auditTestTemplates = pgTable("audit_test_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull().unique(), // Código único de la plantilla
  categoryId: varchar("category_id").notNull().references(() => auditTestTemplateCategories.id),

  // Risk Classification
  riskCategory: text("risk_category").notNull(), // financial, operational, compliance, strategic, reputational, it_security
  riskTypes: text("risk_types").array().default([]), // Tipos específicos de riesgo que cubre
  complexityLevel: text("complexity_level").notNull(), // simple, moderate, complex, highly_complex
  auditScope: text("audit_scope").notNull(), // substantive, controls, hybrid

  // Template Content
  objective: text("objective").notNull(), // Objetivo del test de auditoría
  scope: text("scope").notNull(), // Alcance del test
  description: text("description"),

  // Test Structure
  proceduresCount: integer("procedures_count").notNull().default(0), // Número de procedimientos
  evidenceTypes: text("evidence_types").array().default([]), // documentary, observational, inquiry, analytical
  testingMethods: text("testing_methods").array().default([]), // sampling, walkthrough, substantive, controls_testing

  // Resource Requirements
  skillsRequired: text("skills_required").array().default([]), // Habilidades requeridas
  estimatedHours: integer("estimated_hours").notNull(), // Horas estimadas
  toolsNeeded: text("tools_needed").array().default([]), // Herramientas necesarias

  // Quality Assurance
  reviewLevel: text("review_level").notNull().default("standard"), // basic, standard, enhanced, expert
  approvalRequired: boolean("approval_required").notNull().default(false),

  // Template Configuration
  isCustomizable: boolean("is_customizable").notNull().default(true),
  allowProcedureModification: boolean("allow_procedure_modification").notNull().default(true),

  // Usage Statistics
  usageCount: integer("usage_count").notNull().default(0),
  successRate: numeric("success_rate", { precision: 5, scale: 2 }).default("0"), // 0-100%
  avgTimeToComplete: integer("avg_time_to_complete"), // Tiempo promedio en horas

  // Metadata
  version: text("version").notNull().default("1.0"),
  tags: text("tags").array().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  templatesNameIdx: index("templates_name_idx").on(table.name),
  templatesCategoryIdx: index("templates_category_idx").on(table.categoryId),
  templatesRiskCategoryIdx: index("templates_risk_category_idx").on(table.riskCategory),
  templatesComplexityIdx: index("templates_complexity_idx").on(table.complexityLevel),
  templatesActiveIdx: index("templates_active_idx").on(table.isActive),
  templatesUsageIdx: index("templates_usage_idx").on(table.usageCount),
  complexityValidation: sql`CHECK (${table.complexityLevel} IN ('simple', 'moderate', 'complex', 'highly_complex'))`,
  scopeValidation: sql`CHECK (${table.auditScope} IN ('substantive', 'controls', 'hybrid'))`,
  reviewLevelValidation: sql`CHECK (${table.reviewLevel} IN ('basic', 'standard', 'enhanced', 'expert'))`,
  hoursCheck: sql`CHECK (${table.estimatedHours} > 0)`,
  successRateCheck: sql`CHECK (${table.successRate} >= 0 AND ${table.successRate} <= 100)`
}));

// Template Procedures - Procedimientos detallados para cada plantilla
export const templateProcedures = pgTable("template_procedures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => auditTestTemplates.id),

  // Procedure Structure
  stepNumber: integer("step_number").notNull(),
  procedureText: text("procedure_text").notNull(),
  expectedOutcome: text("expected_outcome").notNull(),

  // Procedure Classification
  evidenceType: text("evidence_type").notNull(), // documentary, observational, inquiry, analytical
  testingMethod: text("testing_method").notNull(), // sampling, walkthrough, substantive, controls_testing
  category: text("category").notNull().default("general"), // preparation, execution, conclusion, follow_up

  // Requirements
  skillLevel: text("skill_level").notNull().default("intermediate"), // basic, intermediate, advanced, expert
  estimatedMinutes: integer("estimated_minutes").notNull(),
  toolsRequired: text("tools_required").array().default([]),

  // Flexibility
  isMandatory: boolean("is_mandatory").notNull().default(true),
  isCustomizable: boolean("is_customizable").notNull().default(true),
  alternativeProcedures: text("alternative_procedures").array().default([]),

  // Guidance
  guidance: text("guidance"), // Guía adicional para ejecutar el procedimiento
  commonIssues: text("common_issues").array().default([]), // Problemas comunes y cómo resolverlos
  evidenceRequirements: text("evidence_requirements"), // Qué evidencia específica se debe obtener

  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  proceduresTemplateIdx: index("procedures_template_idx").on(table.templateId),
  proceduresStepIdx: index("procedures_step_idx").on(table.stepNumber),
  proceduresOrderIdx: index("procedures_order_idx").on(table.order),
  proceduresEvidenceTypeIdx: index("procedures_evidence_type_idx").on(table.evidenceType),
  proceduresMethodIdx: index("procedures_method_idx").on(table.testingMethod),
  proceduresTemplateOrderIdx: index("procedures_template_order_idx").on(table.templateId, table.order),
  uniqueTemplateStep: { columns: [table.templateId, table.stepNumber], name: "unique_template_step" },
  evidenceTypeValidation: sql`CHECK (${table.evidenceType} IN ('documentary', 'observational', 'inquiry', 'analytical'))`,
  methodValidation: sql`CHECK (${table.testingMethod} IN ('sampling', 'walkthrough', 'substantive', 'controls_testing'))`,
  categoryValidation: sql`CHECK (${table.category} IN ('preparation', 'execution', 'conclusion', 'follow_up'))`,
  skillLevelValidation: sql`CHECK (${table.skillLevel} IN ('basic', 'intermediate', 'advanced', 'expert'))`,
  minutesCheck: sql`CHECK (${table.estimatedMinutes} > 0)`,
  stepCheck: sql`CHECK (${table.stepNumber} > 0)`
}));

// Risk Analysis Profiles - Perfiles de análisis de riesgos generados
export const riskAnalysisProfiles = pgTable("risk_analysis_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riskId: varchar("risk_id").notNull().references(() => risks.id),

  // Analysis Results
  riskCategory: text("risk_category").notNull(), // financial, operational, compliance, strategic, reputational, it_security
  complexity: text("complexity").notNull(), // simple, moderate, complex, highly_complex
  auditScope: text("audit_scope").notNull(), // substantive, controls, hybrid
  priority: text("priority").notNull(), // low, medium, high, critical

  // Control Environment Assessment
  controlEnvironment: text("control_environment").notNull(), // strong, adequate, weak, deficient
  controlGaps: text("control_gaps").array().default([]), // Gaps identificados en controles
  controlStrength: integer("control_strength").notNull(), // 1-10 score

  // Test Requirements
  requiredSkills: text("required_skills").array().default([]), // Habilidades específicas requeridas
  estimatedHours: integer("estimated_hours").notNull(), // Horas estimadas para el test
  toolsNeeded: text("tools_needed").array().default([]), // Herramientas necesarias

  // Risk-Specific Factors
  inherentRiskScore: integer("inherent_risk_score").notNull(),
  residualRiskScore: numeric("residual_risk_score", { precision: 5, scale: 2 }),
  riskTrend: text("risk_trend").notNull().default("stable"), // increasing, stable, decreasing
  historicalIssues: text("historical_issues").array().default([]), // Problemas históricos identificados

  // Regulatory Requirements
  regulatoryRequirements: text("regulatory_requirements").array().default([]),
  complianceLevel: text("compliance_level").notNull().default("standard"), // basic, standard, enhanced, strict

  // AI/ML Analysis
  confidenceScore: numeric("confidence_score", { precision: 5, scale: 2 }).default("0"), // 0-100% confianza del análisis
  analysisMethod: text("analysis_method").notNull().default("rule_based"), // rule_based, ml_based, hybrid
  recommendedTemplates: text("recommended_templates").array().default([]), // IDs de templates recomendadas

  // Metadata
  analyzedBy: varchar("analyzed_by").references(() => users.id), // Usuario o sistema que realizó el análisis
  analysisVersion: text("analysis_version").notNull().default("1.0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  profilesRiskIdx: index("profiles_risk_idx").on(table.riskId),
  profilesCategoryIdx: index("profiles_category_idx").on(table.riskCategory),
  profilesComplexityIdx: index("profiles_complexity_idx").on(table.complexity),
  profilesPriorityIdx: index("profiles_priority_idx").on(table.priority),
  profilesControlEnvIdx: index("profiles_control_env_idx").on(table.controlEnvironment),
  profilesActiveIdx: index("profiles_active_idx").on(table.isActive),
  profilesConfidenceIdx: index("profiles_confidence_idx").on(table.confidenceScore),
  uniqueActiveRiskProfile: { 
    columns: [table.riskId], 
    name: "unique_active_risk_profile",
    where: sql`${table.isActive} = true`
  },
  complexityValidation: sql`CHECK (${table.complexity} IN ('simple', 'moderate', 'complex', 'highly_complex'))`,
  scopeValidation: sql`CHECK (${table.auditScope} IN ('substantive', 'controls', 'hybrid'))`,
  priorityValidation: sql`CHECK (${table.priority} IN ('low', 'medium', 'high', 'critical'))`,
  controlEnvValidation: sql`CHECK (${table.controlEnvironment} IN ('strong', 'adequate', 'weak', 'deficient'))`,
  trendValidation: sql`CHECK (${table.riskTrend} IN ('increasing', 'stable', 'decreasing'))`,
  complianceValidation: sql`CHECK (${table.complianceLevel} IN ('basic', 'standard', 'enhanced', 'strict'))`,
  methodValidation: sql`CHECK (${table.analysisMethod} IN ('rule_based', 'ml_based', 'hybrid'))`,
  controlStrengthCheck: sql`CHECK (${table.controlStrength} >= 1 AND ${table.controlStrength} <= 10)`,
  confidenceCheck: sql`CHECK (${table.confidenceScore} >= 0 AND ${table.confidenceScore} <= 100)`,
  hoursCheck: sql`CHECK (${table.estimatedHours} > 0)`
}));

// Test Generation Sessions - Sesiones de generación de tests para tracking
export const testGenerationSessions = pgTable("test_generation_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").references(() => audits.id),

  // Session Parameters
  sessionName: text("session_name").notNull(),
  description: text("description"),
  generationType: text("generation_type").notNull(), // auto, semi_auto, manual_assisted

  // Input Parameters
  selectedRisks: text("selected_risks").array().notNull(), // IDs de riesgos seleccionados
  scopeFilters: jsonb("scope_filters").default({}), // Filtros aplicados
  generationRules: jsonb("generation_rules").default({}), // Reglas de generación aplicadas
  customizations: jsonb("customizations").default({}), // Customizaciones específicas

  // Results
  testsGenerated: integer("tests_generated").notNull().default(0),
  templatesUsed: text("templates_used").array().default([]), // IDs de templates utilizadas
  totalEstimatedHours: integer("total_estimated_hours").notNull().default(0),

  // Algorithm Configuration
  algorithmVersion: text("algorithm_version").notNull().default("1.0"),
  aiAssistanceLevel: text("ai_assistance_level").notNull().default("standard"), // none, basic, standard, advanced
  qualityThreshold: integer("quality_threshold").notNull().default(80), // 0-100%

  // Approval Workflow
  status: text("status").notNull().default("draft"), // draft, pending_review, approved, rejected, archived
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),

  // Performance Metrics
  generationTimeSeconds: integer("generation_time_seconds"),
  userInteractions: integer("user_interactions").notNull().default(0),
  customizationRate: numeric("customization_rate", { precision: 5, scale: 2 }).default("0"), // % de tests customizados

  // Metadata
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  sessionsAuditIdx: index("sessions_audit_idx").on(table.auditId),
  sessionsCreatedByIdx: index("sessions_created_by_idx").on(table.createdBy),
  sessionsStatusIdx: index("sessions_status_idx").on(table.status),
  sessionsTypeIdx: index("sessions_type_idx").on(table.generationType),
  sessionsApprovedByIdx: index("sessions_approved_by_idx").on(table.approvedBy),
  sessionsCreatedAtIdx: index("sessions_created_at_idx").on(table.createdAt),
  typeValidation: sql`CHECK (${table.generationType} IN ('auto', 'semi_auto', 'manual_assisted'))`,
  assistanceValidation: sql`CHECK (${table.aiAssistanceLevel} IN ('none', 'basic', 'standard', 'advanced'))`,
  statusValidation: sql`CHECK (${table.status} IN ('draft', 'pending_review', 'approved', 'rejected', 'archived'))`,
  thresholdCheck: sql`CHECK (${table.qualityThreshold} >= 0 AND ${table.qualityThreshold} <= 100)`,
  customizationCheck: sql`CHECK (${table.customizationRate} >= 0 AND ${table.customizationRate} <= 100)`,
  testsCheck: sql`CHECK (${table.testsGenerated} >= 0)`,
  hoursCheck: sql`CHECK (${table.totalEstimatedHours} >= 0)`,
  interactionsCheck: sql`CHECK (${table.userInteractions} >= 0)`
}));

// Generated Tests Tracking - Relación entre sesiones y tests generados
export const generatedTestsTracking = pgTable("generated_tests_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => testGenerationSessions.id),
  auditTestId: varchar("audit_test_id").notNull().references(() => auditTests.id),
  templateId: varchar("template_id").references(() => auditTestTemplates.id),
  riskId: varchar("risk_id").notNull().references(() => risks.id),

  // Generation Details
  generationMethod: text("generation_method").notNull(), // auto, customized, manual
  customizationLevel: text("customization_level").notNull().default("none"), // none, minimal, moderate, extensive
  customizations: jsonb("customizations").default({}), // Customizaciones aplicadas

  // Template Usage
  originalTemplateUsed: boolean("original_template_used").notNull().default(true),
  proceduresModified: integer("procedures_modified").notNull().default(0),
  evidenceRequirementsChanged: boolean("evidence_requirements_changed").notNull().default(false),

  // Quality Metrics
  generationScore: integer("generation_score").notNull().default(100), // 0-100 score de calidad
  validationPassed: boolean("validation_passed").notNull().default(true),
  issuesFound: text("issues_found").array().default([]),

  // Performance
  generationTimeMs: integer("generation_time_ms"), // Tiempo de generación en milisegundos
  userReviewTimeMin: integer("user_review_time_min"), // Tiempo de revisión del usuario

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  trackingSessionIdx: index("tracking_session_idx").on(table.sessionId),
  trackingTestIdx: index("tracking_test_idx").on(table.auditTestId),
  trackingTemplateIdx: index("tracking_template_idx").on(table.templateId),
  trackingRiskIdx: index("tracking_risk_idx").on(table.riskId),
  trackingMethodIdx: index("tracking_method_idx").on(table.generationMethod),
  trackingScoreIdx: index("tracking_score_idx").on(table.generationScore),
  uniqueSessionTest: { columns: [table.sessionId, table.auditTestId], name: "unique_session_test" },
  methodValidation: sql`CHECK (${table.generationMethod} IN ('auto', 'customized', 'manual'))`,
  customizationValidation: sql`CHECK (${table.customizationLevel} IN ('none', 'minimal', 'moderate', 'extensive'))`,
  scoreCheck: sql`CHECK (${table.generationScore} >= 0 AND ${table.generationScore} <= 100)`,
  proceduresCheck: sql`CHECK (${table.proceduresModified} >= 0)`
}));

// Template Customizations - Customizaciones guardadas de plantillas
export const templateCustomizations = pgTable("template_customizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => auditTestTemplates.id),
  riskId: varchar("risk_id").references(() => risks.id), // Para customizaciones específicas de riesgo

  // Customization Details
  name: text("name").notNull(), // Nombre de la customización
  description: text("description"),
  customizationType: text("customization_type").notNull(), // risk_specific, process_specific, industry_specific, custom

  // Template Modifications
  modifiedObjective: text("modified_objective"),
  modifiedScope: text("modified_scope"),
  additionalProcedures: jsonb("additional_procedures").default([]), // Procedimientos adicionales
  removedProcedures: text("removed_procedures").array().default([]), // IDs de procedimientos removidos
  modifiedProcedures: jsonb("modified_procedures").default({}), // Procedimientos modificados

  // Resource Adjustments
  adjustedHours: integer("adjusted_hours"), // Horas ajustadas
  additionalSkills: text("additional_skills").array().default([]),
  additionalTools: text("additional_tools").array().default([]),

  // Usage and Performance
  usageCount: integer("usage_count").notNull().default(0),
  successRate: numeric("success_rate", { precision: 5, scale: 2 }).default("0"), // 0-100%
  avgEffectiveness: numeric("avg_effectiveness", { precision: 5, scale: 2 }).default("0"), // 0-100%

  // Approval and Sharing
  isApproved: boolean("is_approved").notNull().default(false),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  isPublic: boolean("is_public").notNull().default(false), // Si puede ser usada por otros

  // Metadata
  version: text("version").notNull().default("1.0"),
  tags: text("tags").array().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  customizationsTemplateIdx: index("customizations_template_idx").on(table.templateId),
  customizationsRiskIdx: index("customizations_risk_idx").on(table.riskId),
  customizationsTypeIdx: index("customizations_type_idx").on(table.customizationType),
  customizationsCreatedByIdx: index("customizations_created_by_idx").on(table.createdBy),
  customizationsUsageIdx: index("customizations_usage_idx").on(table.usageCount),
  customizationsActiveIdx: index("customizations_active_idx").on(table.isActive),
  customizationsPublicIdx: index("customizations_public_idx").on(table.isPublic),
  typeValidation: sql`CHECK (${table.customizationType} IN ('risk_specific', 'process_specific', 'industry_specific', 'custom'))`,
  successRateCheck: sql`CHECK (${table.successRate} >= 0 AND ${table.successRate} <= 100)`,
  effectivenessCheck: sql`CHECK (${table.avgEffectiveness} >= 0 AND ${table.avgEffectiveness} <= 100)`,
  usageCheck: sql`CHECK (${table.usageCount} >= 0)`,
  hoursCheck: sql`CHECK (${table.adjustedHours} IS NULL OR ${table.adjustedHours} > 0)`
}));

// Generation Algorithm Configuration - Configuración de algoritmos de generación
export const generationAlgorithmConfig = pgTable("generation_algorithm_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Algorithm Identity
  name: text("name").notNull().unique(),
  version: text("version").notNull(),
  description: text("description"),
  algorithmType: text("algorithm_type").notNull(), // rule_based, ml_based, hybrid

  // Configuration Parameters
  config: jsonb("config").notNull().default({}), // Configuración específica del algoritmo
  weights: jsonb("weights").default({}), // Pesos para diferentes factores
  thresholds: jsonb("thresholds").default({}), // Umbrales de decisión

  // AI/ML Configuration
  modelVersion: text("model_version"), // Versión del modelo ML si aplica
  trainingData: jsonb("training_data_info").default({}), // Info sobre datos de entrenamiento
  accuracy: numeric("accuracy", { precision: 5, scale: 2 }), // Precisión del modelo

  // Performance Metrics
  avgGenerationTime: integer("avg_generation_time_ms"), // Tiempo promedio en milisegundos
  successRate: numeric("success_rate", { precision: 5, scale: 2 }).default("0"), // 0-100%
  userSatisfactionScore: numeric("user_satisfaction_score", { precision: 5, scale: 2 }), // 0-100%

  // Status and Control
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  requiresApproval: boolean("requires_approval").notNull().default(false),

  // Metadata
  createdBy: varchar("created_by").references(() => users.id),
  lastTrainedAt: timestamp("last_trained_at"), // Última vez que se entrenó el modelo
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  algorithmNameIdx: index("algorithm_name_idx").on(table.name),
  algorithmTypeIdx: index("algorithm_type_idx").on(table.algorithmType),
  algorithmActiveIdx: index("algorithm_active_idx").on(table.isActive),
  algorithmDefaultIdx: index("algorithm_default_idx").on(table.isDefault),
  algorithmVersionIdx: index("algorithm_version_idx").on(table.version),
  uniqueDefaultAlgorithm: {
    columns: [table.isDefault],
    name: "unique_default_algorithm",
    where: sql`${table.isDefault} = true AND ${table.isActive} = true`
  },
  typeValidation: sql`CHECK (${table.algorithmType} IN ('rule_based', 'ml_based', 'hybrid'))`,
  accuracyCheck: sql`CHECK (${table.accuracy} IS NULL OR (${table.accuracy} >= 0 AND ${table.accuracy} <= 100))`,
  successRateCheck: sql`CHECK (${table.successRate} >= 0 AND ${table.successRate} <= 100)`,
  satisfactionCheck: sql`CHECK (${table.userSatisfactionScore} IS NULL OR (${table.userSatisfactionScore} >= 0 AND ${table.userSatisfactionScore} <= 100))`
}));

// ============= ANALYTICS TABLES =============

// Auditor Performance Analytics
export const auditorPerformanceMetrics = pgTable("auditor_performance_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditorId: varchar("auditor_id").notNull().references(() => users.id),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),

  // Completion Metrics
  totalTestsAssigned: integer("total_tests_assigned").notNull().default(0),
  totalTestsCompleted: integer("total_tests_completed").notNull().default(0),
  totalTestsOnTime: integer("total_tests_on_time").notNull().default(0),
  completionRate: numeric("completion_rate", { precision: 5, scale: 2 }).notNull().default("0"), // Percentage
  onTimeRate: numeric("on_time_rate", { precision: 5, scale: 2 }).notNull().default("0"), // Percentage

  // Time Metrics
  totalHoursWorked: numeric("total_hours_worked", { precision: 8, scale: 2 }).notNull().default("0"),
  averageHoursPerTest: numeric("average_hours_per_test", { precision: 6, scale: 2 }).notNull().default("0"),
  averageCompletionDays: numeric("average_completion_days", { precision: 6, scale: 2 }).notNull().default("0"),

  // Quality Metrics
  totalReviews: integer("total_reviews").notNull().default(0),
  totalApprovals: integer("total_approvals").notNull().default(0),
  totalRejections: integer("total_rejections").notNull().default(0),
  totalRevisions: integer("total_revisions").notNull().default(0),
  approvalRate: numeric("approval_rate", { precision: 5, scale: 2 }).notNull().default("0"), // Percentage
  revisionRate: numeric("revision_rate", { precision: 5, scale: 2 }).notNull().default("0"), // Percentage
  averageQualityScore: numeric("average_quality_score", { precision: 5, scale: 2 }).notNull().default("0"),

  // Productivity Metrics
  testsPerWeek: numeric("tests_per_week", { precision: 6, scale: 2 }).notNull().default("0"),
  testsPerMonth: numeric("tests_per_month", { precision: 6, scale: 2 }).notNull().default("0"),
  productivityScore: numeric("productivity_score", { precision: 5, scale: 2 }).notNull().default("0"),

  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Índices para performance
  auditorPerformanceAuditorIdx: index("auditor_performance_auditor_idx").on(table.auditorId),
  auditorPerformancePeriodIdx: index("auditor_performance_period_idx").on(table.periodStart, table.periodEnd),
  // Unique constraint para evitar duplicados
  uniqueAuditorPeriod: { columns: [table.auditorId, table.periodStart, table.periodEnd], name: "unique_auditor_period" }
}));

// Risk Trending Analytics
export const riskTrendingData = pgTable("risk_trending_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riskId: varchar("risk_id").notNull().references(() => risks.id),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),

  // Risk Level Tracking
  averageInherentRisk: numeric("average_inherent_risk", { precision: 5, scale: 2 }).notNull().default("0"),
  averageResidualRisk: numeric("average_residual_risk", { precision: 5, scale: 2 }).notNull().default("0"),
  riskLevelTrend: text("risk_level_trend").notNull().default("stable"), // increasing, decreasing, stable

  // Audit Coverage
  totalAudits: integer("total_audits").notNull().default(0),
  totalTestsCompleted: integer("total_tests_completed").notNull().default(0),
  coveragePercentage: numeric("coverage_percentage", { precision: 5, scale: 2 }).notNull().default("0"),

  // Control Effectiveness
  averageControlEffectiveness: numeric("average_control_effectiveness", { precision: 5, scale: 2 }).notNull().default("0"),
  controlEffectivenessTrend: text("control_effectiveness_trend").notNull().default("stable"), // improving, declining, stable

  // Finding Analysis
  totalFindings: integer("total_findings").notNull().default(0),
  criticalFindings: integer("critical_findings").notNull().default(0),
  findingsResolved: integer("findings_resolved").notNull().default(0),
  averageFindingSeverity: numeric("average_finding_severity", { precision: 5, scale: 2 }).notNull().default("0"),

  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Índices para performance
  riskTrendingRiskIdx: index("risk_trending_risk_idx").on(table.riskId),
  riskTrendingPeriodIdx: index("risk_trending_period_idx").on(table.periodStart, table.periodEnd),
  // Unique constraint para evitar duplicados
  uniqueRiskPeriod: { columns: [table.riskId, table.periodStart, table.periodEnd], name: "unique_risk_period" }
}));

// Team Performance Comparison
export const teamPerformanceMetrics = pgTable("team_performance_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id"), // Nullable - puede ser departamento o grupo específico
  departmentName: text("department_name"), // Nombre del departamento
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),

  // Team Aggregates
  totalTeamMembers: integer("total_team_members").notNull().default(0),
  totalTestsAssigned: integer("total_tests_assigned").notNull().default(0),
  totalTestsCompleted: integer("total_tests_completed").notNull().default(0),
  totalHoursWorked: numeric("total_hours_worked", { precision: 10, scale: 2 }).notNull().default("0"),

  // Team Averages
  averageCompletionRate: numeric("average_completion_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  averageOnTimeRate: numeric("average_on_time_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  averageProductivityScore: numeric("average_productivity_score", { precision: 5, scale: 2 }).notNull().default("0"),
  averageQualityScore: numeric("average_quality_score", { precision: 5, scale: 2 }).notNull().default("0"),

  // Performance Distribution
  topPerformerCount: integer("top_performer_count").notNull().default(0),
  averagePerformerCount: integer("average_performer_count").notNull().default(0),
  belowAveragePerformerCount: integer("below_average_performer_count").notNull().default(0),

  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Índices para performance
  teamPerformancePeriodIdx: index("team_performance_period_idx").on(table.periodStart, table.periodEnd),
  teamPerformanceDeptIdx: index("team_performance_dept_idx").on(table.departmentName),
}));

// Workflow Efficiency Metrics
export const workflowEfficiencyMetrics = pgTable("workflow_efficiency_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),

  // Completion Time Analysis
  averageCompletionTime: numeric("average_completion_time", { precision: 6, scale: 2 }).notNull().default("0"), // Hours
  medianCompletionTime: numeric("median_completion_time", { precision: 6, scale: 2 }).notNull().default("0"), // Hours

  // Review Cycle Analysis
  averageReviewCycleTime: numeric("average_review_cycle_time", { precision: 6, scale: 2 }).notNull().default("0"), // Hours
  averageApprovalTime: numeric("average_approval_time", { precision: 6, scale: 2 }).notNull().default("0"), // Hours

  // Bottleneck Analysis
  mostCommonBottleneck: text("most_common_bottleneck"), // Stage where delays occur most
  bottleneckPercentage: numeric("bottleneck_percentage", { precision: 5, scale: 2 }).notNull().default("0"),

  // Deadline Performance
  testsCompletedOnTime: integer("tests_completed_on_time").notNull().default(0),
  testsCompletedLate: integer("tests_completed_late").notNull().default(0),
  averageDaysOverdue: numeric("average_days_overdue", { precision: 6, scale: 2 }).notNull().default("0"),

  // Rework Analysis
  totalRevisions: integer("total_revisions").notNull().default(0),
  averageRevisionsPerTest: numeric("average_revisions_per_test", { precision: 5, scale: 2 }).notNull().default("0"),
  revisionRate: numeric("revision_rate", { precision: 5, scale: 2 }).notNull().default("0"), // Percentage

  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Índices para performance
  workflowEfficiencyPeriodIdx: index("workflow_efficiency_period_idx").on(table.periodStart, table.periodEnd),
}));

// Report Generation Log
export const reportGenerationLog = pgTable("report_generation_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportType: text("report_type").notNull(), // auditor_performance, risk_trending, team_comparison, etc.
  reportFormat: text("report_format").notNull(), // pdf, excel, csv
  requestedBy: varchar("requested_by").notNull().references(() => users.id),

  // Report Parameters
  parametersUsed: jsonb("parameters_used").notNull().default({}), // Filters and parameters used
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),

  // Generation Status
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  fileSize: integer("file_size"), // Size in bytes
  filePath: text("file_path"), // Storage path for generated file
  downloadUrl: text("download_url"), // Temporary download URL

  // Performance Tracking
  processingTimeMs: integer("processing_time_ms"), // Time taken to generate
  recordsProcessed: integer("records_processed"), // Number of records in report

  // Error Handling
  errorMessage: text("error_message"),
  errorStack: text("error_stack"),

  requestedAt: timestamp("requested_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"), // When download link expires
}, (table) => ({
  // Índices para performance
  reportGenerationUserIdx: index("report_generation_user_idx").on(table.requestedBy),
  reportGenerationStatusIdx: index("report_generation_status_idx").on(table.status),
  reportGenerationTypeIdx: index("report_generation_type_idx").on(table.reportType),
  reportGenerationDateIdx: index("report_generation_date_idx").on(table.requestedAt),
}));

// Extended types para notificaciones
export type NotificationWithContext = Notification & {
  audit?: Audit;
  auditTest?: AuditTest;
  auditFinding?: AuditFinding;
  action?: Action;
  risk?: Risk;
  control?: Control;
  recipient: User;
  createdByUser?: User;
};

export type NotificationPreferenceWithUser = NotificationPreference & {
  user: User;
};

export type NotificationQueueWithNotification = NotificationQueue & {
  notification: NotificationWithContext;
};

// Enums para tipos de notificación
export const NotificationTypes = {
  // Deadline notifications
  DEADLINE_APPROACHING: 'deadline_approaching',
  DEADLINE_OVERDUE: 'deadline_overdue',
  DEADLINE_TODAY: 'deadline_today',
  DEADLINE_EXTENSION_REQUEST: 'deadline_extension_request',

  // Assignment notifications  
  TEST_ASSIGNED: 'test_assigned',
  SUPERVISOR_ASSIGNED: 'supervisor_assigned',
  REVIEWER_ASSIGNED: 'reviewer_assigned',

  // Status change notifications
  STATUS_CHANGED: 'status_changed',
  TEST_SUBMITTED: 'test_submitted',
  REVIEW_COMPLETED: 'review_completed',
  TEST_APPROVED: 'test_approved',
  TEST_REJECTED: 'test_rejected',
  TEST_REOPENED: 'test_reopened',

  // Progress and milestone notifications
  PROGRESS_UPDATED: 'progress_updated',
  MILESTONE_REACHED: 'milestone_reached',
  WORK_LOG_ADDED: 'work_log_added',
  ATTACHMENT_UPLOADED: 'attachment_uploaded',

  // Review and comment notifications
  COMMENT_ADDED: 'comment_added',
  REVIEW_REQUEST: 'review_request',
  FEEDBACK_PROVIDED: 'feedback_provided',

  // System notifications
  SYSTEM_MAINTENANCE: 'system_maintenance',
  SECURITY_ALERT: 'security_alert',
  FEATURE_UPDATE: 'feature_update',
  BULK_ASSIGNMENT: 'bulk_assignment',

  // Process validation notifications
  PROCESS_VALIDATION_ASSIGNED: 'process_validation_assigned',
  PROCESS_VALIDATION_STATUS_CHANGED: 'process_validation_status_changed',
  PROCESS_RISK_VALIDATION_REQUIRED: 'process_risk_validation_required',
  PROCESS_CONTROL_VALIDATION_REQUIRED: 'process_control_validation_required',
  PROCESS_VALIDATION_COMPLETED: 'process_validation_completed',
  PROCESS_VALIDATION_OVERDUE: 'process_validation_overdue',

  // Action Plan notifications (STRUCTURE READY - FUNCTIONALITY DISABLED)
  // These notification types are prepared but not yet activated in the system
  ACTION_PLAN_CREATED: 'action_plan_created',
  ACTION_PLAN_ASSIGNED: 'action_plan_assigned',
  ACTION_PLAN_STATUS_CHANGED: 'action_plan_status_changed',
  ACTION_PLAN_DEADLINE_APPROACHING: 'action_plan_deadline_approaching',
  ACTION_PLAN_DEADLINE_OVERDUE: 'action_plan_deadline_overdue',
  ACTION_PLAN_DEADLINE_TODAY: 'action_plan_deadline_today',
  ACTION_PLAN_PROGRESS_UPDATED: 'action_plan_progress_updated',
  ACTION_PLAN_COMPLETED: 'action_plan_completed',
  ACTION_PLAN_REOPENED: 'action_plan_reopened',
  ACTION_PLAN_EXTENSION_REQUEST: 'action_plan_extension_request',
  ACTION_PLAN_RESPONSIBLE_CHANGED: 'action_plan_responsible_changed',
  ACTION_PLAN_PRIORITY_CHANGED: 'action_plan_priority_changed',
  ACTION_PLAN_REVIEW_REQUIRED: 'action_plan_review_required'
} as const;

export type NotificationType = typeof NotificationTypes[keyof typeof NotificationTypes];

export const NotificationPriorities = {
  CRITICAL: 'critical',
  IMPORTANT: 'important', 
  NORMAL: 'normal',
  LOW: 'low'
} as const;

export type NotificationPriority = typeof NotificationPriorities[keyof typeof NotificationPriorities];

export const NotificationChannels = {
  IN_APP: 'in_app',
  EMAIL: 'email',
  PUSH: 'push',
  SMS: 'sms'
} as const;

export type NotificationChannel = typeof NotificationChannels[keyof typeof NotificationChannels];

export const NotificationStatuses = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  CLICKED: 'clicked',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

export type NotificationStatus = typeof NotificationStatuses[keyof typeof NotificationStatuses];

// ============= INSERT SCHEMAS Y TYPES PARA ANALYTICS =============

// Insert schemas para analytics
export const insertAuditorPerformanceMetricsSchema = createInsertSchema(auditorPerformanceMetrics).omit({
  id: true,
  calculatedAt: true,
  createdAt: true,
});

export const insertRiskTrendingDataSchema = createInsertSchema(riskTrendingData).omit({
  id: true,
  calculatedAt: true,
  createdAt: true,
});

export const insertTeamPerformanceMetricsSchema = createInsertSchema(teamPerformanceMetrics).omit({
  id: true,
  calculatedAt: true,
  createdAt: true,
});

export const insertWorkflowEfficiencyMetricsSchema = createInsertSchema(workflowEfficiencyMetrics).omit({
  id: true,
  calculatedAt: true,
  createdAt: true,
});

export const insertReportGenerationLogSchema = createInsertSchema(reportGenerationLog).omit({
  id: true,
  requestedAt: true,
  completedAt: true,
});

// Types para analytics
export type AuditorPerformanceMetrics = typeof auditorPerformanceMetrics.$inferSelect;
export type InsertAuditorPerformanceMetrics = z.infer<typeof insertAuditorPerformanceMetricsSchema>;

export type RiskTrendingData = typeof riskTrendingData.$inferSelect;
export type InsertRiskTrendingData = z.infer<typeof insertRiskTrendingDataSchema>;

export type TeamPerformanceMetrics = typeof teamPerformanceMetrics.$inferSelect;
export type InsertTeamPerformanceMetrics = z.infer<typeof insertTeamPerformanceMetricsSchema>;

export type WorkflowEfficiencyMetrics = typeof workflowEfficiencyMetrics.$inferSelect;
export type InsertWorkflowEfficiencyMetrics = z.infer<typeof insertWorkflowEfficiencyMetricsSchema>;

export type ReportGenerationLog = typeof reportGenerationLog.$inferSelect;
export type InsertReportGenerationLog = z.infer<typeof insertReportGenerationLogSchema>;

// Extended types para analytics con joins
export type AuditorPerformanceWithDetails = AuditorPerformanceMetrics & {
  auditor: User;
  auditTests: AuditTest[];
  workLogs: AuditTestWorkLog[];
};

export type RiskTrendingWithDetails = RiskTrendingData & {
  risk: Risk;
  process?: Process;
  subproceso?: Subproceso;
  macroproceso?: Macroproceso;
  controls: Control[];
  findings: AuditFinding[];
};

export type TeamPerformanceWithMembers = TeamPerformanceMetrics & {
  members: User[];
  auditTests: AuditTest[];
  workLogs: AuditTestWorkLog[];
};

// Analytics Query Interfaces
export interface AnalyticsDateRange {
  startDate: Date;
  endDate: Date;
}

export interface AuditorPerformanceFilters extends AnalyticsDateRange {
  auditorIds?: string[];
  departmentNames?: string[];
  testTypes?: string[];
  riskLevels?: string[];
}

export interface RiskTrendingFilters extends AnalyticsDateRange {
  riskIds?: string[];
  processIds?: string[];
  macroprocesoIds?: string[];
  riskCategories?: string[];
  riskLevels?: ('low' | 'medium' | 'high' | 'critical')[];
}

export interface TeamPerformanceFilters extends AnalyticsDateRange {
  departmentNames?: string[];
  teamIds?: string[];
  includedMetrics?: ('completion' | 'quality' | 'productivity' | 'onTime')[];
}

export interface WorkflowEfficiencyFilters extends AnalyticsDateRange {
  testTypes?: string[];
  priorityLevels?: string[];
  includedStages?: ('assignment' | 'execution' | 'review' | 'approval')[];
}

// Report Generation Types
export type ReportType = 
  | 'auditor_performance' 
  | 'team_comparison' 
  | 'risk_trending' 
  | 'workflow_efficiency' 
  | 'executive_summary' 
  | 'compliance_report'
  | 'custom_report';

export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json';

export interface ReportParameters {
  reportType: ReportType;
  format: ReportFormat;
  title?: string;
  subtitle?: string;
  filters: Record<string, any>;
  includeCharts?: boolean;
  includeRawData?: boolean;
  groupBy?: string[];
  sortBy?: { field: string; direction: 'asc' | 'desc' }[];
}

export interface ReportGenerationStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number; // 0-100
  estimatedTimeRemaining?: number; // seconds
  recordsProcessed?: number;
  totalRecords?: number;
  fileSize?: number;
  downloadUrl?: string;
  expiresAt?: Date;
  errorMessage?: string;
}

// Chart Data Types
export interface ChartDataPoint {
  x: string | number | Date;
  y: number;
  label?: string;
  color?: string;
  metadata?: Record<string, any>;
}

export interface TimeSeriesData {
  date: Date;
  value: number;
  category?: string;
  tooltip?: string;
}

export interface HeatMapData {
  x: string;
  y: string;
  value: number;
  color?: string;
  tooltip?: string;
}

export interface ComparisonData {
  category: string;
  current: number;
  previous?: number;
  target?: number;
  benchmark?: number;
  trend?: 'up' | 'down' | 'stable';
}

// Aggregated Analytics Result Types
export interface AuditorPerformanceSummary {
  auditorId: string;
  auditorName: string;
  department?: string;
  totalTests: number;
  completedTests: number;
  completionRate: number;
  onTimeRate: number;
  averageCompletionTime: number;
  qualityScore: number;
  productivityScore: number;
  rank?: number;
  percentile?: number;
  trends: {
    completionRate: 'improving' | 'declining' | 'stable';
    qualityScore: 'improving' | 'declining' | 'stable';
    productivity: 'improving' | 'declining' | 'stable';
  };
}

export interface RiskTrendingSummary {
  riskId: string;
  riskName: string;
  currentLevel: number;
  previousLevel?: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  auditCoverage: number;
  controlEffectiveness: number;
  findingsCount: number;
  criticalFindingsCount: number;
  lastAuditDate?: Date;
  nextPlannedAudit?: Date;
}

export interface TeamPerformanceSummary {
  departmentName: string;
  memberCount: number;
  totalTests: number;
  completionRate: number;
  onTimeRate: number;
  qualityScore: number;
  productivityScore: number;
  topPerformers: AuditorPerformanceSummary[];
  improvementAreas: string[];
  workloadDistribution: 'balanced' | 'unbalanced';
}

export interface WorkflowEfficiencySummary {
  averageCompletionTime: number;
  medianCompletionTime: number;
  onTimePercentage: number;
  bottlenecks: Array<{
    stage: string;
    averageDelay: number;
    affectedPercentage: number;
  }>;
  revisionRate: number;
  approvalTime: number;
  seasonalTrends: Array<{
    period: string;
    efficiency: number;
    trend: 'improving' | 'declining' | 'stable';
  }>;
}

// ============= ZOD SCHEMAS FOR AUTOMATIC AUDIT TEST GENERATION =============

// Template Categories schemas
export const insertAuditTestTemplateCategorySchema = createInsertSchema(auditTestTemplateCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Audit Test Templates schemas
export const insertAuditTestTemplateSchema = createInsertSchema(auditTestTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Template Procedures schemas
export const insertTemplateProcedureSchema = createInsertSchema(templateProcedures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Risk Analysis Profiles schemas
export const insertRiskAnalysisProfileSchema = createInsertSchema(riskAnalysisProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Test Generation Sessions schemas
export const insertTestGenerationSessionSchema = createInsertSchema(testGenerationSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Generated Tests Tracking schemas
export const insertGeneratedTestsTrackingSchema = createInsertSchema(generatedTestsTracking).omit({
  id: true,
  createdAt: true,
});

// Template Customizations schemas
export const insertTemplateCustomizationSchema = createInsertSchema(templateCustomizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Generation Algorithm Config schemas
export const insertGenerationAlgorithmConfigSchema = createInsertSchema(generationAlgorithmConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ============= TYPESCRIPT TYPES FOR AUTOMATIC AUDIT TEST GENERATION =============

// Template Categories types
export type AuditTestTemplateCategory = typeof auditTestTemplateCategories.$inferSelect;
export type InsertAuditTestTemplateCategory = z.infer<typeof insertAuditTestTemplateCategorySchema>;

// Audit Test Templates types
export type AuditTestTemplate = typeof auditTestTemplates.$inferSelect;
export type InsertAuditTestTemplate = z.infer<typeof insertAuditTestTemplateSchema>;

// Template Procedures types
export type TemplateProcedure = typeof templateProcedures.$inferSelect;
export type InsertTemplateProcedure = z.infer<typeof insertTemplateProcedureSchema>;

// Risk Analysis Profiles types
export type RiskAnalysisProfile = typeof riskAnalysisProfiles.$inferSelect;
export type InsertRiskAnalysisProfile = z.infer<typeof insertRiskAnalysisProfileSchema>;

// Test Generation Sessions types
export type TestGenerationSession = typeof testGenerationSessions.$inferSelect;
export type InsertTestGenerationSession = z.infer<typeof insertTestGenerationSessionSchema>;

// Generated Tests Tracking types
export type GeneratedTestsTracking = typeof generatedTestsTracking.$inferSelect;
export type InsertGeneratedTestsTracking = z.infer<typeof insertGeneratedTestsTrackingSchema>;

// Template Customizations types
export type TemplateCustomization = typeof templateCustomizations.$inferSelect;
export type InsertTemplateCustomization = z.infer<typeof insertTemplateCustomizationSchema>;

// Generation Algorithm Config types
export type GenerationAlgorithmConfig = typeof generationAlgorithmConfig.$inferSelect;
export type InsertGenerationAlgorithmConfig = z.infer<typeof insertGenerationAlgorithmConfigSchema>;

// ============= INTELLIGENT RECOMMENDATION ENGINE TABLES =============

// Core Recommendations Storage
export const intelligentRecommendations = pgTable("intelligent_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditTestId: varchar("audit_test_id").references(() => auditTests.id),
  recommendationType: text("recommendation_type").notNull(), // 'procedure', 'auditor', 'timeline', 'complete'
  recommendationData: jsonb("recommendation_data").notNull(), // Structured recommendation content
  confidenceScore: numeric("confidence_score", { precision: 5, scale: 2 }).notNull(), // 0-100
  reasoning: text("reasoning").notNull(),
  alternativeOptions: jsonb("alternative_options").default([]),
  algorithmVersion: text("algorithm_version").notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  wasAccepted: boolean("was_accepted"),
  userFeedback: jsonb("user_feedback"),
  actualOutcome: jsonb("actual_outcome"),
  effectivenessScore: numeric("effectiveness_score", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ML Model Storage and Configuration
export const mlModels = pgTable("ml_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  modelName: text("model_name").notNull().unique(),
  modelType: text("model_type").notNull(), // 'procedure_effectiveness', 'auditor_performance', 'timeline_prediction'
  version: text("version").notNull(),
  configuration: jsonb("configuration").notNull(),
  trainingData: jsonb("training_data"),
  modelMetrics: jsonb("model_metrics").notNull(), // accuracy, precision, recall, etc.
  isActive: boolean("is_active").notNull().default(true),
  lastTrained: timestamp("last_trained"),
  trainingStatus: text("training_status").notNull().default("ready"), // 'training', 'ready', 'failed'
  performanceScore: numeric("performance_score", { precision: 5, scale: 2 }),
  trainingDataSize: integer("training_data_size"),
  validationAccuracy: numeric("validation_accuracy", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced Procedure Performance History
export const procedurePerformanceHistory = pgTable("procedure_performance_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditTestId: varchar("audit_test_id").references(() => auditTests.id),
  procedureId: varchar("procedure_id").notNull(),
  procedureType: text("procedure_type").notNull(),
  completionTimeHours: numeric("completion_time_hours", { precision: 5, scale: 2 }).notNull(),
  effectivenessScore: integer("effectiveness_score").notNull(), // 0-100
  qualityRating: integer("quality_rating").notNull(), // 1-5
  auditorId: varchar("auditor_id").references(() => users.id),
  findingsDiscovered: integer("findings_discovered").default(0),
  issuesIdentified: integer("issues_identified").default(0),
  completionStatus: text("completion_status").notNull(),
  auditDate: timestamp("audit_date").notNull(),
  riskCategory: text("risk_category").notNull(),
  complexityLevel: text("complexity_level").notNull(),
  organizationSize: text("organization_size"),
  industryType: text("industry_type"),
  contextFactors: jsonb("context_factors").default({}),
  performanceMetrics: jsonb("performance_metrics").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// Auditor Expertise Profiles
export const auditorExpertiseProfiles = pgTable("auditor_expertise_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditorId: varchar("auditor_id").notNull().references(() => users.id).unique(),
  riskSpecializations: text("risk_specializations").array().default([]),
  industryExperience: text("industry_experience").array().default([]),
  technicalSkills: text("technical_skills").array().default([]),
  certifications: text("certifications").array().default([]),
  averagePerformanceScore: numeric("average_performance_score", { precision: 5, scale: 2 }).notNull().default('0'),
  completionReliability: numeric("completion_reliability", { precision: 5, scale: 2 }).notNull().default('0'),
  qualityConsistency: numeric("quality_consistency", { precision: 5, scale: 2 }).notNull().default('0'),
  learningVelocity: numeric("learning_velocity", { precision: 5, scale: 2 }).notNull().default('0'),
  workloadCapacity: integer("workload_capacity").notNull().default(40), // hours per week
  availabilityScore: numeric("availability_score", { precision: 5, scale: 2 }).notNull().default('100'),
  teamCollaborationScore: numeric("team_collaboration_score", { precision: 5, scale: 2 }).notNull().default('0'),
  complexityHandling: text("complexity_handling").notNull().default('moderate'), // 'simple', 'moderate', 'complex', 'expert'
  lastProfileUpdate: timestamp("last_profile_update").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Timeline Performance Analysis
export const timelinePerformanceAnalysis = pgTable("timeline_performance_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditTestId: varchar("audit_test_id").references(() => auditTests.id),
  plannedDurationHours: numeric("planned_duration_hours", { precision: 5, scale: 2 }).notNull(),
  actualDurationHours: numeric("actual_duration_hours", { precision: 5, scale: 2 }).notNull(),
  variancePercentage: numeric("variance_percentage", { precision: 5, scale: 2 }).notNull(),
  delayFactors: text("delay_factors").array().default([]),
  accelerationFactors: text("acceleration_factors").array().default([]),
  auditorId: varchar("auditor_id").references(() => users.id),
  complexityFactors: jsonb("complexity_factors").notNull().default({}),
  externalDependencies: text("external_dependencies").array().default([]),
  resourceConstraints: text("resource_constraints").array().default([]),
  completionQualityScore: integer("completion_quality_score").notNull(),
  timelineAccuracyScore: integer("timeline_accuracy_score").notNull(),
  milestoneAdherence: jsonb("milestone_adherence").default({}),
  bufferUtilization: numeric("buffer_utilization", { precision: 5, scale: 2 }),
  predictedAccuracy: numeric("predicted_accuracy", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Best Practices Repository
export const auditBestPractices = pgTable("audit_best_practices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  practiceTitle: text("practice_title").notNull(),
  riskCategory: text("risk_category").notNull(),
  procedureType: text("procedure_type").notNull(),
  bestPracticeText: text("best_practice_text").notNull(),
  successRate: numeric("success_rate", { precision: 5, scale: 2 }).notNull(),
  averageTimeSavings: numeric("average_time_savings", { precision: 5, scale: 2 }).notNull(),
  applicableContexts: text("applicable_contexts").array().notNull(),
  supportingEvidence: text("supporting_evidence"),
  implementationSteps: jsonb("implementation_steps").default([]),
  measurementCriteria: jsonb("measurement_criteria").default({}),
  createdBy: varchar("created_by").references(() => users.id),
  validatedBy: varchar("validated_by").references(() => users.id),
  validationDate: timestamp("validation_date"),
  validationScore: numeric("validation_score", { precision: 5, scale: 2 }),
  usageCount: integer("usage_count").default(0),
  effectivenessRating: numeric("effectiveness_rating", { precision: 5, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pattern Recognition Results
export const identifiedPatterns = pgTable("identified_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patternName: text("pattern_name").notNull(),
  patternType: text("pattern_type").notNull(), // 'success', 'failure', 'seasonal', 'performance', 'risk'
  patternDescription: text("pattern_description").notNull(),
  identificationMethod: text("identification_method").notNull(), // 'rule_based', 'ml_based', 'statistical'
  patternStrength: numeric("pattern_strength", { precision: 5, scale: 2 }).notNull(), // confidence in pattern
  applicabilityScope: text("applicability_scope").notNull(),
  supportingData: jsonb("supporting_data").notNull(),
  statisticalSignificance: numeric("statistical_significance", { precision: 5, scale: 2 }),
  sampleSize: integer("sample_size"),
  correlationFactors: jsonb("correlation_factors").default({}),
  recommendedActions: text("recommended_actions").array().default([]),
  businessImpact: text("business_impact"),
  validationStatus: text("validation_status").notNull().default("identified"), // 'identified', 'validated', 'rejected'
  lastValidated: timestamp("last_validated"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recommendation Feedback and Learning
export const recommendationFeedback = pgTable("recommendation_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recommendationId: varchar("recommendation_id").notNull().references(() => intelligentRecommendations.id),
  feedbackType: text("feedback_type").notNull(), // 'acceptance', 'modification', 'rejection', 'outcome'
  feedbackScore: integer("feedback_score"), // 1-5 rating
  feedbackComments: text("feedback_comments"),
  specificAspects: jsonb("specific_aspects").default({}), // detailed feedback on different aspects
  improvementSuggestions: text("improvement_suggestions"),
  alternativeApproach: text("alternative_approach"),
  providedBy: varchar("provided_by").references(() => users.id),
  contextWhenProvided: jsonb("context_when_provided").default({}),
  outcomeAfterFeedback: jsonb("outcome_after_feedback"),
  feedbackProcessed: boolean("feedback_processed").default(false),
  modelImprovementApplied: boolean("model_improvement_applied").default(false),
  processingNotes: text("processing_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Optimal Timeline Patterns
export const optimalTimelinePatterns = pgTable("optimal_timeline_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patternName: text("pattern_name").notNull(),
  riskCategory: text("risk_category").notNull(),
  complexityLevel: text("complexity_level").notNull(),
  organizationSize: text("organization_size"),
  industryType: text("industry_type"),
  optimalDurationHours: numeric("optimal_duration_hours", { precision: 5, scale: 2 }).notNull(),
  successRate: numeric("success_rate", { precision: 5, scale: 2 }).notNull(),
  patternDescription: text("pattern_description").notNull(),
  applicableConditions: jsonb("applicable_conditions").notNull(),
  performanceMetrics: jsonb("performance_metrics").notNull(),
  keySuccessFactors: text("key_success_factors").array().default([]),
  commonPitfalls: text("common_pitfalls").array().default([]),
  recommendedMilestones: jsonb("recommended_milestones").default([]),
  resourceRequirements: jsonb("resource_requirements").default({}),
  validatedBy: varchar("validated_by").references(() => users.id),
  validationDate: timestamp("validation_date").notNull(),
  validationScore: numeric("validation_score", { precision: 5, scale: 2 }),
  usageCount: integer("usage_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recommendation Effectiveness Tracking
export const recommendationEffectiveness = pgTable("recommendation_effectiveness", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recommendationId: varchar("recommendation_id").notNull().references(() => intelligentRecommendations.id),
  recommendationType: text("recommendation_type").notNull(), // 'procedure', 'auditor', 'timeline'
  auditTestId: varchar("audit_test_id").references(() => auditTests.id),
  recommendationScore: numeric("recommendation_score", { precision: 5, scale: 2 }).notNull(),
  wasAccepted: boolean("was_accepted").notNull(),
  actualOutcomeScore: numeric("actual_outcome_score", { precision: 5, scale: 2 }),
  predictionAccuracy: numeric("prediction_accuracy", { precision: 5, scale: 2 }),
  userSatisfaction: integer("user_satisfaction"), // 1-5 rating
  improvementAchieved: boolean("improvement_achieved"),
  timeSavingsHours: numeric("time_savings_hours", { precision: 5, scale: 2 }),
  qualityImprovement: numeric("quality_improvement", { precision: 5, scale: 2 }),
  costSavings: numeric("cost_savings", { precision: 8, scale: 2 }),
  riskMitigationImprovement: numeric("risk_mitigation_improvement", { precision: 5, scale: 2 }),
  feedbackComments: text("feedback_comments"),
  measuredMetrics: jsonb("measured_metrics").default({}),
  benchmarkComparison: jsonb("benchmark_comparison").default({}),
  longTermImpact: jsonb("long_term_impact"),
  followUpRequired: boolean("follow_up_required").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Learning System Metrics
export const learningSystemMetrics = pgTable("learning_system_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metricName: text("metric_name").notNull(),
  metricType: text("metric_type").notNull(), // 'accuracy', 'performance', 'usage', 'satisfaction'
  modelType: text("model_type").notNull(), // 'procedure', 'auditor', 'timeline', 'all'
  metricValue: numeric("metric_value", { precision: 8, scale: 4 }).notNull(),
  measurementPeriod: text("measurement_period").notNull(), // 'daily', 'weekly', 'monthly'
  periodStartDate: timestamp("period_start_date").notNull(),
  periodEndDate: timestamp("period_end_date").notNull(),
  sampleSize: integer("sample_size"),
  confidenceInterval: jsonb("confidence_interval"),
  trendDirection: text("trend_direction"), // 'improving', 'stable', 'declining'
  benchmarkComparison: numeric("benchmark_comparison", { precision: 5, scale: 2 }),
  targetThreshold: numeric("target_threshold", { precision: 5, scale: 2 }),
  actionRequired: boolean("action_required").default(false),
  notes: text("notes"),
  calculatedBy: varchar("calculated_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit Context Analysis
export const auditContextAnalysis = pgTable("audit_context_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditTestId: varchar("audit_test_id").references(() => auditTests.id),
  contextType: text("context_type").notNull(), // 'organizational', 'risk', 'regulatory', 'industry'
  contextFactors: jsonb("context_factors").notNull(),
  complexityAssessment: jsonb("complexity_assessment").notNull(),
  riskProfile: jsonb("risk_profile").notNull(),
  organizationalFactors: jsonb("organizational_factors").default({}),
  externalFactors: jsonb("external_factors").default({}),
  historicalContext: jsonb("historical_context").default({}),
  stakeholderContext: jsonb("stakeholder_context").default({}),
  resourceContext: jsonb("resource_context").default({}),
  timelineContext: jsonb("timeline_context").default({}),
  qualityRequirements: jsonb("quality_requirements").default({}),
  regulatoryRequirements: jsonb("regulatory_requirements").default({}),
  analysisConfidence: numeric("analysis_confidence", { precision: 5, scale: 2 }).notNull(),
  lastAnalyzed: timestamp("last_analyzed").defaultNow(),
  analyzedBy: varchar("analyzed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============= ZOD SCHEMAS FOR RECOMMENDATION ENGINE =============

// Request validation schemas for recommendation endpoints
export const comprehensiveRecommendationRequestSchema = z.object({
  auditTestId: z.string().min(1, "Audit test ID is required"),
  riskCategory: z.string().optional(),
  complexity: z.enum(['simple', 'moderate', 'complex', 'highly_complex']).optional(),
  timeline: z.object({
    maxDurationHours: z.number().positive().optional(),
    urgencyLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    deadlineFixed: z.boolean().optional(),
    bufferAllowed: z.boolean().optional()
  }).optional(),
  auditorPreferences: z.object({
    preferredSkills: z.array(z.string()).optional(),
    excludedAuditors: z.array(z.string()).optional(),
    teamRequirements: z.string().optional()
  }).optional()
});

export const procedureRecommendationRequestSchema = z.object({
  riskCategory: z.string().min(1, "Risk category is required"),
  complexity: z.enum(['simple', 'moderate', 'complex', 'highly_complex']).default('moderate'),
  historicalContext: z.object({
    previousAudits: z.array(z.string()).optional(),
    successPatterns: z.array(z.string()).optional(),
    failurePatterns: z.array(z.string()).optional()
  }).optional(),
  preferences: z.object({
    preferredMethods: z.array(z.string()).optional(),
    timeConstraints: z.number().positive().optional(),
    qualityRequirements: z.object({
      minimumScore: z.number().min(0).max(100).optional(),
      thoroughnessLevel: z.enum(['basic', 'standard', 'comprehensive', 'exhaustive']).optional()
    }).optional()
  }).optional()
});

export const auditorRecommendationRequestSchema = z.object({
  testRequirements: z.object({
    skillsRequired: z.array(z.string()),
    complexityLevel: z.enum(['simple', 'moderate', 'complex', 'highly_complex']),
    riskCategory: z.string(),
    estimatedHours: z.number().positive().optional()
  }),
  timeline: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    flexibility: z.number().min(0).max(100).optional()
  }).optional(),
  workloadConstraints: z.object({
    maxUtilization: z.number().min(0).max(100).optional(),
    parallelAssignments: z.number().nonnegative().optional()
  }).optional(),
  skillRequirements: z.array(z.object({
    skillName: z.string(),
    requiredLevel: z.number().min(0).max(100),
    criticality: z.enum(['low', 'medium', 'high', 'critical'])
  })).optional()
});

export const timelineRecommendationRequestSchema = z.object({
  auditTest: z.object({
    id: z.string(),
    complexity: z.enum(['simple', 'moderate', 'complex', 'highly_complex']),
    riskCategory: z.string(),
    proceduresCount: z.number().positive().optional(),
    estimatedHours: z.number().positive().optional()
  }),
  assignedAuditor: z.object({
    id: z.string(),
    skillLevel: z.number().min(0).max(100).optional(),
    experience: z.string().optional()
  }).optional(),
  constraints: z.object({
    maxDuration: z.number().positive().optional(),
    fixedDeadline: z.string().datetime().optional(),
    resourceLimitations: z.array(z.string()).optional()
  }).optional(),
  dependencies: z.array(z.object({
    dependsOn: z.string(),
    type: z.enum(['finish_to_start', 'start_to_start', 'finish_to_finish']),
    lag: z.number().optional()
  })).optional()
});

export const recommendationFeedbackRequestSchema = z.object({
  recommendationId: z.string().min(1, "Recommendation ID is required"),
  feedbackType: z.enum(['acceptance', 'modification', 'rejection', 'outcome']),
  satisfactionScore: z.number().min(1).max(5),
  comments: z.string().optional(),
  outcomeData: z.object({
    actualDuration: z.number().positive().optional(),
    actualQuality: z.number().min(0).max(100).optional(),
    successfullyImplemented: z.boolean().optional(),
    issuesEncountered: z.array(z.string()).optional(),
    improvementsSuggested: z.array(z.string()).optional()
  }).optional()
});

export const insertIntelligentRecommendationSchema = createInsertSchema(intelligentRecommendations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMLModelSchema = createInsertSchema(mlModels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProcedurePerformanceHistorySchema = createInsertSchema(procedurePerformanceHistory).omit({
  id: true,
  createdAt: true,
});

export const insertAuditorExpertiseProfileSchema = createInsertSchema(auditorExpertiseProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTimelinePerformanceAnalysisSchema = createInsertSchema(timelinePerformanceAnalysis).omit({
  id: true,
  createdAt: true,
});

export const insertAuditBestPracticeSchema = createInsertSchema(auditBestPractices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIdentifiedPatternSchema = createInsertSchema(identifiedPatterns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecommendationFeedbackSchema = createInsertSchema(recommendationFeedback).omit({
  id: true,
  createdAt: true,
});

export const insertOptimalTimelinePatternSchema = createInsertSchema(optimalTimelinePatterns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecommendationEffectivenessSchema = createInsertSchema(recommendationEffectiveness).omit({
  id: true,
  createdAt: true,
});

export const insertLearningSystemMetricsSchema = createInsertSchema(learningSystemMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertAuditContextAnalysisSchema = createInsertSchema(auditContextAnalysis).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ============= TYPESCRIPT TYPES FOR RECOMMENDATION ENGINE =============

// Core recommendation types
export type IntelligentRecommendation = typeof intelligentRecommendations.$inferSelect;
export type InsertIntelligentRecommendation = z.infer<typeof insertIntelligentRecommendationSchema>;

export type MLModel = typeof mlModels.$inferSelect;
export type InsertMLModel = z.infer<typeof insertMLModelSchema>;

export type ProcedurePerformanceHistory = typeof procedurePerformanceHistory.$inferSelect;
export type InsertProcedurePerformanceHistory = z.infer<typeof insertProcedurePerformanceHistorySchema>;

export type AuditorExpertiseProfile = typeof auditorExpertiseProfiles.$inferSelect;
export type InsertAuditorExpertiseProfile = z.infer<typeof insertAuditorExpertiseProfileSchema>;

export type TimelinePerformanceAnalysis = typeof timelinePerformanceAnalysis.$inferSelect;
export type InsertTimelinePerformanceAnalysis = z.infer<typeof insertTimelinePerformanceAnalysisSchema>;

export type AuditBestPractice = typeof auditBestPractices.$inferSelect;
export type InsertAuditBestPractice = z.infer<typeof insertAuditBestPracticeSchema>;

export type IdentifiedPattern = typeof identifiedPatterns.$inferSelect;
export type InsertIdentifiedPattern = z.infer<typeof insertIdentifiedPatternSchema>;

export type RecommendationFeedback = typeof recommendationFeedback.$inferSelect;
export type InsertRecommendationFeedback = z.infer<typeof insertRecommendationFeedbackSchema>;

export type OptimalTimelinePattern = typeof optimalTimelinePatterns.$inferSelect;
export type InsertOptimalTimelinePattern = z.infer<typeof insertOptimalTimelinePatternSchema>;

export type RecommendationEffectiveness = typeof recommendationEffectiveness.$inferSelect;
export type InsertRecommendationEffectiveness = z.infer<typeof insertRecommendationEffectivenessSchema>;

export type LearningSystemMetrics = typeof learningSystemMetrics.$inferSelect;
export type InsertLearningSystemMetrics = z.infer<typeof insertLearningSystemMetricsSchema>;

export type AuditContextAnalysis = typeof auditContextAnalysis.$inferSelect;
export type InsertAuditContextAnalysis = z.infer<typeof insertAuditContextAnalysisSchema>;

// ============= APPROVAL SYSTEM TYPES AND SCHEMAS =============

// ============= APPROVAL SYSTEM TABLES =============

// Core Approval Policies - Define when and how approvals should happen
export const approvalPolicies = pgTable("approval_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  policyName: text("policy_name").notNull(),
  policyDescription: text("policy_description").notNull(),
  policyType: text("policy_type").notNull(), // 'risk_based', 'finding_severity', 'financial', 'organizational'
  conditions: jsonb("conditions").notNull(), // JSON conditions for rule evaluation
  approvalAction: text("approval_action").notNull(), // 'auto_approve', 'require_review', 'escalate', 'reject'
  escalationLevel: text("escalation_level"), // 'supervisor', 'manager', 'executive', 'board'
  priority: integer("priority").notNull().default(100), // Lower number = higher priority
  isActive: boolean("is_active").notNull().default(true),
  applicableDepartments: text("applicable_departments").array().default([]),
  effectiveDate: timestamp("effective_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  createdBy: varchar("created_by").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert Schema for Approval Policies
export const insertApprovalPolicySchema = createInsertSchema(approvalPolicies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Approval Workflows - Define the approval process flow
export const approvalWorkflows = pgTable("approval_workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workflowName: text("workflow_name").notNull(),
  workflowType: text("workflow_type").notNull(), // 'sequential', 'parallel', 'conditional'
  itemType: text("item_type").notNull(), // 'audit_test', 'audit_finding', 'risk_assessment', 'action_plan'
  approvalSteps: jsonb("approval_steps").notNull(), // Array of approval steps with conditions
  autoEscalationEnabled: boolean("auto_escalation_enabled").notNull().default(true),
  escalationTimeoutHours: integer("escalation_timeout_hours").notNull().default(72),
  bypassConditions: jsonb("bypass_conditions"), // Conditions to bypass approval
  notificationSettings: jsonb("notification_settings").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert Schema for Approval Workflows
export const insertApprovalWorkflowSchema = createInsertSchema(approvalWorkflows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Organizational Approval Hierarchy - Define who can approve what
export const approvalHierarchy = pgTable("approval_hierarchy", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  department: text("department").notNull(),
  approvalLevel: text("approval_level").notNull(), // 'level_1', 'level_2', 'level_3', 'executive'
  approverRole: text("approver_role").notNull(),
  approverUserId: varchar("approver_user_id").references(() => users.id),
  backupApproverUserId: varchar("backup_approver_user_id").references(() => users.id),
  approvalLimits: jsonb("approval_limits").notNull(), // financial, risk level, finding severity limits
  escalationTimeoutHours: integer("escalation_timeout_hours").notNull().default(72),
  autoDelegateEnabled: boolean("auto_delegate_enabled").notNull().default(false),
  delegationConditions: jsonb("delegation_conditions"),
  isActive: boolean("is_active").notNull().default(true),
  effectiveDate: timestamp("effective_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert Schema for Approval Hierarchy
export const insertApprovalHierarchySchema = createInsertSchema(approvalHierarchy).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Approval Delegations - Temporary delegation of approval authority
export const approvalDelegations = pgTable("approval_delegations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  delegatorId: varchar("delegator_id").notNull().references(() => users.id),
  delegateId: varchar("delegate_id").notNull().references(() => users.id),
  delegationScope: text("delegation_scope").notNull(), // 'full', 'limited', 'emergency_only'
  approvalTypes: text("approval_types").array().notNull(),
  monetaryLimit: numeric("monetary_limit", { precision: 12, scale: 2 }),
  riskLevelLimit: text("risk_level_limit"), // 'low', 'medium', 'high', 'critical'
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert Schema for Approval Delegations
export const insertApprovalDelegationSchema = createInsertSchema(approvalDelegations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Main Approval Records - Track all approval decisions and processing
export const approvalRecords = pgTable("approval_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  approvalItemId: varchar("approval_item_id").notNull(), // References the item being approved
  approvalItemType: text("approval_item_type").notNull(), // 'audit_test', 'audit_finding', 'risk_assessment', etc.
  approvalStatus: text("approval_status").notNull(), // 'pending', 'approved', 'rejected', 'escalated', 'expired'
  decisionMethod: text("decision_method").notNull(), // 'automatic', 'manual', 'escalated'
  approvedBy: varchar("approved_by").references(() => users.id),
  approvalReasoning: text("approval_reasoning"),
  riskLevel: text("risk_level").notNull(), // 'low', 'medium', 'high', 'critical'
  severityAnalysis: jsonb("severity_analysis"), // Analysis of finding severity
  policyCompliance: jsonb("policy_compliance"), // Policy compliance check results
  escalationPath: jsonb("escalation_path"), // Escalation path taken if any
  decisionConfidence: numeric("decision_confidence", { precision: 5, scale: 2 }), // 0-100 confidence score
  processingTimeMinutes: integer("processing_time_minutes"),
  approvalDate: timestamp("approval_date"),
  expiryDate: timestamp("expiry_date"),
  approvalConditions: text("approval_conditions").array().default([]),
  followUpRequired: boolean("follow_up_required").notNull().default(false),
  followUpDate: timestamp("follow_up_date"),
  workflowId: varchar("workflow_id").references(() => approvalWorkflows.id),
  policyId: varchar("policy_id").references(() => approvalPolicies.id),
  submittedBy: varchar("submitted_by").notNull().references(() => users.id),
  submittedAt: timestamp("submitted_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert Schema for Approval Records
export const insertApprovalRecordSchema = createInsertSchema(approvalRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Approval Rules - Configurable rules for automatic decision making
export const approvalRules = pgTable("approval_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleName: text("rule_name").notNull(),
  ruleDescription: text("rule_description"),
  ruleType: text("rule_type").notNull(), // 'risk_based', 'severity_based', 'financial', 'time_based'
  conditions: jsonb("conditions").notNull(), // Array of rule conditions
  action: text("action").notNull(), // 'auto_approve', 'require_review', 'escalate', 'reject'
  priority: integer("priority").notNull().default(100), // Rule execution priority
  isActive: boolean("is_active").notNull().default(true),
  applicableContexts: text("applicable_contexts").array().default([]), // Where this rule applies
  effectiveDate: timestamp("effective_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  createdBy: varchar("created_by").references(() => users.id),
  lastModifiedBy: varchar("last_modified_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert Schema for Approval Rules
export const insertApprovalRuleSchema = createInsertSchema(approvalRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Escalation Paths - Track escalation routing and processing
export const escalationPaths = pgTable("escalation_paths", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  approvalRecordId: varchar("approval_record_id").notNull().references(() => approvalRecords.id),
  escalationLevel: text("escalation_level").notNull(), // 'supervisor', 'manager', 'director', 'executive', 'board'
  currentAssignee: varchar("current_assignee").references(() => users.id),
  assignedApprovers: jsonb("assigned_approvers").notNull(), // Array of user IDs assigned to approve
  escalationReason: text("escalation_reason").notNull(),
  urgency: text("urgency").notNull(), // 'low', 'medium', 'high', 'critical'
  timeoutHours: integer("timeout_hours").notNull().default(72),
  nextEscalationLevel: text("next_escalation_level"),
  escalationStatus: text("escalation_status").notNull().default("pending"), // 'pending', 'resolved', 'timeout', 'bypassed'
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"), // 'approved', 'rejected', 'further_escalated'
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Approval Notifications - Track notification delivery for approvals
export const approvalNotifications = pgTable("approval_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  approvalRecordId: varchar("approval_record_id").references(() => approvalRecords.id),
  escalationPathId: varchar("escalation_path_id").references(() => escalationPaths.id),
  notificationType: text("notification_type").notNull(), // 'approval_granted', 'review_required', 'escalation_needed', 'overdue_reminder'
  recipientId: varchar("recipient_id").notNull().references(() => users.id),
  channel: text("channel").notNull(), // 'email', 'push', 'sms', 'in_app'
  subject: text("subject"),
  message: text("message").notNull(),
  sentAt: timestamp("sent_at"),
  deliveryStatus: text("delivery_status").notNull().default("pending"), // 'pending', 'sent', 'delivered', 'failed'
  readAt: timestamp("read_at"),
  actionTaken: text("action_taken"), // 'approved', 'rejected', 'escalated', 'ignored'
  actionTakenAt: timestamp("action_taken_at"),
  reminderCount: integer("reminder_count").notNull().default(0),
  lastReminderAt: timestamp("last_reminder_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Approval Analytics - Performance metrics and insights
export const approvalAnalytics = pgTable("approval_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  department: text("department"),
  approvalType: text("approval_type"), // 'audit_test', 'finding', 'risk_assessment'

  // Volume Metrics
  totalApprovals: integer("total_approvals").notNull(),
  automaticApprovals: integer("automatic_approvals").notNull(),
  manualApprovals: integer("manual_approvals").notNull(),
  escalatedApprovals: integer("escalated_approvals").notNull(),
  rejectedApprovals: integer("rejected_approvals").notNull(),
  expiredApprovals: integer("expired_approvals").notNull(),

  // Time Metrics (in hours)
  averageProcessingTime: numeric("average_processing_time", { precision: 5, scale: 2 }).notNull(),
  medianProcessingTime: numeric("median_processing_time", { precision: 5, scale: 2 }),
  maxProcessingTime: numeric("max_processing_time", { precision: 5, scale: 2 }),

  // Performance Rates (percentages)
  approvalRate: numeric("approval_rate", { precision: 5, scale: 2 }).notNull(),
  escalationRate: numeric("escalation_rate", { precision: 5, scale: 2 }).notNull(),
  automaticApprovalRate: numeric("automatic_approval_rate", { precision: 5, scale: 2 }).notNull(),
  policyComplianceRate: numeric("policy_compliance_rate", { precision: 5, scale: 2 }).notNull(),

  // Breakdown Analysis
  departmentBreakdown: jsonb("department_breakdown").notNull(),
  riskLevelBreakdown: jsonb("risk_level_breakdown").notNull(),
  approverPerformance: jsonb("approver_performance"),
  bottleneckAnalysis: jsonb("bottleneck_analysis"),

  createdAt: timestamp("created_at").defaultNow(),
});

// Approval Audit Trail - Detailed log of all approval-related actions
export const approvalAuditTrail = pgTable("approval_audit_trail", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  approvalRecordId: varchar("approval_record_id").notNull().references(() => approvalRecords.id),
  action: text("action").notNull(), // 'submitted', 'auto_approved', 'manually_approved', 'rejected', 'escalated', 'timeout'
  performedBy: varchar("performed_by").references(() => users.id), // null for automatic actions
  previousStatus: text("previous_status"),
  newStatus: text("new_status").notNull(),
  actionDetails: jsonb("action_details"), // Additional context about the action
  reasoning: text("reasoning"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Approval Performance Metrics - Real-time performance tracking
export const approvalPerformanceMetrics = pgTable("approval_performance_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metricDate: timestamp("metric_date").notNull(),
  approverId: varchar("approver_id").references(() => users.id),
  department: text("department"),

  // Daily Metrics
  approvalsProcessed: integer("approvals_processed").notNull().default(0),
  averageDecisionTime: numeric("average_decision_time", { precision: 5, scale: 2 }), // minutes
  accuracyScore: numeric("accuracy_score", { precision: 5, scale: 2 }), // based on reversals
  workload: integer("workload").notNull().default(0), // pending items
  overdueItems: integer("overdue_items").notNull().default(0),

  // Quality Metrics
  decisionReversals: integer("decision_reversals").notNull().default(0),
  escalationInitiated: integer("escalation_initiated").notNull().default(0),
  policyViolations: integer("policy_violations").notNull().default(0),

  // Satisfaction Metrics
  stakeholderFeedback: numeric("stakeholder_feedback", { precision: 3, scale: 2 }), // 1-5 rating
  processEfficiency: numeric("process_efficiency", { precision: 5, scale: 2 }), // calculated score

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Ensure one record per approver per day
  index("idx_performance_metrics_unique").on(table.approverId, table.metricDate, table.department)
]);

// Process Owners - Dueños de proceso para validación externa
export const processOwners = pgTable("process_owners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  position: text("position"), // Cargo
  company: text("company"), // Empresa (campo legacy, se mantiene por compatibilidad)
  // companyId: varchar("company_id").references(() => fiscalEntities.id), // Referencia a entidad fiscal - TEMPORARILY COMMENTED OUT
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_process_owners_email").on(table.email),
  index("idx_process_owners_active").on(table.isActive),
  index("idx_process_owners_company").on(table.company),
  // Performance: Composite index for common query pattern (active + ordering)
  // index("idx_process_owners_company_id").on(table.companyId) // TEMPORARILY COMMENTED OUT
]);

// Validation Tokens - Tokens para validación externa por email
export const validationTokens = pgTable("validation_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  type: text("type").notNull(), // 'risk', 'control', 'action_plan'
  entityId: varchar("entity_id").notNull(), // ID del riesgo, control o plan de acción
  processOwnerId: varchar("process_owner_id").references(() => processOwners.id), // Opcional para action_plan
  responsibleEmail: text("responsible_email"), // Email del responsable (para action_plan)
  action: text("action"), // 'validated', 'observed', 'rejected' (para action_plan)
  validationData: jsonb("validation_data"), // Datos completos para mostrar al validador
  isUsed: boolean("is_used").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  validationResult: text("validation_result"), // 'validated', 'rejected', 'observed'
  validationComments: text("validation_comments"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_validation_tokens_token").on(table.token),
  index("idx_validation_tokens_entity").on(table.entityId, table.type),
  index("idx_validation_tokens_owner").on(table.processOwnerId),
  index("idx_validation_tokens_email").on(table.responsibleEmail),
  index("idx_validation_tokens_action").on(table.action),
  index("idx_validation_tokens_expiry").on(table.expiresAt),
  index("idx_validation_tokens_used").on(table.isUsed)
]);

// Batch Validation Tokens - Tokens para validación grupal de múltiples entidades
export const batchValidationTokens = pgTable("batch_validation_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  type: text("type").notNull(), // 'action_plan', 'risk', 'control'
  entityIds: text("entity_ids").array().notNull(), // Array de IDs de entidades
  responsibleEmail: text("responsible_email").notNull(), // Email del responsable
  processOwnerId: varchar("process_owner_id").references(() => processOwners.id), // Opcional
  validationData: jsonb("validation_data"), // Datos completos de todas las entidades
  isUsed: boolean("is_used").notNull().default(false),
  partiallyUsed: boolean("partially_used").notNull().default(false), // Si se han validado algunos items
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_batch_validation_tokens_token").on(table.token),
  index("idx_batch_validation_tokens_email").on(table.responsibleEmail),
  index("idx_batch_validation_tokens_type").on(table.type),
  index("idx_batch_validation_tokens_expiry").on(table.expiresAt),
  index("idx_batch_validation_tokens_used").on(table.isUsed)
]);

// Process Owners Schemas
export const insertProcessOwnerSchema = createInsertSchema(processOwners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateProcessOwnerSchema = insertProcessOwnerSchema.partial();

// Validation Tokens Schemas
export const insertValidationTokenSchema = createInsertSchema(validationTokens).omit({
  id: true,
  createdAt: true,
});

export const insertBatchValidationTokenSchema = createInsertSchema(batchValidationTokens).omit({
  id: true,
  createdAt: true,
});

// Process Owners Types
export type ProcessOwner = typeof processOwners.$inferSelect;
export type InsertProcessOwner = typeof processOwners.$inferInsert;

// Validation Tokens Types
export type ValidationToken = typeof validationTokens.$inferSelect;
export type InsertValidationToken = typeof validationTokens.$inferInsert;

export type BatchValidationToken = typeof batchValidationTokens.$inferSelect;
export type InsertBatchValidationToken = typeof batchValidationTokens.$inferInsert;

// Approval System Types
export type ApprovalPolicy = typeof approvalPolicies.$inferSelect;
export type InsertApprovalPolicy = typeof approvalPolicies.$inferInsert;

export type ApprovalWorkflow = typeof approvalWorkflows.$inferSelect;
export type InsertApprovalWorkflow = typeof approvalWorkflows.$inferInsert;

export type ApprovalHierarchy = typeof approvalHierarchy.$inferSelect;
export type InsertApprovalHierarchy = typeof approvalHierarchy.$inferInsert;

export type ApprovalDelegation = typeof approvalDelegations.$inferSelect;
export type InsertApprovalDelegation = typeof approvalDelegations.$inferInsert;

export type ApprovalRecord = typeof approvalRecords.$inferSelect;
export type InsertApprovalRecord = typeof approvalRecords.$inferInsert;

export type ApprovalRule = typeof approvalRules.$inferSelect;
export type InsertApprovalRule = typeof approvalRules.$inferInsert;

export type EscalationPath = typeof escalationPaths.$inferSelect;
export type InsertEscalationPath = typeof escalationPaths.$inferInsert;

export type ApprovalNotification = typeof approvalNotifications.$inferSelect;
export type InsertApprovalNotification = typeof approvalNotifications.$inferInsert;

export type ApprovalAnalytics = typeof approvalAnalytics.$inferSelect;
export type InsertApprovalAnalytics = typeof approvalAnalytics.$inferInsert;

export type ApprovalAuditTrail = typeof approvalAuditTrail.$inferSelect;
export type InsertApprovalAuditTrail = typeof approvalAuditTrail.$inferInsert;

export type ApprovalPerformanceMetrics = typeof approvalPerformanceMetrics.$inferSelect;
export type InsertApprovalPerformanceMetrics = typeof approvalPerformanceMetrics.$inferInsert;

// Extended types with relationships
export interface ApprovalRecordWithDetails extends ApprovalRecord {
  workflow?: ApprovalWorkflow;
  policy?: ApprovalPolicy;
  submittedByUser?: User;
  approvedByUser?: User;
  escalationPaths?: EscalationPath[];
  auditTrail?: ApprovalAuditTrail[];
  notifications?: ApprovalNotification[];
}

export interface EscalationPathWithDetails extends EscalationPath {
  approvalRecord?: ApprovalRecord;
  currentAssigneeUser?: User;
  resolvedByUser?: User;
  notifications?: ApprovalNotification[];
}

export interface ApprovalWorkflowWithDetails extends ApprovalWorkflow {
  approvalRecords?: ApprovalRecord[];
}

export interface ApprovalPolicyWithDetails extends ApprovalPolicy {
  createdByUser?: User;
  approvedByUser?: User;
  approvalRecords?: ApprovalRecord[];
}

// Process structure types with owner information
export interface MacroprocesoWithOwner extends Macroproceso {
  owner?: ProcessOwner | null;
}

export interface ProcessWithOwner extends Process {
  owner?: ProcessOwner | null;
}

export interface SubprocesoWithOwner extends Subproceso {
  owner?: ProcessOwner | null;
}

// Zod Schemas for Approval System will be defined after table definitions

// Additional schemas for approval operations
export const approvalDecisionSchema = z.object({
  decision: z.enum(['auto_approve', 'require_review', 'escalate', 'auto_reject']),
  reasoning: z.string().optional(),
  conditions: z.array(z.string()).optional(),
  followUpRequired: z.boolean().optional(),
  followUpDate: z.string().datetime().optional(),
});

export const escalationRequestSchema = z.object({
  approvalRecordId: z.string().min(1),
  escalationLevel: z.enum(['supervisor', 'manager', 'director', 'executive', 'board']),
  escalationReason: z.string().min(1),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  assignedApprovers: z.array(z.string()).min(1),
});

export const bulkApprovalSchema = z.object({
  itemIds: z.array(z.string()).min(1),
  decision: z.enum(['approve', 'reject', 'escalate']),
  reasoning: z.string().optional(),
  conditions: z.array(z.string()).optional(),
  escalationLevel: z.enum(['supervisor', 'manager', 'director', 'executive', 'board']).optional(),
});

export const approvalFiltersSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'escalated', 'expired']).optional(),
  itemType: z.enum(['audit_test', 'audit_finding', 'risk_assessment', 'action_plan']).optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  dateRange: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  }).optional(),
  department: z.string().optional(),
  submittedBy: z.string().optional(),
});

// Approval System Interfaces
export interface ApprovalItem {
  id: string;
  type: 'audit_test' | 'audit_finding' | 'risk_assessment' | 'action_plan' | 'compliance_test';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  content: any;
  submittedBy: string;
  submittedAt: Date;
  organizationalContext: OrganizationalContext;
  financialImpact?: number;
  regulatoryImplications?: boolean;
  stakeholders?: string[];
}

export interface OrganizationalContext {
  department: string;
  fiscalEntity?: string;
  process?: string;
  macroproceso?: string;
  applicablePolicies: string[];
  complianceRequirements: string[];
}

export interface ApprovalDecision {
  decision: 'auto_approve' | 'require_review' | 'escalate' | 'auto_reject';
  reasoning: string;
  confidence: number; // 0-100
  recommendedAction?: string;
  escalationRequired: boolean;
  policyViolations: string[];
  riskAssessment: RiskAssessment;
  appliedRules: string[];
  conditions?: string[];
  followUpRequired?: boolean;
  followUpDate?: Date;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100
  factors: RiskFactor[];
  mitigationSuggestions: string[];
  complianceImpact: 'none' | 'minor' | 'moderate' | 'significant' | 'critical';
  financialImpact: number;
  reputationalRisk: 'low' | 'medium' | 'high' | 'critical';
}

export interface RiskFactor {
  factor: string;
  weight: number;
  value: number;
  description: string;
}

export interface PolicyComplianceResult {
  isCompliant: boolean;
  violations: PolicyViolation[];
  warnings: PolicyWarning[];
  recommendedActions: string[];
  complianceScore: number; // 0-100
}

export interface PolicyViolation {
  policyId: string;
  policyName: string;
  violationType: 'critical' | 'major' | 'minor';
  description: string;
  remediation: string;
}

export interface PolicyWarning {
  policyId: string;
  policyName: string;
  warningType: 'threshold' | 'recommendation' | 'best_practice';
  description: string;
  suggestion: string;
}

export interface WorkflowResult {
  workflowId: string;
  status: 'completed' | 'in_progress' | 'failed' | 'cancelled';
  currentStep: number;
  totalSteps: number;
  approvalRecords: ApprovalRecord[];
  escalationPaths: EscalationPath[];
  notifications: ApprovalNotification[];
  errors: string[];
  processingTime: number; // minutes
}

export interface NotificationResult {
  notificationId: string;
  recipientId: string;
  channel: 'email' | 'push' | 'sms' | 'in_app';
  status: 'sent' | 'delivered' | 'failed' | 'read';
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  error?: string;
}

export interface ApprovalMetrics {
  totalApprovals: number;
  automaticApprovals: number;
  manualApprovals: number;
  escalatedApprovals: number;
  rejectedApprovals: number;
  expiredApprovals: number;
  averageProcessingTime: number; // hours
  approvalRate: number; // percentage
  escalationRate: number; // percentage
  automaticApprovalRate: number; // percentage
  policyComplianceRate: number; // percentage
  departmentBreakdown: Record<string, number>;
  riskLevelBreakdown: Record<string, number>;
  approverPerformance: Record<string, ApproverPerformance>;
}

export interface ApproverPerformance {
  approverId: string;
  approverName: string;
  approvalsProcessed: number;
  averageDecisionTime: number; // minutes
  accuracyScore: number; // percentage
  workload: number;
  overdueItems: number;
  escalationInitiated: number;
  policyViolations: number;
  stakeholderFeedback: number; // 1-5 rating
}

export interface EscalationRequirement {
  required: boolean;
  level: 'supervisor' | 'manager' | 'director' | 'executive' | 'board';
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  timeoutHours: number;
  assignedApprovers: string[];
}

export interface ApprovalEngineConfig {
  riskThresholds: {
    autoApprove: number; // risk score threshold
    requireReview: number;
    escalateImmediately: number;
  };
  findingSeverityLimits: {
    maxCriticalFindings: number;
    maxHighSeverityFindings: number;
    autoApproveThreshold: number;
  };
  financialThresholds: {
    autoApproveLimit: number;
    manualReviewRequired: number;
    executiveApprovalRequired: number;
  };
  timeConstraints: {
    urgentApprovalTimeLimit: number; // hours
    standardProcessingTime: number; // hours
    escalationTimeLimit: number; // hours
  };
  defaultPolicies: {
    enableAutoApproval: boolean;
    enableEscalation: boolean;
    strictComplianceMode: boolean;
    auditTrailRequired: boolean;
  };
}

export type ApprovalItemType = 'audit_test' | 'audit_finding' | 'risk_assessment' | 'action_plan' | 'compliance_test';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'expired';
export type DecisionMethod = 'automatic' | 'manual' | 'escalated';
export type EscalationLevel = 'supervisor' | 'manager' | 'director' | 'executive' | 'board';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ApprovalAction = 'auto_approve' | 'require_review' | 'escalate' | 'auto_reject';

// ============= INTELLIGENT RECOMMENDATION INTERFACES =============

// Core Audit Context Interface
export interface AuditContext {
  riskProfile: RiskProfile;
  processType: string;
  complexityLevel: 'simple' | 'moderate' | 'complex' | 'highly_complex';
  organizationalContext: OrganizationalContext;
  historicalPerformance: HistoricalData;
  availableResources: ResourceConstraints;
  timelineConstraints: TimelineConstraints;
  qualityRequirements: QualityRequirements;
  regulatoryRequirements: string[];
}

export interface OrganizationalContext {
  organizationSize: 'small' | 'medium' | 'large' | 'enterprise';
  industryType: string;
  riskTolerance: 'low' | 'medium' | 'high';
  complianceLevel: 'basic' | 'standard' | 'enhanced' | 'strict';
  maturityLevel: 'initial' | 'developing' | 'defined' | 'managed' | 'optimized';
}

export interface HistoricalData {
  totalAuditsCompleted: number;
  averageAuditDuration: number; // hours
  successRate: number; // percentage 0-100
  findingsHistory: FindingHistory[];
  performanceMetrics: PerformanceMetrics;
  trendAnalysis: TrendAnalysis;
  complianceHistory: ComplianceHistory[];
}

export interface FindingHistory {
  auditId: string;
  auditDate: Date;
  findingsCount: number;
  criticalFindings: number;
  resolvedFindings: number;
  averageResolutionTime: number; // days
}

export interface PerformanceMetrics {
  qualityScore: number; // 0-100
  efficiencyScore: number; // 0-100
  accuracyScore: number; // 0-100
  timeliness: number; // percentage of on-time completions
}

export interface TrendAnalysis {
  direction: 'improving' | 'stable' | 'declining';
  changeRate: number; // percentage
  forecastedPerformance: number;
  confidenceLevel: number; // 0-100
}

export interface ComplianceHistory {
  regulationId: string;
  complianceRate: number; // percentage
  lastAuditDate: Date;
  trend: 'improving' | 'stable' | 'declining';
}

export interface SkillAvailability {
  skillName: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  availableHours: number;
  auditorId: string;
  auditorName: string;
  certifications: string[];
  experienceYears: number;
  specializations: string[];
  availability: 'full' | 'partial' | 'limited' | 'unavailable';
}

export interface ResourceConstraints {
  budgetLimitation: number;
  timeConstraints: TimelineConstraints;
  skillAvailability: SkillAvailability[];
  toolsAvailable: string[];
  externalDependencies: string[];
}

export interface TimelineConstraints {
  maxDurationHours: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  deadlineFixed: boolean;
  bufferAllowed: boolean;
  parallelExecutionPossible: boolean;
}

export interface QualityRequirements {
  minimumQualityScore: number;
  thoroughnessLevel: 'basic' | 'standard' | 'comprehensive' | 'exhaustive';
  reviewRequirements: 'basic' | 'standard' | 'enhanced' | 'expert';
  documentationLevel: 'minimal' | 'standard' | 'detailed' | 'comprehensive';
}

// Procedure Recommendation Interfaces
export interface ProcedureRecommendation {
  procedureId: string;
  procedureName: string;
  recommendationScore: number; // 0-100
  reasoning: string;
  expectedEffectiveness: number;
  estimatedTimeHours: number;
  requiredSkills: string[];
  alternativeProcedures: AlternativeProcedure[];
  historicalSuccessRate: number;
  riskMitigationLevel: number;
  confidenceLevel: number;
  contextualFactors: ContextualFactor[];
  bestPractices: BestPractice[];
}

export interface AlternativeProcedure {
  procedureId: string;
  procedureName: string;
  score: number;
  tradeoffs: string[];
  benefits: string[];
  limitations: string[];
}

export interface BestPractice {
  practiceId: string;
  title: string;
  description: string;
  applicability: number; // 0-100 how applicable to current context
  expectedImprovement: number;
}

export interface ContextualFactor {
  factorName: string;
  impact: 'positive' | 'negative' | 'neutral';
  strength: number; // 0-100
  description: string;
}

// Auditor Recommendation Interfaces
export interface AuditorRecommendation {
  auditorId: string;
  auditorName: string;
  matchScore: number; // 0-100
  strengths: string[];
  potentialChallenges: string[];
  estimatedPerformance: PerformanceEstimate;
  availabilityStatus: 'fully_available' | 'partially_available' | 'overloaded';
  learningOpportunity: boolean;
  historicalPerformance: HistoricalPerformance;
  skillAlignment: SkillAlignment;
  workloadAnalysis: WorkloadAnalysis;
  teamCompatibility: TeamCompatibility;
}

export interface PerformanceEstimate {
  expectedQualityScore: number;
  expectedCompletionTime: number;
  successProbability: number;
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
}

export interface HistoricalPerformance {
  averageQualityScore: number;
  completionReliability: number;
  timeEstimateAccuracy: number;
  findingsEffectiveness: number;
  clientSatisfaction: number;
  improvementTrend: 'improving' | 'stable' | 'declining';
}

export interface SkillAlignment {
  overallAlignment: number; // 0-100
  criticalSkills: SkillMatch[];
  skillGaps: SkillGap[];
  developmentOpportunities: string[];
}

export interface SkillMatch {
  skillName: string;
  required: number; // 0-100
  actual: number; // 0-100
  gap: number;
  criticality: 'low' | 'medium' | 'high' | 'critical';
}

export interface SkillGap {
  skillName: string;
  gapSize: number;
  impact: 'low' | 'medium' | 'high';
  mitigationOptions: string[];
}

export interface WorkloadAnalysis {
  currentUtilization: number; // 0-100
  availableCapacity: number; // hours
  schedulingFlexibility: number; // 0-100
  overcommitmentRisk: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface TeamCompatibility {
  teamworkScore: number;
  communicationScore: number;
  leadershipPotential: number;
  mentorshipCapability: number;
  culturalFit: number;
}

// Timeline Recommendation Interfaces
export interface TimelineRecommendation {
  recommendedDurationHours: number;
  confidenceLevel: number; // 0-100
  factors: DurationFactor[];
  riskAdjustment: number;
  bufferRecommendation: number;
  milestones: TimelineMilestone[];
  contingencyPlan: ContingencyOption[];
  schedulingStrategy: SchedulingStrategy;
  optimizationOpportunities: OptimizationOpportunity[];
}

export interface DurationFactor {
  factorName: string;
  impact: 'increases' | 'decreases' | 'varies';
  magnitude: number; // percentage impact
  description: string;
  mitigationStrategies: string[];
}

export interface TimelineMilestone {
  milestoneId: string;
  name: string;
  scheduledHours: number;
  description: string;
  dependencies: string[];
  criticality: 'low' | 'medium' | 'high' | 'critical';
  flexibility: number; // 0-100
}

export interface ContingencyOption {
  scenario: string;
  probability: number;
  impact: number; // hours
  responseStrategy: string;
  resources: string[];
}

export interface SchedulingStrategy {
  recommendedSequence: TestSequence[];
  parallelExecutionOpportunities: ParallelExecution[];
  resourceOptimization: ResourceOptimization;
  criticalPath: CriticalPathAnalysis;
  flexibilityPoints: FlexibilityPoint[];
}

export interface TestSequence {
  step: number;
  testId: string;
  estimatedHours: number;
  dependencies: string[];
  alternatives: string[];
}

export interface ParallelExecution {
  testIds: string[];
  savingsHours: number;
  requirements: string[];
  risks: string[];
}

export interface ResourceOptimization {
  resourceType: string;
  optimization: string;
  expectedBenefit: string;
  implementation: string;
}

export interface CriticalPathAnalysis {
  totalDuration: number;
  criticalTests: string[];
  bufferAvailable: number;
  riskPoints: string[];
}

export interface FlexibilityPoint {
  testId: string;
  flexibilityType: 'schedule' | 'resource' | 'scope';
  options: string[];
  impact: string;
}

export interface OptimizationOpportunity {
  opportunityType: 'time' | 'cost' | 'quality' | 'risk';
  description: string;
  expectedBenefit: string;
  implementationEffort: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
}

// Learning and Pattern Recognition Interfaces
export interface AuditProcedure {
  procedureId: string;
  procedureName: string;
  procedureType: 'inspection' | 'inquiry' | 'observation' | 'reperformance' | 'analytical';
  description: string;
  objective: string;
  executedBy: string;
  executionDate: Date;
  duration: number; // hours
  methodology: string;
  toolsUsed: string[];
  sampleSize?: number;
  coverage: number; // percentage of scope covered
  findings: string[];
  exceptions: string[];
  conclusions: string[];
  effectiveness: number; // 0-100 score
  workPapers: string[]; // references to supporting documentation
}

export interface LearningData {
  auditTestId: string;
  recommendedProcedures: ProcedureRecommendation[];
  actualProceduresUsed: AuditProcedure[];
  recommendedAuditor: string;
  actualAuditor: string;
  predictedTimeline: number;
  actualTimeline: number;
  recommendationFollowed: boolean;
  outcomeSuccess: boolean;
  qualityScore: number;
  feedbackReceived: UserFeedback;
  contextFactors: ContextualFactor[];
}

export interface UserFeedback {
  recommendationId: string;
  feedbackType: 'acceptance' | 'modification' | 'rejection' | 'outcome';
  satisfactionScore: number; // 1-5
  comments: string;
  specificAspects: FeedbackAspect[];
  improvementSuggestions: string[];
  alternativeApproach: string;
}

export interface FeedbackAspect {
  aspect: 'accuracy' | 'relevance' | 'timeliness' | 'completeness' | 'usability';
  score: number; // 1-5
  comments: string;
}

export interface Pattern {
  patternId: string;
  patternType: 'success' | 'failure' | 'seasonal' | 'performance' | 'risk';
  description: string;
  strength: number; // 0-100 confidence
  applicabilityScope: string;
  supportingData: PatternData[];
  recommendations: string[];
  businessImpact: string;
}

export interface PatternData {
  dataType: string;
  value: any;
  context: Record<string, any>;
  timestamp: Date;
}

// Model Training and Validation Interfaces
export interface ModelTrainingData {
  modelType: 'procedure_effectiveness' | 'auditor_performance' | 'timeline_prediction';
  trainingSet: TrainingExample[];
  validationSet: ValidationExample[];
  testSet: TestExample[];
  features: FeatureDefinition[];
  hyperparameters: Record<string, any>;
}

export interface TrainingExample {
  input: Record<string, any>;
  expectedOutput: any;
  weight: number;
  context: Record<string, any>;
}

export interface ValidationExample extends TrainingExample {
  validationScore: number;
}

export interface TestExample extends TrainingExample {
  actualOutcome: any;
  predictionAccuracy: number;
}

export interface FeatureDefinition {
  featureName: string;
  featureType: 'numerical' | 'categorical' | 'boolean' | 'text';
  importance: number; // 0-100
  description: string;
  transformations: string[];
}

export interface ModelPerformanceMetrics {
  modelType: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  confusionMatrix: number[][];
  featureImportance: Record<string, number>;
  validationErrors: ValidationError[];
  recommendedImprovements: string[];
}

export interface ValidationError {
  errorType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedCases: number;
  suggestedFix: string;
}

// Comprehensive Recommendation Interface
export interface ComprehensiveRecommendation {
  auditTestId: string;
  procedureRecommendations: ProcedureRecommendation[];
  auditorRecommendations: AuditorRecommendation[];
  timelineRecommendation: TimelineRecommendation;
  overallScore: number;
  reasoning: string;
  riskAssessment: RiskAssessment;
  successProbability: number;
  alternativeStrategies: AlternativeStrategy[];
  implementationPlan: ImplementationPlan;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  mitigationStrategies: MitigationStrategy[];
  contingencyPlans: ContingencyPlan[];
}

export interface RiskFactor {
  factorName: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  probability: number; // 0-100
  impact: number; // 0-100
  description: string;
  indicators: string[];
}

export interface MitigationStrategy {
  strategyName: string;
  applicableRisks: string[];
  effectiveness: number; // 0-100
  implementationEffort: 'low' | 'medium' | 'high';
  cost: number;
  description: string;
}

export interface ContingencyPlan {
  scenario: string;
  triggerConditions: string[];
  responseActions: string[];
  resourceRequirements: string[];
  timeline: string;
}

export interface AlternativeStrategy {
  strategyName: string;
  description: string;
  pros: string[];
  cons: string[];
  applicability: number; // 0-100
  expectedOutcome: ExpectedOutcome;
}

export interface ExpectedOutcome {
  qualityScore: number;
  durationHours: number;
  successProbability: number;
  riskLevel: 'low' | 'medium' | 'high';
  resourceRequirements: ResourceRequirement[];
}

export interface ResourceRequirement {
  resourceType: 'human' | 'technical' | 'financial' | 'time';
  quantity: number;
  skillLevel: string;
  availability: 'available' | 'limited' | 'unavailable';
}

export interface ImplementationPlan {
  phases: ImplementationPhase[];
  totalDuration: number;
  resourceAllocation: ResourceAllocation[];
  qualityGates: QualityGate[];
  riskMonitoring: RiskMonitoringPlan;
}

export interface ImplementationPhase {
  phaseId: string;
  phaseName: string;
  description: string;
  durationHours: number;
  dependencies: string[];
  deliverables: string[];
  qualityCriteria: string[];
}

export interface ResourceAllocation {
  resourceType: string;
  allocatedTo: string;
  quantity: number;
  timeframe: string;
  responsibilities: string[];
}

export interface QualityGate {
  gateId: string;
  gateName: string;
  criteria: QualityGateCriteria[];
  approver: string;
  consequences: string[];
}

export interface QualityGateCriteria {
  criteriaName: string;
  measurementMethod: string;
  threshold: number;
  importance: 'low' | 'medium' | 'high' | 'critical';
}

export interface RiskMonitoringPlan {
  monitoringFrequency: string;
  keyIndicators: string[];
  escalationProcedures: EscalationProcedure[];
  reportingRequirements: string[];
}

export interface EscalationProcedure {
  triggerCondition: string;
  escalationLevel: 'team' | 'supervisor' | 'manager' | 'executive';
  responseTime: string;
  actions: string[];
}

// ============= ADDITIONAL INTERFACES FOR AUTOMATIC AUDIT TEST GENERATION =============

// Risk Classification Interface
export interface RiskClassification {
  category: 'financial' | 'operational' | 'compliance' | 'strategic' | 'reputational' | 'it_security';
  complexity: 'simple' | 'moderate' | 'complex' | 'highly_complex';
  auditScope: 'substantive' | 'controls' | 'hybrid';
  priority: 'low' | 'medium' | 'high' | 'critical';
  controlEnvironment: 'strong' | 'adequate' | 'weak' | 'deficient';
}

// Risk Profile Interface
export interface RiskProfile extends RiskClassification {
  riskId: string;
  requiredSkills: string[];
  estimatedHours: number;
  toolsNeeded: string[];
  controlGaps: string[];
  controlStrength: number;
  inherentRiskScore: number;
  residualRiskScore: number;
  riskTrend: 'increasing' | 'stable' | 'decreasing';
  historicalIssues: string[];
  regulatoryRequirements: string[];
  complianceLevel: 'basic' | 'standard' | 'enhanced' | 'strict';
  confidenceScore: number;
  analysisMethod: 'rule_based' | 'ml_based' | 'hybrid';
  recommendedTemplates: string[];
}

// Test Generation Parameters
export interface GenerationParams {
  auditId: string;
  selectedRisks: string[];
  generationType: 'auto' | 'semi_auto' | 'manual_assisted';
  scopeFilters: Record<string, any>;
  generationRules: Record<string, any>;
  customizations: Record<string, any>;
  algorithmVersion: string;
  aiAssistanceLevel: 'none' | 'basic' | 'standard' | 'advanced';
  qualityThreshold: number;
}

// Generated Test Result
export interface GeneratedTestResult {
  auditTestId: string;
  templateId: string;
  riskId: string;
  generationMethod: 'auto' | 'customized' | 'manual';
  customizationLevel: 'none' | 'minimal' | 'moderate' | 'extensive';
  customizations: Record<string, any>;
  generationScore: number;
  validationPassed: boolean;
  issuesFound: string[];
  estimatedHours: number;
  procedures: TemplateProcedure[];
}

// Template Effectiveness Metrics
export interface TemplateEffectiveness {
  templateId: string;
  usageCount: number;
  successRate: number;
  avgTimeToComplete: number;
  avgCustomizationRate: number;
  userSatisfactionScore: number;
  commonCustomizations: Record<string, number>;
  improvementSuggestions: string[];
}

// Generation Session Summary
export interface GenerationSessionSummary {
  sessionId: string;
  testsGenerated: number;
  templatesUsed: string[];
  totalEstimatedHours: number;
  averageGenerationScore: number;
  customizationRate: number;
  validationPassRate: number;
  topIssues: string[];
  performanceMetrics: {
    generationTimeSeconds: number;
    userInteractions: number;
    algorithmEfficiency: number;
  };
}

// Risk Analysis Engine Interface
export interface RiskAnalysisEngine {
  analyzeRiskProfile(riskId: string): Promise<RiskProfile>;
  identifyTestRequirements(risks: Risk[]): Promise<TestRequirement[]>;
  generateTestTemplates(requirements: TestRequirement[]): Promise<AuditTestTemplate[]>;
  classifyRiskType(risk: Risk): RiskClassification;
  determineTestComplexity(risk: Risk): 'simple' | 'moderate' | 'complex' | 'highly_complex';
  assessControlGaps(risk: Risk): Promise<string[]>;
}

// Test Requirement Interface
export interface TestRequirement {
  riskId: string;
  testType: 'substantive' | 'controls' | 'hybrid';
  evidenceTypes: ('documentary' | 'observational' | 'inquiry' | 'analytical')[];
  testingMethods: ('sampling' | 'walkthrough' | 'substantive' | 'controls_testing')[];
  skillsRequired: string[];
  estimatedHours: number;
  toolsNeeded: string[];
  regulatoryRequirements: string[];
  minimumProcedures: number;
  reviewLevel: 'basic' | 'standard' | 'comprehensive' | 'exhaustive';
}

// Audit Procedure Interface
export interface AuditProcedureDefinition {
  stepNumber: number;
  procedureText: string;
  expectedOutcome: string;
  evidenceType: 'documentary' | 'observational' | 'inquiry' | 'analytical';
  testingMethod: 'sampling' | 'walkthrough' | 'substantive' | 'controls_testing';
  category: 'preparation' | 'execution' | 'conclusion' | 'follow_up';
  skillLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
  estimatedMinutes: number;
  toolsRequired: string[];
  isMandatory: boolean;
  isCustomizable: boolean;
  alternativeProcedures: string[];
  guidance: string;
  commonIssues: string[];
  evidenceRequirements: string;
}

// Template with Details Interface
export interface AuditTestTemplateWithDetails extends AuditTestTemplate {
  category: AuditTestTemplateCategory;
  procedures: TemplateProcedure[];
  customizations: TemplateCustomization[];
  effectiveness: TemplateEffectiveness;
}

// Generation Algorithm Interface
export interface GenerationAlgorithm {
  name: string;
  version: string;
  algorithmType: 'rule_based' | 'ml_based' | 'hybrid';
  config: Record<string, any>;
  weights: Record<string, number>;
  thresholds: Record<string, number>;

  // Core Methods
  generateTests(params: GenerationParams): Promise<GeneratedTestResult[]>;
  selectTemplates(requirements: TestRequirement[]): Promise<AuditTestTemplate[]>;
  customizeTemplate(template: AuditTestTemplate, riskProfile: RiskProfile): Promise<AuditTestTemplate>;
  validateGeneration(results: GeneratedTestResult[]): Promise<ValidationResult[]>;
}

// Validation Result Interface
export interface ValidationResult {
  isValid: boolean;
  score: number;
  issues: {
    level: 'error' | 'warning' | 'info';
    message: string;
    field?: string;
    suggestion?: string;
  }[];
  recommendations: string[];
  qualityMetrics: {
    completeness: number;
    consistency: number;
    relevance: number;
    practicality: number;
  };
}

// ============= AI UNIFIED DOCUMENT INTERFACE =============

/**
 * Unified interface for AI document aggregation from all risk management sources
 * Normalizes documents from compliance, regulations, risks, controls, audit findings, and attachments
 */
export interface AIDocument {
  /** Unique identifier from the source table */
  id: string;
  /** Source type indicating the origin table */
  type: 'compliance' | 'regulation' | 'risk' | 'control' | 'audit_finding' | 'audit_attachment' | 'audit_test_attachment';
  /** Display title/name of the document */
  title: string;
  /** Categories/tags for classification */
  category: string[];
  /** Process hierarchy references (macroproceso/process/subproceso IDs) */
  scopeRefs: string[];
  /** Main text content for AI analysis */
  content: string;
  /** File URL for content extraction (if applicable) */
  fileUrl?: string;
  /** Additional metadata specific to document type */
  metadata?: {
    // For compliance documents
    classification?: string;
    area?: string;
    appliesToAllMacroprocesos?: boolean;

    // For regulations
    issuingOrganization?: string;
    criticality?: string;
    law?: string;
    article?: string;

    // For risks
    probability?: number;
    impact?: number;
    inherentRisk?: number;
    status?: string;

    // For controls
    type?: string;
    frequency?: string;
    effectiveness?: number;

    // For audit findings
    severity?: string;
    findingType?: string;
    auditId?: string;

    // For attachments
    mimeType?: string;
    fileSize?: number;
    isConfidential?: boolean;
    attachmentCategory?: string;
  };
  /** When the document was created */
  createdAt?: Date;
  /** When the document was last updated */
  updatedAt?: Date;
  /** User who created/uploaded the document */
  createdBy?: string;
}

// Risk Events - Para registrar riesgos materializados, fraudes y delitos
export const riskEvents = pgTable("risk_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(), // Código único del evento (E-0001, E-0002, etc.)
  eventDate: timestamp("event_date").notNull(), // Fecha del evento
  riskId: varchar("risk_id").notNull().references(() => risks.id), // Riesgo materializado
  controlId: varchar("control_id").references(() => controls.id), // Control que falló (opcional)
  processId: varchar("process_id").references(() => processes.id), // Proceso donde ocurrió (mantenido para compatibilidad)
  involvedPersons: text("involved_persons").notNull(), // Personas involucradas
  eventType: text("event_type").notNull(), // "materializado", "fraude", "delito"
  description: text("description").notNull(), // Descripción del evento
  severity: text("severity").notNull().default("media"), // "baja", "media", "alta", "critica"
  status: text("status").notNull().default("abierto"), // "abierto", "en_investigacion", "cerrado", "escalado"
  reportedBy: text("reported_by"), // Quien reportó (opcional, no siempre es un usuario registrado)
  investigatedBy: varchar("investigated_by").references(() => users.id), // Quien investiga (opcional)
  resolutionNotes: text("resolution_notes"), // Notas de resolución
  estimatedLoss: numeric("estimated_loss"), // Pérdida estimada
  actualLoss: numeric("actual_loss"), // Pérdida real

  // Bow Tie Analysis - Campos para análisis de causas y consecuencias
  causas: text("causas").array().default([]), // Array de causas/amenazas que dispararon el evento
  consecuencias: text("consecuencias").array().default([]), // Array de consecuencias/efectos del evento

  // Auditoría y soft-delete
  createdBy: varchar("created_by").notNull().references(() => users.id).default('user-1'),
  updatedBy: varchar("updated_by").references(() => users.id),
  deletedBy: varchar("deleted_by").references(() => users.id),
  deletedAt: timestamp("deleted_at"),
  deletionReason: text("deletion_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
]);

// Relaciones muchos-a-muchos para eventos de riesgo con macroprocesos
export const riskEventMacroprocesos = pgTable("risk_event_macroprocesos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riskEventId: varchar("risk_event_id").notNull().references(() => riskEvents.id),
  macroprocesoId: varchar("macroproceso_id").notNull().references(() => macroprocesos.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relaciones muchos-a-muchos para eventos de riesgo con procesos
export const riskEventProcesses = pgTable("risk_event_processes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riskEventId: varchar("risk_event_id").notNull().references(() => riskEvents.id),
  processId: varchar("process_id").notNull().references(() => processes.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relaciones muchos-a-muchos para eventos de riesgo con subprocesos
export const riskEventSubprocesos = pgTable("risk_event_subprocesos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riskEventId: varchar("risk_event_id").notNull().references(() => riskEvents.id),
  subprocesoId: varchar("subproceso_id").notNull().references(() => subprocesos.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relaciones muchos-a-muchos para eventos de riesgo con riesgos asociados
export const riskEventRisks = pgTable("risk_event_risks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riskEventId: varchar("risk_event_id").notNull().references(() => riskEvents.id),
  riskId: varchar("risk_id").notNull().references(() => risks.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas para Risk Events
export const insertRiskEventSchema = createInsertSchema(riskEvents).omit({
  id: true,
  code: true,
  createdBy: true,
  updatedBy: true,
  deletedBy: true,
  deletedAt: true,
  deletionReason: true,
  createdAt: true,
  updatedAt: true,
});

// Tipos para las tablas de relación de eventos de riesgo
export type RiskEventMacroproceso = typeof riskEventMacroprocesos.$inferSelect;
export type RiskEventProcess = typeof riskEventProcesses.$inferSelect;
export type RiskEventSubproceso = typeof riskEventSubprocesos.$inferSelect;
export type RiskEventRisk = typeof riskEventRisks.$inferSelect;

// Criterios de evaluación de probabilidad (dinámicos)
export const probabilityCriteria = pgTable("probability_criteria", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Nombre del criterio (ej: "Frecuencia de Ocurrencia")
  fieldName: text("field_name").notNull().unique(), // Nombre del campo en tabla risks (ej: "frequency_occurrence")
  description: text("description"), // Descripción detallada del criterio
  weight: integer("weight").notNull(), // Peso del criterio (1-99)
  order: integer("order").notNull(), // Orden de visualización y procesamiento
  isActive: boolean("is_active").notNull().default(true), // Si está activo

  // Descripciones personalizables para los 5 niveles de evaluación
  level1Description: text("level1_description"), // Nivel 1 (Muy bajo)
  level2Description: text("level2_description"), // Nivel 2 (Bajo)
  level3Description: text("level3_description"), // Nivel 3 (Moderado)
  level4Description: text("level4_description"), // Nivel 4 (Alto)
  level5Description: text("level5_description"), // Nivel 5 (Muy alto)

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schema para criterios de probabilidad
export const insertProbabilityCriteriaSchema = createInsertSchema(probabilityCriteria).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Tipos para los criterios de probabilidad
export type ProbabilityCriteria = typeof probabilityCriteria.$inferSelect;
export type InsertProbabilityCriteria = z.infer<typeof insertProbabilityCriteriaSchema>;

// Criterios de evaluación de impacto (7 criterios específicos)
export const impactCriteria = pgTable("impact_criteria", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Nombre del criterio (ej: "Infrastructure", "Reputation", etc.)
  fieldName: text("field_name").notNull().unique(), // Nombre técnico (ej: "infrastructure", "reputation")
  description: text("description"), // Descripción detallada del criterio
  weight: integer("weight").notNull(), // Peso del criterio (1-99)
  order: integer("order").notNull(), // Orden de visualización
  isActive: boolean("is_active").notNull().default(true), // Si está activo

  // Descripciones personalizables para los 5 niveles de evaluación
  level1Description: text("level1_description"), // Nivel 1 (Muy bajo)
  level2Description: text("level2_description"), // Nivel 2 (Bajo)
  level3Description: text("level3_description"), // Nivel 3 (Moderado)
  level4Description: text("level4_description"), // Nivel 4 (Alto)
  level5Description: text("level5_description"), // Nivel 5 (Muy alto)

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schema para criterios de impacto
export const insertImpactCriteriaSchema = createInsertSchema(impactCriteria).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Tipos para los criterios de impacto
export type ImpactCriteria = typeof impactCriteria.$inferSelect;
export type InsertImpactCriteria = z.infer<typeof insertImpactCriteriaSchema>;

// ============= TABLAS JUNCTION PARA ASOCIACIONES MÚLTIPLES =============

// NOTA: La tabla riskProcessLinks (definida arriba) maneja las asociaciones riesgo-proceso

// Asociaciones control-proceso con validación y autoevaluación independiente por proceso
export const controlProcesses = pgTable("control_processes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  controlId: varchar("control_id").notNull().references(() => controls.id, { onDelete: "cascade" }),

  // Referencia flexible a diferentes niveles de proceso (solo uno debe tener valor)
  macroprocesoId: varchar("macroproceso_id").references(() => macroprocesos.id),
  processId: varchar("process_id").references(() => processes.id),
  subprocesoId: varchar("subproceso_id").references(() => subprocesos.id),

  // Validación específica para esta combinación control-proceso
  validationStatus: text("validation_status").notNull().default("pending_validation"), // pending_validation, validated, rejected
  validatedBy: varchar("validated_by").references(() => users.id),
  validatedAt: timestamp("validated_at"),
  validationComments: text("validation_comments"),

  // Autoevaluación específica para esta combinación control-proceso
  selfEvaluationStatus: text("self_evaluation_status").notNull().default("pending"), // pending, completed, overdue
  selfEvaluatedBy: varchar("self_evaluated_by").references(() => users.id),
  selfEvaluatedAt: timestamp("self_evaluated_at"),
  selfEvaluationComments: text("self_evaluation_comments"),
  selfEvaluationScore: integer("self_evaluation_score"), // 0-100 effectiveness score for this process

  // Programación de evaluaciones
  nextEvaluationDate: timestamp("next_evaluation_date"),
  evaluationFrequencyMonths: integer("evaluation_frequency_months").default(12), // Frecuencia de autoevaluación

  // Metadatos
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Un control puede asociarse una sola vez a cada proceso específico
  uniqueControlProcess: uniqueIndex("unique_control_process").on(table.controlId, table.macroprocesoId, table.processId, table.subprocesoId),
  // Índices para optimizar consultas
  controlIdx: index("control_processes_control_idx").on(table.controlId),
  processIdx: index("control_processes_process_idx").on(table.macroprocesoId, table.processId, table.subprocesoId),
  validationStatusIdx: index("control_processes_validation_status_idx").on(table.validationStatus),
  selfEvaluationStatusIdx: index("control_processes_self_evaluation_status_idx").on(table.selfEvaluationStatus),
  nextEvaluationIdx: index("control_processes_next_evaluation_idx").on(table.nextEvaluationDate),
}));

// ============= INSERT SCHEMAS PARA ASOCIACIONES MÚLTIPLES =============

// NOTA: Esquema removido - usar insertRiskProcessLinkSchema en su lugar
// export const insertRiskProcessSchema = createInsertSchema(riskProcesses).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

export const insertControlProcessSchema = createInsertSchema(controlProcesses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ============= TIPOS PARA ASOCIACIONES MÚLTIPLES =============

// NOTA: Tipos removidos - usar RiskProcessLink en su lugar
// export type RiskProcess = typeof riskProcesses.$inferSelect;
// export type InsertRiskProcess = z.infer<typeof insertRiskProcessSchema>;

export type ControlProcess = typeof controlProcesses.$inferSelect;
export type InsertControlProcess = z.infer<typeof insertControlProcessSchema>;

// NOTA: Tipo removido - usar RiskProcessLinkWithDetails en su lugar
// export type RiskProcessWithDetails = RiskProcess & {
//   risk: Risk;
//   macroproceso?: Macroproceso;
//   process?: Process;
//   subproceso?: Subproceso;
//   validatedByUser?: User;
// };

export type ControlProcessWithDetails = ControlProcess & {
  control: Control;
  macroproceso?: Macroproceso;
  process?: Process;
  subproceso?: Subproceso;
  validatedByUser?: User;
  selfEvaluatedByUser?: User;
};

// ============= ESQUEMAS DE VALIDACIÓN MEJORADOS =============

// Esquemas específicos para actualizaciones - previenen overposting
export const updateRiskProcessSchema = z.object({
  riskId: z.string().min(1).optional(),
  macroprocesoId: z.string().min(1).optional(),
  processId: z.string().min(1).optional(), 
  subprocesoId: z.string().min(1).optional(),
  notes: z.string().optional(),
}).refine(data => 
  Object.values(data).some(value => value !== undefined),
  { message: "Al menos un campo debe ser actualizado" }
);

export const updateControlProcessSchema = z.object({
  controlId: z.string().min(1).optional(),
  macroprocesoId: z.string().min(1).optional(),
  processId: z.string().min(1).optional(),
  subprocesoId: z.string().min(1).optional(),
  notes: z.string().optional(),
  evaluationFrequencyMonths: z.number().min(1).max(60).optional(), // Entre 1 y 60 meses
}).refine(data => 
  Object.values(data).some(value => value !== undefined),
  { message: "Al menos un campo debe ser actualizado" }
);

// Esquema para filtros de proceso con validación de jerarquía
export const processFilterSchema = z.object({
  macroprocesoId: z.string().min(1).optional(),
  processId: z.string().min(1).optional(),
  subprocesoId: z.string().min(1).optional(),
}).refine(data => {
  const { macroprocesoId, processId, subprocesoId } = data;

  // Al menos uno debe estar presente
  if (!macroprocesoId && !processId && !subprocesoId) {
    return false;
  }

  // Si hay subproceso, debe haber proceso
  if (subprocesoId && !processId) {
    return false;
  }

  // Si hay proceso, debe haber macroproceso
  if (processId && !macroprocesoId) {
    return false;
  }

  return true;
}, {
  message: "Jerarquía de procesos inválida: macroproceso > proceso > subproceso"
});

// Esquemas para validación (solo campos permitidos)
export const validateRiskProcessSchema = z.object({
  validationStatus: z.enum(["validated", "rejected"]),
  validationComments: z.string().optional(),
});

export const validateControlProcessSchema = z.object({
  validationStatus: z.enum(["validated", "rejected"]),
  validationComments: z.string().optional(),
});

// Esquema específico para autoevaluación de controles
export const controlProcessSelfEvaluationSchema = z.object({
  selfEvaluationStatus: z.enum(["passed", "failed", "partial"]).optional(),
  selfEvaluationComments: z.string().max(2000).optional(), // Límite de caracteres
  selfEvaluationScore: z.number().min(0).max(100).optional(), // Porcentaje 0-100
  nextEvaluationDate: z.string().datetime().optional(), // ISO datetime string
}).refine(data => 
  Object.values(data).some(value => value !== undefined),
  { message: "Al menos un campo de autoevaluación debe ser actualizado" }
);

// ============= SCHEMAS PARA VALIDACIÓN CENTRADA EN PROCESOS =============

export const validateProcessValidationSchema = z.object({
  validationStatus: z.enum(["pending", "in_progress", "completed"]),
  assignedValidator: z.string().min(1).optional(),
});

export const validateProcessRiskValidationSchema = z.object({
  validationStatus: z.enum(["validated", "rejected"]),
  validationComments: z.string().max(2000).optional(),
  processContext: z.string().max(1000).optional(),
});

export const validateProcessControlValidationSchema = z.object({
  validationStatus: z.enum(["validated", "rejected"]),
  validationComments: z.string().max(2000).optional(),
  processContext: z.string().max(1000).optional(),
  effectivenessInProcess: z.number().min(0).max(100).optional(),
});

// Tipos para los nuevos esquemas
export type UpdateRiskProcess = z.infer<typeof updateRiskProcessSchema>;
export type UpdateControlProcess = z.infer<typeof updateControlProcessSchema>;
export type ProcessFilter = z.infer<typeof processFilterSchema>;
export type ValidateRiskProcess = z.infer<typeof validateRiskProcessSchema>;
export type ValidateControlProcess = z.infer<typeof validateControlProcessSchema>;
export type ControlProcessSelfEvaluation = z.infer<typeof controlProcessSelfEvaluationSchema>;

export const aiDocumentSchema = z.object({
  id: z.string(),
  type: z.enum(['compliance', 'regulation', 'risk', 'control', 'audit_finding', 'audit_attachment', 'audit_test_attachment']),
  title: z.string(),
  category: z.array(z.string()).default([]),
  scopeRefs: z.array(z.string()).default([]),
  content: z.string(),
  fileUrl: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  createdBy: z.string().optional(),
});

// ============= SCHEMAS Y TIPOS PARA RISK PROCESS LINKS =============

// Base schema sin validación de jerarquía
const baseRiskProcessLinkSchema = createInsertSchema(riskProcessLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRiskProcessLinkSchema = baseRiskProcessLinkSchema.refine(data => {
  // Asegurar que exactamente uno de los campos de proceso esté presente
  const processFields = [data.macroprocesoId, data.processId, data.subprocesoId].filter(Boolean);
  return processFields.length === 1;
}, {
  message: "Exactamente uno de macroprocesoId, processId o subprocesoId debe estar presente",
  path: ["processHierarchy"]
});

export const updateRiskProcessLinkSchema = baseRiskProcessLinkSchema.partial().extend({
  id: z.string(),
}).refine(data => {
  // Si se proporciona cualquier campo de proceso, asegurar que exactamente uno esté presente
  const processFields = [data.macroprocesoId, data.processId, data.subprocesoId].filter(Boolean);
  if (processFields.length > 0) {
    return processFields.length === 1;
  }
  return true; // Si no se proporciona ningún campo de proceso, permitir la actualización
}, {
  message: "Si se actualiza la jerarquía de proceso, exactamente uno de macroprocesoId, processId o subprocesoId debe estar presente",
  path: ["processHierarchy"]
});

export const validateRiskProcessLinkSchema = z.object({
  validationStatus: z.enum(["validated", "rejected"]),
  validationComments: z.string().max(2000).optional(),
});

// Tipos TypeScript
export type RiskProcessLink = typeof riskProcessLinks.$inferSelect;
export type InsertRiskProcessLink = z.infer<typeof insertRiskProcessLinkSchema>;
export type UpdateRiskProcessLink = z.infer<typeof updateRiskProcessLinkSchema>;
export type ValidateRiskProcessLink = z.infer<typeof validateRiskProcessLinkSchema>;

// Tipo extendido con información de relaciones
export type RiskProcessLinkWithDetails = RiskProcessLink & {
  risk: { id: string; code: string; name: string; };
  macroproceso?: { id: string; name: string; };
  process?: { id: string; name: string; };
  subproceso?: { id: string; name: string; };
  responsibleUser?: { id: string; fullName: string; email: string; };
  validatedByUser?: { id: string; fullName: string; email: string; };
};

// ============= SCHEMAS Y TIPOS PARA RISK PROCESS LINK VALIDATION HISTORY =============

export const insertRiskProcessLinkValidationHistorySchema = createInsertSchema(riskProcessLinkValidationHistory).omit({
  id: true,
  createdAt: true,
});

// Tipos TypeScript
export type RiskProcessLinkValidationHistory = typeof riskProcessLinkValidationHistory.$inferSelect;
export type InsertRiskProcessLinkValidationHistory = z.infer<typeof insertRiskProcessLinkValidationHistorySchema>;

// Tipo extendido con información de relaciones para el historial
export type RiskProcessLinkValidationHistoryWithDetails = RiskProcessLinkValidationHistory & {
  validatedByUser: { id: string; fullName: string; email: string; };
  riskProcessLink?: {
    id: string;
    risk: { id: string; code: string; name: string; };
    macroproceso?: { id: string; name: string; };
    process?: { id: string; name: string; };
    subproceso?: { id: string; name: string; };
  };
};

// Tabla para sesiones de importación de Excel
export const importSessions = pgTable("import_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: text("file_name").notNull(),
  originalFileName: text("original_file_name").notNull(),
  status: text("status").notNull().default("uploading"), // uploading, validating, processing, completed, failed
  progress: integer("progress").notNull().default(0), // 0-100
  userId: varchar("user_id").notNull().references(() => users.id),
  isDryRun: boolean("is_dry_run").notNull().default(true),
  summary: jsonb("summary"), // Resumen de creados, actualizados, omitidos, errores
  errors: jsonb("errors"), // Array de errores detallados
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Esquemas Zod para importaciones
export const insertImportSessionSchema = createInsertSchema(importSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateImportSessionSchema = createInsertSchema(importSessions).partial().extend({
  id: z.string(),
});

// Tipos TypeScript para importaciones
export type ImportSession = typeof importSessions.$inferSelect;
export type InsertImportSession = z.infer<typeof insertImportSessionSchema>;
export type UpdateImportSession = z.infer<typeof updateImportSessionSchema>;

// ========================================
// COMPLIANCE SECTION - Crime Prevention Officers
// ========================================

// Categorías de delitos para especialización
export const crimeCategories = pgTable("crime_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // "Lavado de Activos", "Cohecho", etc.
  code: text("code").notNull().unique(), // "LAV_ACT", "COH", etc.
  description: text("description"),
  parentCategoryId: varchar("parent_category_id").references((): any => crimeCategories.id), // Para subcategorías
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
]);

// Encargados de prevención de delitos con estructura jerárquica
export const complianceOfficers = pgTable("compliance_officers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // DEPRECATED: Use complianceOfficerFiscalEntities junction table instead
  // Kept for backward compatibility during migration
  fiscalEntityId: varchar("fiscal_entity_id").references(() => fiscalEntities.id),
  roleType: text("role_type").notNull(), // "encargado_prevencion", "oficial_cumplimiento", "sujeto_responsable"
  scope: text("scope").notNull().default("general"), // "general", "specialized"
  hierarchyLevel: integer("hierarchy_level").notNull().default(1), // 1=Principal, 2=Coordinador, 3=Especialista
  reportsToId: varchar("reports_to_id").references((): any => complianceOfficers.id), // Superior jerárquico

  // Datos del encargado
  userId: varchar("user_id").references(() => users.id), // Usuario del sistema (opcional)
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  title: text("title"), // Cargo en la empresa
  phone: text("phone"),

  // Plazo de asignación
  assignmentStartDate: timestamp("assignment_start_date").notNull(),
  assignmentEndDate: timestamp("assignment_end_date"), // null = indefinido

  // Categorías de delito (solo para especialistas)
  crimeCategories: text("crime_categories").array().default([]), // Array de IDs de categorías

  status: text("status").notNull().default("active"), // "active", "ended"
  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
]);

// Adjuntos de evidencia para designación de encargados
export const complianceOfficerAttachments = pgTable("compliance_officer_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officerId: varchar("officer_id").notNull().references(() => complianceOfficers.id),
  storageKey: text("storage_key").notNull(), // Clave en object storage
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  description: text("description"), // "Acta de Directorio Nº 123", etc.
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  metadata: jsonb("metadata"), // Información adicional del archivo
});

// Relación muchos a muchos: Encargados de cumplimiento con entidades fiscales
export const complianceOfficerFiscalEntities = pgTable("compliance_officer_fiscal_entities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officerId: varchar("officer_id").notNull().references(() => complianceOfficers.id, { onDelete: "cascade" }),
  fiscalEntityId: varchar("fiscal_entity_id").notNull().references(() => fiscalEntities.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Evitar duplicados: un encargado solo puede tener una relación por entidad fiscal
  uniqueIndex("unique_officer_fiscal_entity").on(table.officerId, table.fiscalEntityId),
  // Índices para optimizar consultas de filtrado
  index("idx_cofe_officer_id").on(table.officerId),
  index("idx_cofe_fiscal_entity_id").on(table.fiscalEntityId),
]);

// Esquemas Zod para categorías de delitos
export const insertCrimeCategorySchema = createInsertSchema(crimeCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCrimeCategorySchema = insertCrimeCategorySchema.partial().extend({
  id: z.string(),
});

// Esquemas Zod para encargados de cumplimiento
export const insertComplianceOfficerSchema = createInsertSchema(complianceOfficers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Nueva forma preferida: array de entidades fiscales
  fiscalEntityIds: z.array(z.string()).min(1, "Debe seleccionar al menos una entidad fiscal").optional(),
  // Forma antigua: solo una entidad (para compatibilidad hacia atrás)
  fiscalEntityId: z.string().optional(),
  assignmentStartDate: z.string().or(z.date()),
  assignmentEndDate: z.string().or(z.date()).optional().nullable(),
  crimeCategories: z.array(z.string()).optional(),
}).refine((data) => {
  // Al menos una de las dos formas debe estar presente
  return (data.fiscalEntityIds && data.fiscalEntityIds.length > 0) || data.fiscalEntityId;
}, {
  message: "Debe especificar al menos una entidad fiscal",
  path: ["fiscalEntityIds"],
});

export const updateComplianceOfficerSchema = z.object({
  id: z.string(),
  // Nuevas entidades fiscales
  fiscalEntityIds: z.array(z.string()).optional(),
  // Compatibilidad hacia atrás
  fiscalEntityId: z.string().optional(),
  roleType: z.string().optional(),
  scope: z.string().optional(),
  hierarchyLevel: z.number().optional(),
  reportsToId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  fullName: z.string().optional(),
  email: z.string().optional(),
  title: z.string().optional(),
  phone: z.string().optional(),
  assignmentStartDate: z.string().or(z.date()).optional(),
  assignmentEndDate: z.string().or(z.date()).optional().nullable(),
  crimeCategories: z.array(z.string()).optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

// Esquemas Zod para tabla de enlace
export const insertComplianceOfficerFiscalEntitySchema = createInsertSchema(complianceOfficerFiscalEntities).omit({
  id: true,
  createdAt: true,
});

// Esquemas Zod para adjuntos
export const insertComplianceOfficerAttachmentSchema = createInsertSchema(complianceOfficerAttachments).omit({
  id: true,
  uploadedAt: true,
});

// Tipos TypeScript para compliance
export type CrimeCategory = typeof crimeCategories.$inferSelect;
export type InsertCrimeCategory = z.infer<typeof insertCrimeCategorySchema>;
export type UpdateCrimeCategory = z.infer<typeof updateCrimeCategorySchema>;

export type ComplianceOfficer = typeof complianceOfficers.$inferSelect;
export type InsertComplianceOfficer = z.infer<typeof insertComplianceOfficerSchema>;
export type UpdateComplianceOfficer = z.infer<typeof updateComplianceOfficerSchema>;

export type ComplianceOfficerAttachment = typeof complianceOfficerAttachments.$inferSelect;
export type InsertComplianceOfficerAttachment = z.infer<typeof insertComplianceOfficerAttachmentSchema>;

// Tipos TypeScript para tabla de enlace
export type ComplianceOfficerFiscalEntity = typeof complianceOfficerFiscalEntities.$inferSelect;
export type InsertComplianceOfficerFiscalEntity = z.infer<typeof insertComplianceOfficerFiscalEntitySchema>;

// Tipo extendido con información de relaciones
export type ComplianceOfficerWithDetails = ComplianceOfficer & {
  // Forma antigua (para compatibilidad hacia atrás)
  fiscalEntity?: { id: string; name: string; code: string; };
  // Nueva forma: múltiples entidades fiscales
  fiscalEntities: Array<{ id: string; name: string; code: string; }>;
  fiscalEntityIds: string[]; // IDs para formularios
  user?: { id: string; fullName: string; email: string; };
  reportsTo?: { id: string; fullName: string; title: string; };
  subordinates?: ComplianceOfficer[];
  attachments?: ComplianceOfficerAttachment[];
  crimeCategData?: CrimeCategory[];
};

// Work Program Item Type
export type WorkProgramItem = {
  risk: Risk | AuditRisk;
  riskType: 'official' | 'adhoc';
  controls: (Control & { residualRisk: number })[];
  tests: AuditTest[];
  coverage: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
  };
};

// Admin Types - Extended user type with roles for admin dashboard
export type AdminUser = User & {
  roles: Array<{
    id: string;
    name: string;
  }>;
};

// ============================================================================
// UX ENHANCEMENTS: User Preferences & Saved Views (Phase 4)
// ============================================================================

// User Saved Views - Vistas guardadas de filtros por usuario
export const userSavedViews = pgTable("user_saved_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(), // Nombre de la vista guardada (ej: "Riesgos Críticos Q1")
  entityType: text("entity_type").notNull(), // 'risks', 'controls', 'events', 'audits', etc.
  filters: jsonb("filters").notNull(), // JSON con los filtros aplicados
  isDefault: boolean("is_default").notNull().default(false), // Vista por defecto para este tipo de entidad
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_user_saved_views_user").on(table.userId),
  index("idx_user_saved_views_entity").on(table.entityType),
  index("idx_user_saved_views_user_entity").on(table.userId, table.entityType),
  index("idx_user_saved_views_default").on(table.isDefault),
  index("idx_user_saved_views_created").on(table.createdAt),
]);

// User Preferences - Preferencias generales del usuario
export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  theme: text("theme").notNull().default("light"), // 'light', 'dark', 'high-contrast'
  language: text("language").notNull().default("es"), // 'es', 'en'
  keyboardShortcutsEnabled: boolean("keyboard_shortcuts_enabled").notNull().default(true),
  customShortcuts: jsonb("custom_shortcuts"), // JSON con atajos personalizados
  dashboardLayout: jsonb("dashboard_layout"), // JSON con configuración de layout de dashboard
  tablePageSize: integer("table_page_size").notNull().default(50), // Número de filas por página
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  emailDigest: text("email_digest").notNull().default("daily"), // 'none', 'daily', 'weekly'
  setupWizardCompleted: boolean("setup_wizard_completed").notNull().default(false), // Wizard de configuración inicial completado
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_user_preferences_user").on(table.userId),
]);

// Schemas Zod para vistas guardadas
export const insertUserSavedViewSchema = createInsertSchema(userSavedViews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  filters: z.record(z.any()), // Validar que filters sea un objeto
});

export const updateUserSavedViewSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  filters: z.record(z.any()).optional(),
  isDefault: z.boolean().optional(),
});

// Schemas Zod para preferencias de usuario
export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  theme: z.enum(["light", "dark", "high-contrast"]).optional(),
  language: z.enum(["es", "en"]).optional(),
  emailDigest: z.enum(["none", "daily", "weekly"]).optional(),
});

export const updateUserPreferencesSchema = z.object({
  id: z.string(),
  theme: z.enum(["light", "dark", "high-contrast"]).optional(),
  language: z.enum(["es", "en"]).optional(),
  keyboardShortcutsEnabled: z.boolean().optional(),
  customShortcuts: z.record(z.any()).optional(),
  dashboardLayout: z.record(z.any()).optional(),
  tablePageSize: z.number().min(10).max(1000).optional(),
  notificationsEnabled: z.boolean().optional(),
  emailDigest: z.enum(["none", "daily", "weekly"]).optional(),
  setupWizardCompleted: z.boolean().optional(),
});

// Tipos TypeScript para vistas guardadas
export type UserSavedView = typeof userSavedViews.$inferSelect;
export type InsertUserSavedView = z.infer<typeof insertUserSavedViewSchema>;
export type UpdateUserSavedView = z.infer<typeof updateUserSavedViewSchema>;

// Tipos TypeScript para preferencias de usuario
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UpdateUserPreferences = z.infer<typeof updateUserPreferencesSchema>;

// ============================================================================
// AUDIT LOGS - Sistema de trazabilidad de cambios
// ============================================================================

// Audit Logs - Registro de cambios en entidades principales
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // 'risk', 'control', 'risk_event', 'audit', etc.
  entityId: varchar("entity_id").notNull(), // ID de la entidad modificada
  action: text("action").notNull(), // 'create', 'update', 'delete'
  userId: varchar("user_id").references(() => users.id), // Nullable para validaciones públicas/del sistema
  changes: jsonb("changes"), // JSON con estructura { field: { old: value, new: value } }
  ipAddress: text("ip_address"), // IP desde donde se realizó el cambio
  userAgent: text("user_agent"), // User agent del navegador
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => [
  index("idx_audit_logs_entity").on(table.entityType, table.entityId),
  index("idx_audit_logs_user").on(table.userId),
  index("idx_audit_logs_timestamp").on(table.timestamp),
]);

// Schemas Zod para audit logs
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
}).extend({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  action: z.enum(['create', 'update', 'delete']),
  userId: z.string().min(1).nullable().optional(), // Nullable para validaciones públicas/del sistema
  changes: z.record(z.object({
    old: z.any(),
    new: z.any(),
  })).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

// Tipos TypeScript para audit logs
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;