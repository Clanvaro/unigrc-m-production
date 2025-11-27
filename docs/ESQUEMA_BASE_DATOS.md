# Esquema de Base de Datos - Unigrc

**Versión:** 2.0.0  
**Fecha:** Octubre 2025  
**Plataforma:** Unigrc (anteriormente RiskMatrix Pro)  
**DBMS:** PostgreSQL 16+ (Neon Serverless)  
**ORM:** Drizzle ORM 0.39.3

---

## Índice

1. [Vista General](#1-vista-general)
2. [Convenciones y Estándares](#2-convenciones-y-estándares)
3. [Módulo de Organización](#3-módulo-de-organización)
4. [Módulo de Riesgos](#4-módulo-de-riesgos)
5. [Módulo de Controles](#5-módulo-de-controles)
6. [Módulo de Auditoría](#6-módulo-de-auditoría)
7. [Módulo de Cumplimiento](#7-módulo-de-cumplimiento)
8. [Módulo de Whistleblower](#8-módulo-de-whistleblower)
9. [Módulo de Sistema y Seguridad](#9-módulo-de-sistema-y-seguridad)
10. [Índices y Optimizaciones](#10-índices-y-optimizaciones)

---

## 1. Vista General

### 1.1 Estadísticas del Esquema

- **Total de Tablas:** 100+
- **Total de Relaciones:** 200+
- **Total de Índices:** 150+
- **Restricciones Únicas:** 80+
- **Foreign Keys:** 180+

### 1.2 Módulos Principales

```
Base de Datos: unigrc
├── Organización (15 tablas)
│   ├── Estructura de procesos (macroprocesos, procesos, subprocesos)
│   ├── Gerencias jerárquicas
│   ├── Objetivos estratégicos
│   └── Process owners
│
├── Riesgos (12 tablas)
│   ├── Catálogo de riesgos
│   ├── Eventos de riesgo
│   ├── Categorías
│   └── Snapshots/versionamiento
│
├── Controles (8 tablas)
│   ├── Catálogo de controles
│   ├── Evaluaciones de efectividad
│   ├── Autoevaluaciones (CSA)
│   └── Vínculos riesgo-control
│
├── Auditoría (30+ tablas)
│   ├── Planes anuales
│   ├── Auditorías (360° view)
│   ├── Pruebas de auditoría
│   ├── Hallazgos y seguimiento
│   └── Evaluaciones y re-evaluaciones
│
├── Cumplimiento (10 tablas)
│   ├── Regulaciones
│   ├── Pruebas de cumplimiento
│   ├── Auditorías de cumplimiento
│   └── Prevención de delitos
│
├── Whistleblower (8 tablas)
│   ├── Denuncias y casos
│   ├── Comunicaciones anónimas
│   └── Investigaciones
│
├── Sistema (20+ tablas)
│   ├── Usuarios y roles
│   ├── Sesiones
│   ├── Notificaciones
│   ├── Aprobaciones
│   └── Configuración
│
└── Validación y Workflow (10 tablas)
    ├── Validaciones de procesos
    ├── Revalidaciones
    └── Aprobaciones
```

---

## 2. Convenciones y Estándares

### 2.1 Nomenclatura

#### Tablas
- **Singular o Plural:** Plural (ej: `risks`, `controls`, `audits`)
- **Snake Case:** Nombres en minúsculas con guiones bajos
- **Descriptivos:** Nombres claros y auto-explicativos

#### Columnas
- **Snake Case:** `created_at`, `updated_at`, `deleted_at`
- **IDs:** `id` para PK, `entity_id` para FKs
- **Booleanos:** Prefijo `is_` o `has_` (ej: `is_active`, `has_fraud`)

#### Relaciones Many-to-Many
- **Formato:** `entity1_entity2s` (ej: `risk_controls`, `process_gerencias`)
- **Orden Alfabético:** La primera entidad alfabéticamente va primero

### 2.2 Tipos de Datos Estándar

```sql
-- IDs
id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()

-- Códigos Únicos
code VARCHAR UNIQUE  -- Ej: R-0001, C-0001

-- Textos
name VARCHAR NOT NULL
description TEXT
notes TEXT

-- Numéricos
probability INTEGER CHECK (probability BETWEEN 1 AND 5)
impact NUMERIC(10, 2)
percentage NUMERIC(5, 2) CHECK (percentage BETWEEN 0 AND 100)

-- Fechas
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
deleted_at TIMESTAMP  -- Para soft delete

-- Booleanos
is_active BOOLEAN DEFAULT true
is_primary BOOLEAN DEFAULT false

-- JSON
metadata JSONB
config JSONB
```

### 2.3 Patrones de Diseño

#### Soft Delete
Todas las entidades principales implementan soft delete:

```sql
deleted_at TIMESTAMP
```

Queries excluyen registros eliminados:
```sql
WHERE deleted_at IS NULL
```

#### Audit Trail
Todas las tablas incluyen:

```sql
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

Algunas incluyen:
```sql
created_by VARCHAR REFERENCES users(id)
updated_by VARCHAR REFERENCES users(id)
```

#### Códigos Únicos Globales
Entidades principales tienen código único:

```sql
code VARCHAR UNIQUE NOT NULL
```

Formato:
- `R-XXXX` - Riesgos
- `C-XXXX` - Controles
- `E-XXXX` - Eventos de Riesgo
- `G-XXXX` - Gerencias
- `OE-XXXX` - Objetivos Estratégicos
- `AUD-{código}-TEST-{seq}` - Pruebas de Auditoría

---

## 3. Módulo de Organización

### 3.1 Diagrama de Relaciones

```
┌─────────────────┐
│  gerencias      │
│  (G-XXXX)       │
└────────┬────────┘
         │ 1:N (jerarquía)
         ├─────────────────────┐
         │                     │
┌────────▼─────────┐  ┌───────▼──────────┐
│ subgerencias     │  │   jefaturas      │
│ (G-XXXX)         │  │   (G-XXXX)       │
└──────────────────┘  └──────────────────┘
         │
         │ M:N (asignaciones)
         │
┌────────▼─────────┐      ┌──────────────────┐
│ macroprocesos    │◄─────┤ macroproceso_    │
│                  │  M:N │ gerencias        │
└────────┬─────────┘      └──────────────────┘
         │ 1:N
┌────────▼─────────┐      ┌──────────────────┐
│ processes        │◄─────┤ process_         │
│                  │  M:N │ gerencias        │
└────────┬─────────┘      └──────────────────┘
         │ 1:N
┌────────▼─────────┐      ┌──────────────────┐
│ subprocesos      │◄─────┤ subproceso_      │
│                  │  M:N │ gerencias        │
└──────────────────┘      └──────────────────┘

┌──────────────────┐      ┌──────────────────┐
│ objetivos_       │      │ process_         │
│ estrategicos     │◄─────┤ objetivos_       │
│ (OE-XXXX)        │  M:N │ estrategicos     │
└──────────────────┘      └──────────────────┘

┌──────────────────┐
│ process_owners   │
│ (responsables)   │
└──────────────────┘
```

### 3.2 Tabla: gerencias

Estructura de gerencias organizacionales con jerarquía de 3 niveles.

```sql
CREATE TABLE gerencias (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR UNIQUE NOT NULL,  -- G-XXXX
  name VARCHAR NOT NULL,
  description TEXT,
  hierarchy_level INTEGER NOT NULL CHECK (hierarchy_level BETWEEN 1 AND 3),
  parent_id VARCHAR REFERENCES gerencias(id),  -- Para subgerencias y jefaturas
  gerente_id VARCHAR REFERENCES process_owners(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Indices
CREATE INDEX idx_gerencias_code ON gerencias(code);
CREATE INDEX idx_gerencias_parent ON gerencias(parent_id);
CREATE INDEX idx_gerencias_deleted ON gerencias(deleted_at);
```

**Campos clave:**
- `hierarchy_level`: 1=Gerencia, 2=Subgerencia, 3=Jefatura
- `parent_id`: Referencia a gerencia padre (NULL para nivel 1)
- `gerente_id`: Responsable de la gerencia

### 3.3 Tabla: objetivos_estrategicos

Objetivos estratégicos de la organización.

```sql
CREATE TABLE objetivos_estrategicos (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR UNIQUE NOT NULL,  -- OE-XXXX
  name VARCHAR NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

### 3.4 Tabla: macroprocesos

Nivel 1 de la jerarquía de procesos.

```sql
CREATE TABLE macroprocesos (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  code VARCHAR,
  owner_id VARCHAR REFERENCES process_owners(id),
  -- Columna legacy para compatibilidad
  gerencia_id VARCHAR REFERENCES gerencias(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

### 3.5 Tabla: processes

Nivel 2 de la jerarquía de procesos.

```sql
CREATE TABLE processes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  macroproceso_id VARCHAR NOT NULL REFERENCES macroprocesos(id),
  name VARCHAR NOT NULL,
  description TEXT,
  code VARCHAR,
  owner_id VARCHAR REFERENCES process_owners(id),
  -- Columna legacy para compatibilidad
  gerencia_id VARCHAR REFERENCES gerencias(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

### 3.6 Tabla: subprocesos

Nivel 3 de la jerarquía de procesos.

```sql
CREATE TABLE subprocesos (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id VARCHAR NOT NULL REFERENCES processes(id),
  name VARCHAR NOT NULL,
  description TEXT,
  code VARCHAR,
  owner_id VARCHAR REFERENCES process_owners(id),
  -- Columna legacy para compatibilidad
  gerencia_id VARCHAR REFERENCES gerencias(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

### 3.7 Tablas de Relación: Gerencias-Procesos (M:N)

#### macroproceso_gerencias
```sql
CREATE TABLE macroproceso_gerencias (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  macroproceso_id VARCHAR NOT NULL REFERENCES macroprocesos(id),
  gerencia_id VARCHAR NOT NULL REFERENCES gerencias(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(macroproceso_id, gerencia_id)  -- Prevenir duplicados
);

CREATE INDEX idx_macroproceso_gerencias_macro ON macroproceso_gerencias(macroproceso_id);
CREATE INDEX idx_macroproceso_gerencias_ger ON macroproceso_gerencias(gerencia_id);
```

#### process_gerencias
```sql
CREATE TABLE process_gerencias (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id VARCHAR NOT NULL REFERENCES processes(id),
  gerencia_id VARCHAR NOT NULL REFERENCES gerencias(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(process_id, gerencia_id)
);

CREATE INDEX idx_process_gerencias_proc ON process_gerencias(process_id);
CREATE INDEX idx_process_gerencias_ger ON process_gerencias(gerencia_id);
```

#### subproceso_gerencias
```sql
CREATE TABLE subproceso_gerencias (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  subproceso_id VARCHAR NOT NULL REFERENCES subprocesos(id),
  gerencia_id VARCHAR NOT NULL REFERENCES gerencias(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(subproceso_id, gerencia_id)
);

CREATE INDEX idx_subproceso_gerencias_sub ON subproceso_gerencias(subproceso_id);
CREATE INDEX idx_subproceso_gerencias_ger ON subproceso_gerencias(gerencia_id);
```

### 3.8 Tabla: process_owners

Responsables de procesos (pueden también ser gerentes).

```sql
CREATE TABLE process_owners (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  position VARCHAR,
  department VARCHAR,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.9 Tabla: fiscal_entities

Entidades fiscalizables.

```sql
CREATE TABLE fiscal_entities (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  code VARCHAR,
  description TEXT,
  entity_type VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

---

## 4. Módulo de Riesgos

### 4.1 Diagrama de Relaciones

```
┌──────────────────┐
│ risk_categories  │
└────────┬─────────┘
         │ 1:N
┌────────▼─────────┐      ┌──────────────────┐
│ risks            │◄─────┤ risk_process_    │
│ (R-XXXX)         │  M:N │ links            │
└────────┬─────────┘      └──────────────────┘
         │ 1:N                    │
         │                        │ Referencias a
         │                        │ macroprocesos,
┌────────▼─────────┐              │ processes,
│ risk_snapshots   │              │ subprocesos
│ (versionamiento) │              │
└──────────────────┘              │
         │                        │
         │ 1:N                    │
┌────────▼─────────┐      ┌───────▼──────────┐
│ risk_events      │      │ fiscal_entities  │
│ (E-XXXX)         │      │                  │
└────────┬─────────┘      └──────────────────┘
         │ M:N
         ▼
┌──────────────────┐      ┌──────────────────┐
│ risk_event_      │      │ risk_event_      │
│ macroprocesos    │      │ processes        │
└──────────────────┘      └──────────────────┘

┌──────────────────┐      ┌──────────────────┐
│ risk_event_      │      │ risk_event_      │
│ subprocesos      │      │ risks            │
└──────────────────┘      └──────────────────┘
```

### 4.2 Tabla: risks

Catálogo principal de riesgos.

```sql
CREATE TABLE risks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR UNIQUE NOT NULL,  -- R-XXXX
  name VARCHAR NOT NULL,
  description TEXT,
  category_id VARCHAR REFERENCES risk_categories(id),
  
  -- Evaluación de Probabilidad
  probability INTEGER CHECK (probability BETWEEN 1 AND 5),
  
  -- Evaluación de Impacto (múltiples dimensiones)
  financial_impact INTEGER CHECK (financial_impact BETWEEN 1 AND 5),
  operational_impact INTEGER CHECK (operational_impact BETWEEN 1 AND 5),
  reputational_impact INTEGER CHECK (reputational_impact BETWEEN 1 AND 5),
  compliance_impact INTEGER CHECK (compliance_impact BETWEEN 1 AND 5),
  strategic_impact INTEGER CHECK (strategic_impact BETWEEN 1 AND 5),
  
  -- Impacto ponderado calculado
  weighted_impact NUMERIC(10, 2),
  
  -- Riesgo inherente (probabilidad × impacto ponderado)
  inherent_risk NUMERIC(10, 2),
  
  -- Riesgo residual (inherente × (1 - efectividad controles))
  residual_risk NUMERIC(10, 2),
  
  -- Clasificación
  risk_level VARCHAR,  -- bajo, medio, alto, extremo
  
  -- Metadatos
  owner_id VARCHAR REFERENCES process_owners(id),
  status VARCHAR DEFAULT 'active',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Índices
CREATE INDEX idx_risks_code ON risks(code);
CREATE INDEX idx_risks_category ON risks(category_id);
CREATE INDEX idx_risks_level ON risks(risk_level);
CREATE INDEX idx_risks_deleted ON risks(deleted_at);
```

### 4.3 Tabla: risk_categories

Taxonomía de categorías de riesgo.

```sql
CREATE TABLE risk_categories (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  color VARCHAR,  -- Para visualización
  order_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

### 4.4 Tabla: risk_process_links

Vinculación de riesgos con procesos (cualquier nivel de jerarquía).

```sql
CREATE TABLE risk_process_links (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id VARCHAR NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  
  -- Referencias a cualquier nivel de proceso (solo uno debe estar poblado)
  macroproceso_id VARCHAR REFERENCES macroprocesos(id),
  process_id VARCHAR REFERENCES processes(id),
  subproceso_id VARCHAR REFERENCES subprocesos(id),
  
  -- Entidad fiscal (opcional)
  fiscal_entity_id VARCHAR REFERENCES fiscal_entities(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Solo uno de los tres niveles debe estar poblado
  CHECK (
    (macroproceso_id IS NOT NULL AND process_id IS NULL AND subproceso_id IS NULL) OR
    (macroproceso_id IS NULL AND process_id IS NOT NULL AND subproceso_id IS NULL) OR
    (macroproceso_id IS NULL AND process_id IS NULL AND subproceso_id IS NOT NULL)
  )
);

CREATE INDEX idx_rpl_risk ON risk_process_links(risk_id);
CREATE INDEX idx_rpl_macro ON risk_process_links(macroproceso_id);
CREATE INDEX idx_rpl_proc ON risk_process_links(process_id);
CREATE INDEX idx_rpl_sub ON risk_process_links(subproceso_id);
```

### 4.5 Tabla: risk_events

Eventos de materialización de riesgos.

```sql
CREATE TABLE risk_events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR UNIQUE NOT NULL,  -- E-XXXX
  name VARCHAR NOT NULL,
  description TEXT,
  
  -- Clasificación
  event_type VARCHAR NOT NULL,  -- incident, near_miss, opportunity
  severity VARCHAR,  -- minor, moderate, major, critical
  
  -- Fechas
  occurrence_date DATE NOT NULL,
  detection_date DATE,
  resolution_date DATE,
  
  -- Impacto
  financial_impact NUMERIC(15, 2),
  financial_impact_currency VARCHAR DEFAULT 'USD',
  non_financial_impact TEXT,
  
  -- Fraude
  has_fraud BOOLEAN DEFAULT false,
  fraud_description TEXT,
  fraud_amount NUMERIC(15, 2),
  
  -- Análisis
  root_cause TEXT,
  immediate_actions TEXT,
  preventive_actions TEXT,
  lessons_learned TEXT,
  
  -- Estado
  status VARCHAR DEFAULT 'open',
  
  -- Responsable
  reported_by VARCHAR REFERENCES users(id),
  assigned_to VARCHAR REFERENCES users(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_events_code ON risk_events(code);
CREATE INDEX idx_events_type ON risk_events(event_type);
CREATE INDEX idx_events_fraud ON risk_events(has_fraud);
CREATE INDEX idx_events_deleted ON risk_events(deleted_at);
```

### 4.6 Tablas de Relación: Eventos-Procesos-Riesgos

#### risk_event_macroprocesos
```sql
CREATE TABLE risk_event_macroprocesos (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_event_id VARCHAR NOT NULL REFERENCES risk_events(id) ON DELETE CASCADE,
  macroproceso_id VARCHAR NOT NULL REFERENCES macroprocesos(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### risk_event_processes
```sql
CREATE TABLE risk_event_processes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_event_id VARCHAR NOT NULL REFERENCES risk_events(id) ON DELETE CASCADE,
  process_id VARCHAR NOT NULL REFERENCES processes(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### risk_event_subprocesos
```sql
CREATE TABLE risk_event_subprocesos (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_event_id VARCHAR NOT NULL REFERENCES risk_events(id) ON DELETE CASCADE,
  subproceso_id VARCHAR NOT NULL REFERENCES subprocesos(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### risk_event_risks
```sql
CREATE TABLE risk_event_risks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_event_id VARCHAR NOT NULL REFERENCES risk_events(id) ON DELETE CASCADE,
  risk_id VARCHAR NOT NULL REFERENCES risks(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.7 Tabla: risk_snapshots

Versionamiento histórico de riesgos.

```sql
CREATE TABLE risk_snapshots (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id VARCHAR NOT NULL REFERENCES risks(id),
  
  -- Estado completo del riesgo en este momento
  snapshot_data JSONB NOT NULL,
  
  -- Razón del snapshot
  snapshot_reason VARCHAR,  -- initial, evaluation, audit, periodic
  
  -- Metadatos
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_snapshots_risk ON risk_snapshots(risk_id);
CREATE INDEX idx_snapshots_date ON risk_snapshots(created_at);
```

---

## 5. Módulo de Controles

### 5.1 Diagrama de Relaciones

```
┌──────────────────┐      ┌──────────────────┐
│ controls         │◄─────┤ risk_controls    │
│ (C-XXXX)         │  M:N │                  │──────┐
└────────┬─────────┘      └──────────────────┘      │
         │                                           │
         │ 1:N                                  1:N  │
         │                                           │
┌────────▼─────────┐                    ┌────────────▼───────┐
│ control_         │                    │ risks              │
│ evaluations      │                    │                    │
└──────────────────┘                    └────────────────────┘

┌──────────────────┐
│ control_         │
│ assessment_      │
│ history          │
│ (Historial CSA)  │
└──────────────────┘

┌──────────────────┐      ┌──────────────────┐
│ control_         │      │ control_         │
│ evaluation_      │◄─────┤ evaluation_      │
│ criteria         │  1:N │ options          │
└──────────────────┘      └──────────────────┘
```

### 5.2 Tabla: controls

Catálogo de controles.

```sql
CREATE TABLE controls (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR UNIQUE NOT NULL,  -- C-XXXX
  name VARCHAR NOT NULL,
  description TEXT,
  
  -- Clasificación
  control_type VARCHAR NOT NULL,  -- preventive, detective, corrective
  control_nature VARCHAR,  -- manual, automated, hybrid
  
  -- Frecuencia
  frequency VARCHAR NOT NULL,  -- daily, weekly, monthly, quarterly, annual, ad_hoc
  
  -- Responsabilidad (via Process Owner del proceso)
  owner_id VARCHAR REFERENCES process_owners(id),
  
  -- Proceso asociado
  process_id VARCHAR REFERENCES processes(id),
  subproceso_id VARCHAR REFERENCES subprocesos(id),
  
  -- Efectividad
  effectiveness_percentage NUMERIC(5, 2) DEFAULT 0 CHECK (effectiveness_percentage BETWEEN 0 AND 100),
  last_evaluation_date DATE,
  
  -- Documentación
  procedure_document TEXT,
  evidence_required TEXT,
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  status VARCHAR DEFAULT 'active',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_controls_code ON controls(code);
CREATE INDEX idx_controls_type ON controls(control_type);
CREATE INDEX idx_controls_process ON controls(process_id);
CREATE INDEX idx_controls_deleted ON controls(deleted_at);
```

### 5.3 Tabla: risk_controls

Vinculación muchos-a-muchos entre riesgos y controles.

```sql
CREATE TABLE risk_controls (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id VARCHAR NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  control_id VARCHAR NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
  
  -- Indicador de control primario
  is_primary BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(risk_id, control_id)
);

CREATE INDEX idx_risk_controls_risk ON risk_controls(risk_id);
CREATE INDEX idx_risk_controls_control ON risk_controls(control_id);
```

### 5.4 Tabla: control_evaluations

Evaluaciones periódicas de efectividad de controles.

```sql
CREATE TABLE control_evaluations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id VARCHAR NOT NULL REFERENCES controls(id),
  
  -- Resultados por criterio
  design_rating INTEGER CHECK (design_rating BETWEEN 1 AND 5),
  implementation_rating INTEGER CHECK (implementation_rating BETWEEN 1 AND 5),
  documentation_rating INTEGER CHECK (documentation_rating BETWEEN 1 AND 5),
  frequency_rating INTEGER CHECK (frequency_rating BETWEEN 1 AND 5),
  monitoring_rating INTEGER CHECK (monitoring_rating BETWEEN 1 AND 5),
  
  -- Efectividad total calculada
  total_effectiveness NUMERIC(5, 2),
  
  -- Observaciones
  observations TEXT,
  recommendations TEXT,
  
  -- Evaluador
  evaluated_by VARCHAR REFERENCES users(id),
  evaluation_date DATE NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ce_control ON control_evaluations(control_id);
CREATE INDEX idx_ce_date ON control_evaluations(evaluation_date);
```

### 5.5 Tabla: control_assessment_history

Historial de autoevaluaciones (CSA).

```sql
CREATE TABLE control_assessment_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id VARCHAR NOT NULL REFERENCES controls(id),
  
  -- Evaluación
  compliance_status VARCHAR NOT NULL,  -- compliant, partial, non_compliant
  effectiveness_score NUMERIC(5, 2),
  
  -- Evidencia
  evidence_description TEXT,
  evidence_attachments JSONB,
  
  -- Observaciones
  observations TEXT,
  action_items TEXT,
  
  -- Evaluador
  assessed_by VARCHAR REFERENCES users(id),
  assessment_date DATE NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cah_control ON control_assessment_history(control_id);
CREATE INDEX idx_cah_date ON control_assessment_history(assessment_date);
```

### 5.6 Tabla: control_evaluation_criteria

Criterios de evaluación configurables.

```sql
CREATE TABLE control_evaluation_criteria (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR,  -- design, implementation, documentation, etc.
  weight NUMERIC(5, 2) DEFAULT 20,
  order_index INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 5.7 Tabla: control_evaluation_options

Opciones de calificación para cada criterio.

```sql
CREATE TABLE control_evaluation_options (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  criterion_id VARCHAR NOT NULL REFERENCES control_evaluation_criteria(id),
  option_value INTEGER NOT NULL,
  option_label VARCHAR NOT NULL,
  option_description TEXT,
  score_percentage NUMERIC(5, 2),
  order_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 6. Módulo de Auditoría

### 6.1 Estructura General

El módulo de auditoría implementa la vista 360° según estándares NOGAI 13-14-15 con 11 secciones modulares.

```
┌──────────────────┐
│ audit_plans      │ Plan Anual
│                  │
└────────┬─────────┘
         │ 1:N
┌────────▼─────────┐
│ audits           │ Auditoría Individual (360° View)
│                  │
└────────┬─────────┘
         │
         ├──► Información General
         │
         ├──► audit_criteria (Criterios)
         │
         ├──► audit_scope + audit_scope_versions (Alcance versionado)
         │
         ├──► audit_programs (Programa de Trabajo)
         │
         ├──► audit_tests (Pruebas)
         │    └──► audit_test_attachments
         │
         ├──► audit_findings (Hallazgos)
         │    └──► finding_follow_ups
         │
         ├──► working_papers (Papeles de Trabajo)
         │
         ├──► audit_control_evaluations (Evaluación Controles)
         │
         ├──► audit_risk_evaluations (Re-evaluación Riesgos)
         │    └──► audit_risks (Riesgos Ad-hoc)
         │
         └──► audit_reports (Reportes)
```

### 6.2 Tabla: audit_plans

Planes anuales de auditoría.

```sql
CREATE TABLE audit_plans (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  
  -- Responsable
  director_id VARCHAR REFERENCES users(id),
  
  -- Configuración de priorización
  prioritization_config JSONB,  -- Pesos de factores
  
  -- Estado del plan
  status VARCHAR DEFAULT 'draft',  -- draft, submitted, approved, rejected, active
  
  -- Aprobación
  approved_by VARCHAR REFERENCES users(id),
  approved_at TIMESTAMP,
  approval_comments TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_plans_year ON audit_plans(year);
CREATE INDEX idx_audit_plans_status ON audit_plans(status);
```

### 6.3 Tabla: audits

Auditorías individuales (vista 360°).

```sql
CREATE TABLE audits (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR UNIQUE NOT NULL,  -- AUD-YYYY-NNN
  name VARCHAR NOT NULL,
  description TEXT,
  
  -- Vinculación con plan
  plan_id VARCHAR REFERENCES audit_plans(id),
  
  -- Fechas
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  
  -- Equipo
  lead_auditor_id VARCHAR REFERENCES users(id),
  supervisor_id VARCHAR REFERENCES users(id),
  
  -- Objetivos
  objectives TEXT,
  
  -- Estado
  status VARCHAR DEFAULT 'planning',  -- planning, fieldwork, reporting, completed, cancelled
  
  -- Tipo
  audit_type VARCHAR,  -- operational, compliance, financial, it, etc.
  
  -- Prioridad
  priority_score NUMERIC(10, 2),
  priority_level VARCHAR,  -- low, medium, high, critical
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audits_code ON audits(code);
CREATE INDEX idx_audits_plan ON audits(plan_id);
CREATE INDEX idx_audits_status ON audits(status);
CREATE INDEX idx_audits_dates ON audits(planned_start_date, planned_end_date);
```

### 6.4 Tabla: audit_scope

Alcance de auditoría.

```sql
CREATE TABLE audit_scope (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id VARCHAR NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  
  -- Entidad en alcance (solo una debe estar poblada)
  macroproceso_id VARCHAR REFERENCES macroprocesos(id),
  process_id VARCHAR REFERENCES processes(id),
  subproceso_id VARCHAR REFERENCES subprocesos(id),
  fiscal_entity_id VARCHAR REFERENCES fiscal_entities(id),
  
  -- Scope type
  scope_type VARCHAR DEFAULT 'complete',  -- complete, selective
  
  -- Si es selective, se vincula con entidades fiscales vía tablas M:N
  
  -- Periodo cubierto
  period_start DATE,
  period_end DATE,
  
  -- Exclusiones
  exclusions TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scope_audit ON audit_scope(audit_id);
```

### 6.5 Tabla: audit_scope_versions

Versionamiento del alcance con aprobación.

```sql
CREATE TABLE audit_scope_versions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id VARCHAR NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  
  -- Estado de la versión
  version_status VARCHAR DEFAULT 'draft',  -- draft, submitted, approved, rejected
  
  -- Cambios
  change_description TEXT NOT NULL,
  change_reason TEXT,
  
  -- Aprobación
  submitted_by VARCHAR REFERENCES users(id),
  submitted_at TIMESTAMP,
  approved_by VARCHAR REFERENCES users(id),
  approved_at TIMESTAMP,
  approval_comments TEXT,
  
  -- Snapshot del alcance en esta versión
  scope_snapshot JSONB NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scope_versions_audit ON audit_scope_versions(audit_id);
CREATE INDEX idx_scope_versions_status ON audit_scope_versions(version_status);
```

### 6.6 Tabla: audit_criteria

Criterios de auditoría.

```sql
CREATE TABLE audit_criteria (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id VARCHAR NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  
  -- Criterio
  criterion_type VARCHAR,  -- regulation, policy, standard, best_practice
  criterion_name VARCHAR NOT NULL,
  criterion_description TEXT,
  
  -- Referencia a regulación (si aplica)
  regulation_id VARCHAR REFERENCES regulations(id),
  
  -- Detalles
  article_reference VARCHAR,
  applicable_sections TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_criteria_audit ON audit_criteria(audit_id);
```

### 6.7 Tabla: audit_programs

Programas de trabajo.

```sql
CREATE TABLE audit_programs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id VARCHAR NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  
  -- Procedimiento
  procedure_name VARCHAR NOT NULL,
  procedure_description TEXT,
  objective VARCHAR,
  
  -- Vinculaciones
  objective_id VARCHAR REFERENCES audit_criteria(id),  -- Objetivo de auditoría
  criterion_id VARCHAR REFERENCES audit_criteria(id),  -- Criterio aplicable
  
  -- Asignación
  assigned_to VARCHAR REFERENCES users(id),
  estimated_hours NUMERIC(10, 2),
  
  -- Estado
  status VARCHAR DEFAULT 'pending',  -- pending, in_progress, completed
  
  -- Aprobación
  approved_by VARCHAR REFERENCES users(id),
  approval_status VARCHAR DEFAULT 'pending',  -- pending, approved, rejected
  approved_at TIMESTAMP,
  approval_comments TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_programs_audit ON audit_programs(audit_id);
CREATE INDEX idx_programs_status ON audit_programs(status);
```

### 6.8 Tabla: audit_tests

Pruebas de auditoría.

```sql
CREATE TABLE audit_tests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR UNIQUE NOT NULL,  -- AUD-{auditCode}-TEST-{seq}
  audit_id VARCHAR NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  
  -- Información básica
  name VARCHAR NOT NULL,
  description TEXT,
  test_type VARCHAR,  -- substantive, compliance, analytical, walkthrough
  
  -- Procedimiento
  procedure_steps TEXT,
  expected_results TEXT,
  
  -- Asignación
  executor_id VARCHAR REFERENCES users(id),
  supervisor_id VARCHAR REFERENCES users(id),
  
  -- Planificación
  planned_start_date DATE,
  planned_end_date DATE,
  estimated_hours NUMERIC(10, 2),
  
  -- Ejecución
  actual_start_date DATE,
  actual_end_date DATE,
  actual_hours NUMERIC(10, 2),
  
  -- Resultados
  results TEXT,
  observations TEXT,
  conclusion TEXT,
  
  -- Estado
  status VARCHAR DEFAULT 'pending',  -- pending, in_progress, completed, reviewed
  priority VARCHAR DEFAULT 'medium',  -- low, medium, high
  
  -- Revisión
  review_status VARCHAR DEFAULT 'pending',  -- pending, approved, rejected
  reviewed_by VARCHAR REFERENCES users(id),
  reviewed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tests_code ON audit_tests(code);
CREATE INDEX idx_tests_audit ON audit_tests(audit_id);
CREATE INDEX idx_tests_executor ON audit_tests(executor_id);
CREATE INDEX idx_tests_status ON audit_tests(status);
```

### 6.9 Tabla: audit_test_attachments

Adjuntos de pruebas de auditoría.

```sql
CREATE TABLE audit_test_attachments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id VARCHAR NOT NULL REFERENCES audit_tests(id) ON DELETE CASCADE,
  
  -- Código único del adjunto
  attachment_code VARCHAR UNIQUE NOT NULL,
  
  -- Archivo
  filename VARCHAR NOT NULL,
  file_url VARCHAR NOT NULL,
  file_type VARCHAR,
  file_size INTEGER,
  
  -- Descripción
  description TEXT,
  attachment_type VARCHAR,  -- evidence, workpaper, screenshot, document
  
  -- Metadatos
  uploaded_by VARCHAR REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_test_attachments_test ON audit_test_attachments(test_id);
CREATE INDEX idx_test_attachments_code ON audit_test_attachments(attachment_code);
```

### 6.10 Tabla: audit_findings

Hallazgos de auditoría.

```sql
CREATE TABLE audit_findings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR UNIQUE,
  audit_id VARCHAR NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  
  -- Información básica
  title VARCHAR NOT NULL,
  severity VARCHAR NOT NULL,  -- critical, high, medium, low
  
  -- Estructura del hallazgo
  condition TEXT NOT NULL,  -- ¿Qué se encontró?
  criterion TEXT NOT NULL,  -- ¿Qué debería ser?
  cause TEXT,  -- ¿Por qué ocurrió?
  effect TEXT,  -- ¿Cuál es el impacto?
  recommendation TEXT NOT NULL,  -- ¿Qué se debe hacer?
  
  -- Vinculación con pruebas
  test_id VARCHAR REFERENCES audit_tests(id),
  
  -- Vinculación con riesgos
  related_risk_id VARCHAR REFERENCES risks(id),
  
  -- Estado
  status VARCHAR DEFAULT 'open',  -- open, in_progress, resolved, verified, closed
  
  -- Responsable de implementación
  responsible_id VARCHAR REFERENCES users(id),
  due_date DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_findings_audit ON audit_findings(audit_id);
CREATE INDEX idx_findings_severity ON audit_findings(severity);
CREATE INDEX idx_findings_status ON audit_findings(status);
```

### 6.11 Tabla: audit_control_evaluations

Evaluación de controles durante auditoría (NOGAI 13.2).

```sql
CREATE TABLE audit_control_evaluations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id VARCHAR NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  control_id VARCHAR NOT NULL REFERENCES controls(id),
  
  -- Evaluación de diseño
  design_assessment VARCHAR,  -- adequate, inadequate, not_applicable
  design_comments TEXT,
  
  -- Pruebas de eficacia operativa
  operational_effectiveness VARCHAR,  -- effective, partially_effective, ineffective
  testing_sample_size INTEGER,
  exceptions_found INTEGER,
  effectiveness_percentage NUMERIC(5, 2),
  
  -- Observaciones
  observations TEXT,
  recommendations TEXT,
  
  -- Comparación con evaluación anterior
  previous_effectiveness NUMERIC(5, 2),
  variance_explanation TEXT,
  
  -- Evaluador
  evaluated_by VARCHAR REFERENCES users(id),
  evaluation_date DATE NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ace_audit ON audit_control_evaluations(audit_id);
CREATE INDEX idx_ace_control ON audit_control_evaluations(control_id);
```

### 6.12 Tabla: audit_risk_evaluations

Re-evaluación de riesgos post-auditoría.

```sql
CREATE TABLE audit_risk_evaluations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id VARCHAR NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  risk_id VARCHAR NOT NULL REFERENCES risks(id),
  
  -- Evaluación original (snapshot)
  original_probability INTEGER,
  original_impact NUMERIC(10, 2),
  original_inherent_risk NUMERIC(10, 2),
  
  -- Re-evaluación
  new_probability INTEGER CHECK (new_probability BETWEEN 1 AND 5),
  new_financial_impact INTEGER CHECK (new_financial_impact BETWEEN 1 AND 5),
  new_operational_impact INTEGER CHECK (new_operational_impact BETWEEN 1 AND 5),
  new_reputational_impact INTEGER CHECK (new_reputational_impact BETWEEN 1 AND 5),
  new_compliance_impact INTEGER CHECK (new_compliance_impact BETWEEN 1 AND 5),
  new_strategic_impact INTEGER CHECK (new_strategic_impact BETWEEN 1 AND 5),
  
  -- Riesgo calculado
  new_weighted_impact NUMERIC(10, 2),
  new_inherent_risk NUMERIC(10, 2),
  
  -- Justificación
  justification TEXT NOT NULL,
  
  -- Evaluador
  evaluated_by VARCHAR REFERENCES users(id),
  evaluation_date DATE NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_are_audit ON audit_risk_evaluations(audit_id);
CREATE INDEX idx_are_risk ON audit_risk_evaluations(risk_id);
```

### 6.13 Tabla: audit_risks

Riesgos Ad-hoc identificados durante auditoría.

```sql
CREATE TABLE audit_risks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id VARCHAR NOT NULL REFERENCES audits(id),
  
  -- Información del riesgo (similar a risks)
  name VARCHAR NOT NULL,
  description TEXT,
  
  -- Evaluación inicial
  probability INTEGER CHECK (probability BETWEEN 1 AND 5),
  financial_impact INTEGER CHECK (financial_impact BETWEEN 1 AND 5),
  operational_impact INTEGER CHECK (operational_impact BETWEEN 1 AND 5),
  reputational_impact INTEGER CHECK (reputational_impact BETWEEN 1 AND 5),
  compliance_impact INTEGER CHECK (compliance_impact BETWEEN 1 AND 5),
  strategic_impact INTEGER CHECK (strategic_impact BETWEEN 1 AND 5),
  
  -- Proceso afectado
  process_id VARCHAR REFERENCES processes(id),
  subproceso_id VARCHAR REFERENCES subprocesos(id),
  
  -- Recomendaciones
  recommended_controls TEXT,
  
  -- Estado
  status VARCHAR DEFAULT 'identified',  -- identified, approved, incorporated, rejected
  
  -- Aprobación para incorporar al catálogo
  approved_by VARCHAR REFERENCES users(id),
  approved_at TIMESTAMP,
  
  -- Si fue incorporado al catálogo, referencia al riesgo creado
  catalog_risk_id VARCHAR REFERENCES risks(id),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_risks_audit ON audit_risks(audit_id);
CREATE INDEX idx_audit_risks_status ON audit_risks(status);
```

---

## 7. Módulo de Cumplimiento

### 7.1 Tabla: regulations

Catálogo de regulaciones y normativa.

```sql
CREATE TABLE regulations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Información básica
  name VARCHAR NOT NULL,
  official_number VARCHAR,  -- Ej: Ley 123-45
  regulation_type VARCHAR,  -- law, regulation, standard, policy
  
  -- Autoridad emisora
  issuing_authority VARCHAR,
  issuing_country VARCHAR,
  
  -- Vigencia
  publication_date DATE,
  effective_date DATE,
  expiration_date DATE,
  is_active BOOLEAN DEFAULT true,
  
  -- Contenido
  description TEXT,
  scope TEXT,
  
  -- Documento
  document_url VARCHAR,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_regulations_type ON regulations(regulation_type);
CREATE INDEX idx_regulations_active ON regulations(is_active);
```

### 7.2 Tabla: regulation_applicability

Aplicabilidad de regulaciones por proceso.

```sql
CREATE TABLE regulation_applicability (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  regulation_id VARCHAR NOT NULL REFERENCES regulations(id),
  
  -- Proceso aplicable (cualquier nivel)
  macroproceso_id VARCHAR REFERENCES macroprocesos(id),
  process_id VARCHAR REFERENCES processes(id),
  subproceso_id VARCHAR REFERENCES subprocesos(id),
  
  -- Detalles de aplicabilidad
  applicable_articles TEXT,
  specific_obligations TEXT,
  
  -- Responsable de cumplimiento
  compliance_owner_id VARCHAR REFERENCES users(id),
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 7.3 Tabla: compliance_tests

Pruebas de cumplimiento periódicas.

```sql
CREATE TABLE compliance_tests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR UNIQUE,
  
  -- Regulación
  regulation_id VARCHAR NOT NULL REFERENCES regulations(id),
  article_reference VARCHAR,
  
  -- Información de la prueba
  test_name VARCHAR NOT NULL,
  test_description TEXT,
  test_procedure TEXT,
  
  -- Frecuencia
  frequency VARCHAR NOT NULL,  -- monthly, quarterly, annual
  
  -- Última ejecución
  last_execution_date DATE,
  last_result VARCHAR,  -- compliant, non_compliant, partial
  
  -- Próxima ejecución
  next_execution_date DATE,
  
  -- Responsable
  responsible_id VARCHAR REFERENCES users(id),
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 8. Módulo de Whistleblower

### 8.1 Tabla: whistleblower_reports

Denuncias anónimas iniciales.

```sql
CREATE TABLE whistleblower_reports (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code VARCHAR UNIQUE NOT NULL,  -- WB-YYYY-NNNN-XXXX
  
  -- Información de la denuncia
  category VARCHAR NOT NULL,  -- fraud, corruption, harassment, conflict_of_interest, other
  subject VARCHAR NOT NULL,
  description TEXT NOT NULL,
  
  -- Detalles
  incident_date DATE,
  incident_location VARCHAR,
  individuals_involved TEXT,
  witnesses TEXT,
  
  -- Identidad del denunciante (encriptada)
  is_anonymous BOOLEAN DEFAULT true,
  reporter_identity_encrypted TEXT,  -- Encriptado si no es anónimo
  reporter_contact_encrypted TEXT,
  
  -- Adjuntos
  attachments JSONB,
  
  -- Estado inicial
  status VARCHAR DEFAULT 'submitted',
  
  -- Metadatos
  submitted_at TIMESTAMP DEFAULT NOW(),
  submitted_from_ip VARCHAR
);

CREATE INDEX idx_wb_reports_tracking ON whistleblower_reports(tracking_code);
CREATE INDEX idx_wb_reports_category ON whistleblower_reports(category);
```

### 8.2 Tabla: whistleblower_cases

Casos de investigación (conversión de reports).

```sql
CREATE TABLE whistleblower_cases (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number VARCHAR UNIQUE NOT NULL,
  report_id VARCHAR NOT NULL REFERENCES whistleblower_reports(id),
  
  -- Clasificación
  case_category VARCHAR NOT NULL,
  severity VARCHAR,  -- low, medium, high, critical
  
  -- Asignación
  assigned_to VARCHAR REFERENCES users(id),
  assigned_at TIMESTAMP,
  
  -- Investigación
  investigation_status VARCHAR DEFAULT 'pending',  -- pending, active, suspended, closed
  
  -- Plazos
  due_date DATE,
  closed_at TIMESTAMP,
  
  -- Resultado
  conclusion VARCHAR,  -- substantiated, partially_substantiated, unsubstantiated
  conclusion_details TEXT,
  actions_taken TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wb_cases_report ON whistleblower_cases(report_id);
CREATE INDEX idx_wb_cases_assigned ON whistleblower_cases(assigned_to);
CREATE INDEX idx_wb_cases_status ON whistleblower_cases(investigation_status);
```

---

## 9. Módulo de Sistema y Seguridad

### 9.1 Tabla: users

Usuarios del sistema.

```sql
CREATE TABLE users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR UNIQUE NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  
  -- Información personal
  full_name VARCHAR NOT NULL,
  phone VARCHAR,
  position VARCHAR,
  department VARCHAR,
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,
  failed_login_attempts INTEGER DEFAULT 0,
  last_login_at TIMESTAMP,
  
  -- Preferencias
  notification_preferences JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
```

### 9.2 Tabla: roles

Roles del sistema.

```sql
CREATE TABLE roles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB,  -- Array de permisos
  is_system BOOLEAN DEFAULT false,  -- Roles del sistema no editables
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 9.3 Tabla: user_roles

Asignación de roles a usuarios (M:N).

```sql
CREATE TABLE user_roles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id VARCHAR NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by VARCHAR REFERENCES users(id),
  UNIQUE(user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
```

### 9.4 Tabla: sessions

Sesiones de usuario (manejada por connect-pg-simple).

```sql
CREATE TABLE sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP NOT NULL
);

CREATE INDEX idx_sessions_expire ON sessions(expire);
```

### 9.5 Tabla: system_config

Configuración del sistema.

```sql
CREATE TABLE system_config (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  data_type VARCHAR,  -- json, string, number, boolean
  is_active BOOLEAN DEFAULT true,
  updated_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_config_key ON system_config(config_key);
```

**Configuraciones clave:**
- `probability_criteria` - Criterios de probabilidad
- `impact_criteria` - Criterios de impacto
- `risk_ranges` - Rangos de clasificación de riesgo
- `approval_engine_config` - Configuración de motor de aprobaciones

---

## 10. Índices y Optimizaciones

### 10.1 Índices Críticos por Módulo

#### Riesgos
```sql
CREATE INDEX idx_risks_code ON risks(code);
CREATE INDEX idx_risks_category ON risks(category_id);
CREATE INDEX idx_risks_level ON risks(risk_level);
CREATE INDEX idx_risks_deleted ON risks(deleted_at);
CREATE INDEX idx_rpl_risk ON risk_process_links(risk_id);
CREATE INDEX idx_events_fraud ON risk_events(has_fraud);
```

#### Auditoría
```sql
CREATE INDEX idx_audits_code ON audits(code);
CREATE INDEX idx_audits_plan ON audits(plan_id);
CREATE INDEX idx_audits_status ON audits(status);
CREATE INDEX idx_tests_executor ON audit_tests(executor_id);
CREATE INDEX idx_findings_severity ON audit_findings(severity);
```

#### Sistema
```sql
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_expire ON sessions(expire);
```

### 10.2 Restricciones de Integridad

Todas las relaciones many-to-many incluyen:
- `UNIQUE(entity1_id, entity2_id)` para prevenir duplicados
- Índices en ambas FK para optimizar queries bi-direccionales

Todas las entidades principales incluyen:
- Código único con índice
- Índice en `deleted_at` para soft-delete
- Foreign keys con `ON DELETE CASCADE` cuando apropiado

---

## Resumen Técnico

### Totales del Esquema
- **Tablas:** 100+
- **Índices:** 150+
- **Foreign Keys:** 180+
- **Unique Constraints:** 80+
- **Check Constraints:** 50+

### Características Clave
- ✅ Normalización 3NF
- ✅ Soft delete global
- ✅ Audit trail completo
- ✅ Códigos únicos globales
- ✅ Versionamiento de entidades críticas
- ✅ Relaciones M:N con prevención de duplicados
- ✅ Constraints de integridad referencial
- ✅ Índices optimizados para queries frecuentes

---

**Fin del Esquema de Base de Datos**
