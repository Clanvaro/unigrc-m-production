# Overview

Unigrc is a comprehensive risk management application designed to help organizations identify, assess, and manage business risks. It provides tools for systematic risk analysis, including a visual risk matrix, robust reporting, dashboard analytics, and automated fraud detection for audit planning. The system aims to give stakeholders clear visibility into their risk posture, supporting informed decision-making and proactive risk mitigation. The business vision is to empower organizations with proactive risk management capabilities, enhancing strategic decision-making and overall resilience.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions

The frontend is built with React, TypeScript, Vite, Wouter, TanStack Query, Radix UI, shadcn/ui, and Tailwind CSS. Key UI elements include a Visual Risk Matrix, Dynamic Value Chain Map, Risk Relationship Map (using React Flow), and Recharts-based Interactive Risk Heatmap. Features include wizard-based interfaces, enhanced mobile experience, enterprise UX enhancements (global Command Palette, virtualized tables, user-configurable saved filter views), and WCAG 2.2 Level AA compliance. TanStack Query is configured for immediate data synchronization and comprehensive cache invalidation, with defensive data rendering patterns to prevent UI crashes. Comprehensive HTTP cache prevention is implemented across validation endpoints.

## Technical Implementations

The backend uses Express.js with TypeScript and Zod for validation. Data is stored in PostgreSQL (Neon serverless) using Drizzle ORM. Authentication is session-based with Replit Auth, role-based access control, and CSRF protection. Core data models include Processes, Risks, Controls, Action Plans, Risk Events, and Organizational Structure. Features include configurable risk aggregation, hierarchical entity selection, a process-centered validation system, document management, a 4-step Audit Planning Wizard with automated fraud detection, and soft-delete functionality. The system uses BullMQ for asynchronous job processing with automatic fallback to mock queues. A 3-layer cache prevention strategy ensures immediate UI updates after mutations.

## System Design Choices

The system operates in a single-tenant architecture, with all tenant-specific logic and database columns removed.
Key modules like Control Self-Assessment (CSA) and Whistleblower have been completely removed from the system, including their database tables, API endpoints, storage functions, and UI components.
The system incorporates robust performance optimizations including tuned PostgreSQL connection pooling, parallel loading, client-side risk calculation, in-memory caching, compression, CDN-ready headers, extensive database indexing, and frontend lazy loading. A centralized cache invalidation architecture ensures real-time UI updates across all views.
Observability and monitoring features include health checks, performance metrics, pool monitoring logs, automatic alerts, and deployment version tracking. Anti-regression protection is ensured through environment locking, ESLint, GitHub CI/CD, Playwright E2E tests, unit/integration/smoke tests, and database schema validation. The application is optimized for Replit Reserved VM deployment (1 CPU, 2GB RAM) with specific Node.js memory limits and thread pool configurations. Authentication cache has been optimized to reduce API calls significantly. Aggressive keep-alive pings are implemented to mitigate Neon's Scale to Zero cold start issues.

## Database Index Optimization (Nov 28, 2025)

Added 12 new performance indexes for faster query execution on the risks page:
- **Status indexes**: `idx_gerencias_status`, `idx_macroprocesos_status`, `idx_processes_status`, `idx_subprocesos_status`, `idx_controls_status`
- **Composite indexes**: `idx_risks_status_validation`, `idx_gerencias_status_order`, `idx_macroprocesos_status_order`, `idx_processes_status_macro`
- **Risk validation**: `idx_risks_validation_status`
- **Relations**: `idx_process_gerencias_process`, `idx_process_gerencias_gerencia`, `idx_risk_categories_tenant`
- **Users**: `idx_users_is_active`
- Total indexes per table: risks(11), gerencias(8), macroprocesos(7), processes(7), subprocesos(6)

## Header API Call Consolidation (Nov 28, 2025)

Eliminated duplicate API calls in header.tsx when on /risks page:
- **Consolidated queries**: Header now shares `/api/risks/page-data` cache with risks.tsx using same queryKey
- **Removed redundant calls**: `/api/risk-processes`, `/api/risk-controls-with-details` now extracted from risksPageData
- **Smart data sourcing**: effective* variables (effectiveProcesses, effectiveMacroprocesos, etc.) use cached page-data on /risks, individual queries elsewhere
- **Query gating**: `needsProcessData` flag enables queries for /validation, /controls, /actions, /action-plans
- **Skeleton loader**: Added RisksPageSkeleton component with proper table structure, ARIA labels, and data-testid

## Critical Query Pre-Warming at Startup (Nov 28, 2025) - OPTIMIZED

Implemented 2-phase server-side query pre-warming to reduce cold-start latency:
- **Phase 1 (Synchronous)**: Lightweight lookup data only - gerencias, macroprocesos, subprocesos, processes, processOwners, riskCategories, processGerencias
  - Completes in ~2s (down from 3-4 minutes)
  - Cached with 60s TTL as `risks-page-data-lite:${CACHE_VERSION}:default`
- **Phase 2 (Async Background)**: Heavy validation data - first page of riskProcessLinks (notified + not-notified)
  - Non-blocking, runs via `setImmediate()` after Phase 1
  - Cached with 5-minute TTL (300s) for extended availability
  - Uses paginated queries (50 items per page) instead of full-table scans
- **Removed from startup**: `riskProcessLinks` and `riskControls` full-table queries (caused 3-4 min startup delays)
- **New indexes added**: `idx_risk_process_links_risk_validation`, `idx_risk_process_links_process_validation`, `idx_risk_process_links_macroproceso_validation`, `idx_risk_process_links_subproceso_validation`
- Result: Server ready in ~2s, validation pages load instantly from 5-min cache

## Progressive Data Loading for Risks Page (Nov 28, 2025) - ENHANCED

Implemented progressive loading pattern to reduce initial page load time:
- **New endpoint `/api/risks/page-data-lite`**: Returns only filter data (gerencias, macroprocesos, subprocesos, processes, riskCategories, processGerencias) without heavy JOINs for riskProcessLinks and riskControls
- **New endpoint `/api/risks/batch-relations`**: POST endpoint that accepts array of riskIds and returns only the processLinks and controls for those specific risks (max 100 IDs per request)
  - **OPTIMIZED (Nov 28)**: Uses SQL `WHERE IN` queries instead of loading ALL data and filtering in JavaScript
  - New storage methods: `getRiskProcessLinksByRiskIds()`, `getRiskControlsByRiskIds()` with efficient batch loading
  - Performance: Now fetches only needed records directly from database, eliminating memory overhead of full-table loads
- **New endpoint `/api/risks/:id/full-details`**: On-demand loading of full details for a single risk when editing/viewing
- **Frontend loading sequence**: 
  1. Load page-data-lite for filter dropdowns (fast)
  2. Load paginated risks list
  3. Load batch-relations for visible risks only
  4. Load processOwners when risks are displayed
- **Cache optimization**: page-data-lite cached for 60s, batch-relations for 15s
- Result: Initial page load reduced from ~8s to ~2s by deferring heavy relation queries

## React Query Cache Optimization (Nov 28, 2025)

Reduced frontend API calls by optimizing heavy endpoints with extended cache:
- **Endpoints optimized** with `staleTime: 5 minutes`, `refetchOnWindowFocus: false`, `refetchOnReconnect: false`:
  - `/api/risks/page-data-lite` - structural/filter data (gerencias, macroprocesos, etc.)
  - `/api/organization/process-map-risks` - aggregated risk calculations
  - `/api/dashboard/admin` - admin dashboard metrics
  - `/api/process-gerencias-all` - gerencia-process relationships
  - `/api/gerencias-risk-levels` - aggregated risk levels per gerencia
- Result: No redundant API calls when switching tabs or returning to window
- Mutations still invalidate cache properly for immediate data updates

## Authentication Cache Optimization (Nov 27-28, 2025)

Reduced auth API calls from ~10+ per navigation to 1 per session:
- `useAuth` hook updated with `staleTime: 5 minutes` (data rarely changes during session)
- `gcTime: 30 minutes` to keep data in TanStack Query cache longer
- `refetchOnMount: false` - prevents refetch on every component mount
- `refetchOnWindowFocus: false` - prevents refetch when browser tab regains focus
- `refetchOnReconnect: true` - DOES refetch on network reconnect to detect session expiration
- **Immediate session expiration**: useAuth queryFn calls `handleSessionExpired()` directly on 401 responses (not waiting for threshold)
- `handleSessionExpired()` clears queryClient and redirects to /login immediately
- Result: Single `/api/auth/me` call per session instead of multiple calls per page navigation

## Static Asset Middleware Optimization (Nov 28, 2025)

Optimized session/passport middleware to skip static file requests:
- **Skip pattern**: Routes starting with `/@`, `/node_modules/`, `/@fs/`, `/src/` and files ending with `.tsx`, `.ts`, `.css`, `.js`, `.map`, `.png`, `.jpg`, `.svg`, `.ico`, `.woff`, `.woff2`
- **Session middleware skip**: Static files bypass PostgreSQL session store lookup entirely
- **Passport.session() skip**: No deserializing of user session for static assets
- **Result**: Static files now served in 0-1ms (previously 140-180ms with Passport deserialization per file)
- **Impact**: Page reload no longer triggers dozens of session/passport deserializations for Vite dev server files

## Production Database Schema Sync (Nov 27, 2025) - RESOLVED

Fixed critical production errors by syncing missing columns in risk_events table:
- Added 18 missing columns: control_id, process_id, involved_persons, event_type, severity, status, reported_by, investigated_by, resolution_notes, estimated_loss, actual_loss, causas, consecuencias, created_by, updated_by, deleted_by, deleted_at, deletion_reason
- Resolved "column does not exist" errors in /api/risk-events/page-data endpoint
- All production endpoints now return 200 OK status
- Admin dashboard fully operational with all metrics loaded
- Database schema now fully synchronized with codebase expectations
- Status: **Production fully operational** ✅

## Core Features

-   **Authentication System**: Replit Auth with various providers and mock fallback.
-   **Platform Admin Dashboard**: For managing users with CRUD capabilities.
-   **Setup Wizard**: 4-step guided configuration.
-   **Audit Plan Approval System**: Role-based approval workflow.
-   **Ad-Hoc Audit Risk Evaluation System**: Supports factor-based and manual evaluation.
-   **Email Notification System**: For validation workflows, action plan reminders, and critical communications.
-   **Validation Center**: 3-state validation workflow with bulk actions.
-   **AI Assistant**: Powered by Azure OpenAI (GPT-4o-mini) with a three-tier response strategy, data sanitization, rate limiting, and Audit Test Suggestion feature.
-   **Historical Risk Comparison**: Automatic temporal comparison of risk evolution.

# External Dependencies

-   **Neon Database**: Serverless PostgreSQL hosting for production and development.
-   **Render Hosting**: Node.js web service for production deployment.
-   **Replit Integration**: Development environment tools and Replit Auth.
-   **Google Fonts**: Inter font family.
-   **Recharts**: For dashboard analytics and visualizations.
-   **React Flow**: For risk relationship maps.
-   **html2canvas**: Client-side PNG export functionality.
-   **date-fns**: For date formatting and manipulation.
-   **Lucide React**: Icon system.
-   **Mailgun API and SMTP**: For email services.
-   **Azure OpenAI**: Enterprise AI service for the integrated AI assistant.
-   **Upstash Redis**: Distributed caching via Redis REST API.