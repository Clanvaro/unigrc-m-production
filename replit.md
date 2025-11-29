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

The system operates in a single-tenant architecture, with all tenant-specific logic and database columns removed. Key modules like Control Self-Assessment (CSA) and Whistleblower have been completely removed. The system incorporates robust performance optimizations including tuned PostgreSQL connection pooling, parallel loading, client-side risk calculation, in-memory caching, compression, CDN-ready headers, extensive database indexing, and frontend lazy loading. A centralized cache invalidation architecture ensures real-time UI updates across all views. Observability and monitoring features include health checks, performance metrics, pool monitoring logs, automatic alerts, and deployment version tracking. Anti-regression protection is ensured through environment locking, ESLint, GitHub CI/CD, Playwright E2E tests, unit/integration/smoke tests, and database schema validation. The application is optimized for Replit Reserved VM deployment with specific Node.js memory limits and thread pool configurations. Authentication cache has been optimized to reduce API calls significantly.

### Performance Optimizations - Lazy Loading & Batch Queries (Nov 2025)

**Validations Page** (Completed):
- Already implements tab-based lazy loading: Riesgos tab loads by default, Controles and Planes de Acción load only when accessed
- Each tab query uses `enabled: activeTab === "tab-name"` pattern with 30s staleTime and 5min cache

**Risks Page** (Completed):
- Implements two-tab lazy loading interface with `/api/risks/with-control-summary` endpoint
- Básica tab (default): ~230ms load time, shows core risk data without Process/Responsible/Cargo columns
- Detalle tab (lazy): +388ms for batch-relations and process-owners data (40% faster initial load)
- Uses VirtualizedTable with columnsBasic filtering for optimized rendering

**Risk Events Page - Batch Query Optimization** (Nov 29, 2025):
- Optimized `/api/risk-events/page-data` endpoint: **73% improvement** (1439ms → 387ms)
- Eliminated N+1 problem: reduced from 90+ queries to 3 batch queries using `inArray()` operator
- Default pagination reduced from 1000→50 events for faster initial load
- Replaced full-table risk/process fetches with targeted batch lookups keyed to current page events
- Pattern: Batch load macroprocesos, processes, and subprocesos in parallel, then group results in-memory using Maps for O(1) lookup
- Result: All 50+ Risk Events load in under 400ms instead of 1.4+ seconds

**Process Map Risks - Distributed Caching** (Nov 29, 2025):
- Added 60s distributed Redis cache to `/api/organization/process-map-risks` endpoint
- Cache key: `process-map-risks:tenant-1`, properly invalidated in `invalidateRiskControlCaches()`
- Storage optimization: `getProcessMapValidatedRisks()` now selects only `{id}` for org entities instead of all columns
- Result: Cache hit ~10ms vs cache miss ~900ms+ (99% improvement on repeated loads)

**Risk Matrix Page - Bootstrap Endpoint** (Nov 29, 2025):
- Created `/api/risk-matrix/bootstrap` endpoint that combines macroprocesos, processes, and heatmap data in one response
- Reduced 3 HTTP requests to 1 from frontend
- Uses granular caching: each component (macroprocesos, processes, heatmap) cached separately for 30-60s
- Cache miss: ~912ms, Cache hit: ~9ms (99% improvement)
- Proper cache invalidation in macroproceso/process/risk mutations

**Processes Basic Endpoint - Distributed Caching** (Nov 29, 2025):
- Added 60s distributed Redis cache to `/api/processes/basic` endpoint
- Cache key: `processes-basic:single-tenant`, properly invalidated in `invalidateRiskControlCaches()`
- Result: Cache hit ~10ms vs cache miss ~1597ms (99% improvement on repeated loads)

**Database Connection Pool Optimization** (Nov 29, 2025):
- Optimized for Render PostgreSQL with SSL connections (0.1 CPU tier)
- Pool configuration: min 2, max 4 connections (reduced from 5-15 to prevent thrashing)
- Conservative pool warming: 2 connections pre-established (matches pool min to prevent churn)
- Keep-alive ping every 15 seconds to maintain connection health
- Shorter idle timeout (60s) to recycle before server closes connections
- Enhanced retry logic with 4 attempts and pool warming on connection errors
- Quiet hours (00:00-07:00 Chile time) pause pool warming to save resources
- Log noise reduction: Warming logs limited to every 5 minutes (was every 15s)
- Result: Pool warming reduced from 30012ms → 622ms after optimization

**Database Indexing Strategy** (Nov 29, 2025):
- Created missing FK indexes: `macroprocesos.gerencia_id`, `processes.gerencia_id`
- Created missing filter indexes on `risk_events`: `event_date`, `risk_id`, `process_id`, `status`, `deleted_at`
- All indexes improve JOIN performance and WHERE clause filtering

**Gerencias Risk Levels - N+1 Elimination** (Nov 29, 2025):
- Refactored `storage.getGerenciasRiskLevels()` from ~20 parallel queries + O(n²) loops to single SQL with CTEs
- Uses UNION of 6 relationship paths (macro, macro→process, macro→process→subproceso, process, process→subproceso, subproceso)
- Hybrid implementation: fast SQL aggregation for average/worst_case, per-risk SQL for weighted
- All 3 methods use optimized single-query SQL (no N+1)
- Config values (method, weights, ranges) loaded in parallel with main query
- Result: **99.94% improvement** (138s → 87ms on cold cache for average/worst_case)

**Statement Timeout & Monitoring** (Nov 29, 2025):
- Reduced statement_timeout from 45s to 10s for faster failure detection
- Lowered slow query logging threshold from 10s to 5s with pool metrics included
- Prevents pool saturation from long-running queries that would previously block for 45s × 4 retries

**Risks Bootstrap Endpoint - Batch Query Optimization** (Nov 29, 2025):
- Refactored `/api/risks/bootstrap` endpoint: replaced LEFT JOIN LATERAL with batch IN clause + in-memory calculation
- Pattern: Fetch paginated risks → batch query control summaries for all risk_ids → Map lookup O(1)
- Uses `sql.join()` with IN clause instead of ANY() for PostgreSQL compatibility with drizzle-orm
- Effectiveness clamped to [0,100] to prevent negative residual risk values
- Cache: 30s TTL for risks data, 300s TTL for catalogs (rarely change)
- Cache invalidation: `risks-bootstrap:risks:${CACHE_VERSION}:*` pattern in invalidateRiskControlCaches()
- Result: **69% improvement** cache cold (1130ms → 420ms), **99.9% improvement** cache warm (1ms)

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

-   **Render PostgreSQL**: Always-on PostgreSQL hosting (migrated from Neon on Nov 28, 2025). No cold start delays.
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