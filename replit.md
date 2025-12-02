# Overview

Unigrc is a comprehensive risk management application designed to help organizations identify, assess, and manage business risks. It provides tools for systematic risk analysis, including a visual risk matrix, robust reporting, dashboard analytics, and automated fraud detection for audit planning. The system aims to give stakeholders clear visibility into their risk posture, supporting informed decision-making and proactive risk mitigation. The business vision is to empower organizations with proactive risk management capabilities, enhancing strategic decision-making and overall resilience.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions

The frontend is built with React, TypeScript, Vite, Wouter, TanStack Query, Radix UI, shadcn/ui, and Tailwind CSS. Key UI elements include a Visual Risk Matrix, Dynamic Value Chain Map, Risk Relationship Map (using React Flow), and Recharts-based Interactive Risk Heatmap. Features include wizard-based interfaces, enhanced mobile experience, enterprise UX enhancements (global Command Palette, virtualized tables, user-configurable saved filter views), and WCAG 2.2 Level AA compliance. TanStack Query is configured for immediate data synchronization and comprehensive cache invalidation, with defensive data rendering patterns to prevent UI crashes. Comprehensive HTTP cache prevention is implemented across validation endpoints.

## Technical Implementations

The backend uses Express.js with TypeScript and Zod for validation. Data is stored in PostgreSQL (Render) using Drizzle ORM. Authentication is session-based with Replit Auth, role-based access control, and CSRF protection. Core data models include Processes, Risks, Controls, Action Plans, Risk Events, and Organizational Structure. Features include configurable risk aggregation, hierarchical entity selection, a process-centered validation system, document management, a 4-step Audit Planning Wizard with automated fraud detection, and soft-delete functionality. The system uses BullMQ for asynchronous job processing with automatic fallback to mock queues. A 3-layer cache prevention strategy ensures immediate UI updates after mutations.

## System Design Choices

The system operates in a single-tenant architecture. It incorporates robust performance optimizations including tuned PostgreSQL connection pooling, parallel loading, client-side risk calculation, in-memory caching, compression, CDN-ready headers, extensive database indexing, and frontend lazy loading. A centralized cache invalidation architecture ensures real-time UI updates across all views. Observability and monitoring features include health checks, performance metrics, pool monitoring logs, automatic alerts, and deployment version tracking. Anti-regression protection is ensured through environment locking, ESLint, GitHub CI/CD, Playwright E2E tests, unit/integration/smoke tests, and database schema validation. The application is optimized for Replit Reserved VM deployment. A two-level distributed caching architecture (endpoint and storage function) is implemented for maximum performance.

## API Optimization Principles

Guía de optimización para APIs de lectura intensiva. La secuencia **índice → pool → cache** es la hoja de ruta más efectiva:

### 1. Índices Primero (No es Node.js)
El 95% del tiempo de respuesta está en esperar a la base de datos. Antes de optimizar código JavaScript, verifica que las columnas en WHERE, JOIN y ORDER BY tengan índices adecuados. Sin índices, PostgreSQL hace escaneos completos de tablas.

### 2. Connection Pools (No conexiones por request)
Abrir una conexión SSL toma ~50-100ms cada vez. Usar un pool pre-calentado elimina esta latencia. Configurar `min` connections para mantener conexiones "tibias" listas para usar inmediatamente.

### 3. Cache en Lecturas Frecuentes
Para datos que no cambian frecuentemente (dashboards, catálogos, contadores), usar cache con TTL apropiado. En sistemas single-tenant, TTLs de 2-15 minutos son seguros y eliminan ~90% de queries redundantes.

### 4. Microoptimizaciones al Final
Optimizar loops, cambiar `for` por `forEach`, o reducir allocations solo tiene impacto cuando ya resolviste los cuellos de botella de I/O. Hasta entonces, es ruido.

### Errores Comunes a Evitar
- Culpar a Node.js cuando el problema son índices faltantes
- Abrir/cerrar conexiones por request en vez de usar pools
- No usar cache en lecturas frecuentes
- Confiar en microoptimizaciones antes de resolver la capa de datos

---

## Performance Optimizations (Nov 30, 2025)

### Aggressive Caching Strategy (Single-Tenant)
-   **15-Minute TTL**: All risk module endpoints now use 900s cache TTL: `/api/risks-overview`, `/api/controls`, `/api/risk-events/page-data`, `/api/risk-controls-with-details`
-   **Granular Cache Invalidation**: Replaced nuclear `invalidateRiskControlCaches()` with surgical functions:
    - `invalidateRiskDataCaches()` - Risk mutations only
    - `invalidateControlDataCaches()` - Control mutations only
    - `invalidateRiskControlAssociationCaches()` - Risk-control links only
    - `invalidateRiskEventsPageDataCache()` - Risk event mutations (includes risks-overview)
    - `invalidateValidationCaches()` - Validation workflow changes
-   **Instant UI Updates**: Optimistic updates (onMutate + setQueryData) for controls/risks, refetchType: 'all' for risk-events

### Endpoint Optimizations
-   **Risk Matrix Endpoint**: `/api/risk-matrix/optimized` uses CTE-based SQL approach for ~87ms response (production-compatible).
-   **Risks Overview Endpoint**: `/api/risks-overview` returns lightweight ~50KB payload vs 700KB from bootstrap, with pre-aggregated counts.
-   **Validation Lite Endpoint**: `/api/risk-processes/validation/lite` consolidates 4+ queries into single SQL using CTEs, returns counts + first 50 items per status.
-   **Catalog Endpoints**: Separated individual cached endpoints for macroprocesos, processes, subprocesos with 5-10 minute TTL.
-   **Database Indexing (Deployed to Render)**: 15+ production indexes created for query optimization:
    - `idx_risk_process_links_validation_notification` - Validation status queries
    - `idx_risks_deleted_at`, `idx_risks_inherent_risk`, `idx_risks_residual_risk`, `idx_risks_inherent_residual` - Risk filtering and sorting
    - `idx_controls_deleted_at`, `idx_risk_controls_risk_id`, `idx_risk_controls_control_id` - Control lookups
    - `idx_actions_status`, `idx_actions_deleted_at`, `idx_actions_due_date`, `idx_actions_origin_deleted` - Action plan filtering
    - `idx_processes_macroproceso_id`, `idx_processes_deleted_at`, `idx_subprocesos_proceso_id`, `idx_subprocesos_deleted_at`, `idx_macroprocesos_deleted_at` - Process hierarchy navigation
-   **Storage Function Batch Loading**: `getRiskProcessLinksByValidationStatus` uses batch-fetch for owner lookups to prevent N+1 queries.
-   **Connection Pool**: Optimized for Basic-1gb (max=10, min=3 warm connections, 60s idle timeout, 10s statement timeout).

## Core Features

-   **Authentication System**: Replit Auth with various providers and mock fallback.
-   **Platform Admin Dashboard**: For managing users with CRUD capabilities.
-   **Setup Wizard**: 4-step guided configuration.
-   **Audit Plan Approval System**: Role-based approval workflow.
-   **Ad-Hoc Audit Risk Evaluation System**: Supports factor-based and manual evaluation.
-   **Email Notification System**: For validation workflows, action plan reminders, and critical communications.
-   **Validation Center**: 3-state validation workflow with bulk actions.
-   **AI Assistant**: Powered by OpenAI (GPT-4o-mini) with a three-tier response strategy, data sanitization, rate limiting, and Audit Test Suggestion feature.
-   **Historical Risk Comparison**: Automatic temporal comparison of risk evolution.

# External Dependencies

-   **Render PostgreSQL**: Basic-1gb plan (1 GB RAM, 0.5 CPU) for always-on PostgreSQL hosting.
-   **Render Hosting**: Node.js web service for production deployment.
-   **Replit Integration**: Development environment tools and Replit Auth.
-   **Google Fonts**: Inter font family.
-   **Recharts**: For dashboard analytics and visualizations.
-   **React Flow**: For risk relationship maps.
-   **html2canvas**: Client-side PNG export functionality.
-   **date-fns**: For date formatting and manipulation.
-   **Lucide React**: Icon system.
-   **Mailgun API and SMTP**: For email services.
-   **OpenAI API**: AI service for the integrated AI assistant (requires OPENAI_API_KEY).
-   **Upstash Redis**: Distributed caching via Redis REST API.