# Overview

Unigrc is a comprehensive risk management application designed to help organizations identify, assess, and manage business risks. It provides tools for systematic risk analysis, including a visual risk matrix, robust reporting, dashboard analytics, and automated fraud detection for audit planning. The system aims to give stakeholders clear visibility into their risk posture, supporting informed decision-making and proactive risk mitigation. The business vision is to empower organizations with proactive risk management capabilities, enhancing strategic decision-making and overall resilience.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions

The frontend is built with React, TypeScript, Vite, Wouter, TanStack Query, Radix UI, shadcn/ui, and Tailwind CSS. Key UI elements include a Visual Risk Matrix, Dynamic Value Chain Map, Risk Relationship Map (using React Flow), and Recharts-based Interactive Risk Heatmap. Features include wizard-based interfaces, enhanced mobile experience, enterprise UX enhancements (global Command Palette, virtualized tables, user-configurable saved filter views), and WCAG 2.2 Level AA compliance. TanStack Query is configured for immediate data synchronization and comprehensive cache invalidation, with defensive data rendering patterns to prevent UI crashes. Comprehensive HTTP cache prevention is implemented across validation endpoints.

## Technical Implementations

The backend uses Express.js with TypeScript and Zod for validation. Data is stored in PostgreSQL (Neon serverless) using Drizzle ORM. Authentication is session-based with Replit Auth, role-based access control, and CSRF protection. Core data models include Processes, Risks, Controls, Action Plans, Risk Events, and Organizational Structure. Features include configurable risk aggregation, hierarchical entity selection, a process-centered validation system, document management, a 4-step Audit Planning Wizard with automated fraud detection, and soft-delete functionality. The system uses BullMQ for asynchronous job processing with automatic fallback to mock queues. A 3-layer cache prevention strategy ensures immediate UI updates after mutations.

## Single-Tenant Architecture (Nov 27, 2025)

The system now operates in single-tenant mode, designed for a single organization. Key changes from the previous multi-tenant architecture:
- Removed `tenants` and `tenant_users` tables from the database schema
- Removed `tenantId` columns from all entity tables (risks, controls, processes, action_plans, etc.)
- Simplified authentication flow: users log in directly without tenant selection
- Role-based access control remains active with users, roles, and user_roles tables
- All CRUD operations function without tenant filtering
- Frontend removed TenantSwitcher component and activeTenant dependencies
- Session-based authentication with Replit Auth and local authentication support

### Implementation Details (Nov 27, 2025 - Final Fixes)
- `resolveActiveTenant(req)` function returns fixed `{ tenantId: 'default', userId }` for all requests
- `withTenantId()` function is now a no-op that returns data unchanged (no longer injects tenantId)
- All storage interface methods (`IStorage`) have been updated to remove tenantId parameters
- Cache helper functions use fixed `'single-tenant'` key instead of dynamic tenantId
- All route handlers updated to call storage methods without tenantId argument
- Notification service (`notification-service.ts`) updated: removed tenantId from CreateNotificationOptions and all database queries
- Escalation management (`escalation-management.ts`) updated: removed tenantId from sendEscalationNotifications and all notification calls
- Approval engine (`approval-engine.ts`) updated: removed tenantId from notification calls
- Notification scheduler (`notification-scheduler.ts`) updated: removed tenantId from notification batching
- **Database Defaults**: All tables with `tenant_id` columns now have DEFAULT 'default' constraint to support single-tenant inserts
- **Process Owners API Fixes**: Fixed `getProcessOwners()` calls in routes.ts (lines 1548, 1767, 19726) to remove tenantId parameter
- **Cache Invalidation Fixed**: Process owner POST/PUT endpoints now correctly invalidate cache with key `'process-owners:v2:default'` instead of trying to access non-existent tenantId

## Control Self-Assessment (CSA) Module Removal (Nov 27, 2025)

The Control Self-Assessment module has been completely removed from the system:
- Removed `control_self_assessments` and `control_self_assessment_items` database tables from schema.ts
- Removed all CSA-related API endpoints from routes.ts
- Removed CSA storage functions from storage.ts
- Removed CSA email notification functions from email-service.ts
- Removed CSA navigation items from sidebar.tsx
- Removed CSA routes and lazy-loaded components from App.tsx
- Removed CSA prefetch mappings and header references

## Whistleblower (Canal de Denuncias) Module Removal (Nov 27, 2025)

The Whistleblower module has been completely removed from the system:
- Removed `whistleblower_reports`, `whistleblower_case_notes`, `whistleblower_files`, and `whistleblower_report_status_history` database tables from schema.ts
- Removed dedicated server files: whistleblower-workflow.ts, whistleblower-notifications.ts, whistleblower-analytics.ts
- Removed all whistleblower-related API endpoints from routes.ts (~1000 lines)
- Removed whistleblower storage functions and types from storage.ts
- Removed whistleblower email notification functions from email-service.ts
- Removed whistleblower references from export-service.ts and ai-assistant-routes.ts
- Removed whistleblower navigation from sidebar.tsx
- Removed whistleblower routes and lazy-loaded components from App.tsx
- Removed whistleblower header configurations from headerConfig.ts
- Removed whistleblower breadcrumb routes from Breadcrumbs.tsx
- Removed whistleblower permissions from role-form.tsx and roles.tsx
- Deleted whistleblower page files: whistleblower-report.tsx, whistleblower-track.tsx, whistleblower-dashboard.tsx, whistleblower-case-details.tsx

## Core Features

-   **Authentication System**: Replit Auth with various providers and mock fallback.
-   **Platform Admin Dashboard**: For managing tenants and users with CRUD capabilities.
-   **Setup Wizard**: 4-step guided configuration.
-   **Audit Plan Approval System**: Role-based approval workflow.
-   **Ad-Hoc Audit Risk Evaluation System**: Supports factor-based and manual evaluation.
-   **Email Notification System**: Email notifications for validation workflows, action plan reminders, and critical communications.
-   **Validation Center**: 3-state validation workflow with bulk actions.
-   **AI Assistant**: Powered by Azure OpenAI (GPT-4o-mini) with a three-tier response strategy, data sanitization, rate limiting, and Audit Test Suggestion feature.
-   **Historical Risk Comparison**: Automatic temporal comparison of risk evolution.
-   **Performance Optimizations**: Tuned PostgreSQL connection pooling, parallel loading, client-side risk calculation, in-memory caching, compression, CDN-ready headers, extensive database indexing, and frontend lazy loading. Includes module-specific optimizations and frontend pagination for Risks and Controls. A centralized cache invalidation architecture ensures real-time UI updates across all views. Distributed caching is implemented for performance-critical endpoints with automatic invalidation. Enhanced frontend cache invalidation uses `exact: false` matching with forced refetch for immediate visibility of newly created/updated risks. **Consolidated API endpoints** (`/api/risks/page-data`, `/api/risk-events/page-data`) reduce initial page loads from multiple API calls to 1. **Login endpoint instrumentation** added to diagnose production latency (tracks bcrypt timing, DB queries, session operations). **Admin dashboard parallelization**: 16 independent queries now execute in a single Promise.all (reduced from 3 sequential blocks). **Redis-based system_config cache**: All config values loaded once and cached for 10 minutes, eliminating 7+ individual queries per request.
-   **Observability & Monitoring**: Health checks, performance metrics, pool monitoring logs, automatic alerts, and deployment version tracking.
-   **Anti-Regression Protection**: Environment locking, ESLint, GitHub CI/CD, Playwright E2E tests, unit/integration/smoke tests, and database schema validation.
-   **Bundle Size Optimization & Deployment**: Optimized for Replit Reserved VM Deployment by removing unused dependencies and externalizing npm dependencies.
-   **Deployment Validation & Production Readiness**: Comprehensive pre-deployment validation, enhanced `/health` endpoint, and post-deployment smoke tests.
-   **Memory Configuration**: Node.js memory limits configured in `package.json` for optimal production performance.
-   **Reserved VM Optimization (Nov 26, 2025)**: Configured for Replit Reserved VM 1 CPU 2GB RAM deployment:
    - Node.js heap: 1.5GB (`--max-old-space-size=1536`)
    - UV_THREADPOOL_SIZE=4 for async I/O operations
    - PostgreSQL pool: max 10 (pooled) / 6 (direct), min 1 connection
    - Compression: level 4, memLevel 6 (balanced CPU/compression)
    - Pool warming: reduced to 2 connections, 75% saturation alert threshold
-   **Production Timing Instrumentation (Nov 27, 2025)**: Comprehensive performance logging to diagnose delays:
    - `[Session]` - Session store latency (logs >500ms as SLOW, >100ms in production)
    - `[isAuthenticated]` - Auth middleware timing (OIDC config/refresh, DB queries, cache operations)
    - `[resolveActiveTenant]` - Tenant resolution (cache lookup, DB query, source identification)
    - `[PERF] /api/risks/page-data` - Full endpoint timing (preQuery, parallel DB queries, cache get/set, pool metrics)
    - Thresholds: >50ms auth, >100ms session/tenant resolution, >500ms total request = SLOW warnings
-   **Neon Scale to Zero Mitigation (Nov 27, 2025)**: Aggressive keep-alive pings every 20 seconds (reduced from 45s) to prevent Neon database from sleeping. Neon's Scale to Zero feature suspends the database after ~5 minutes of inactivity, causing 30-60 second cold start delays. **Recommended**: Disable Scale to Zero in Neon console for production workloads.

## Render Deployment & Database Synchronization (Nov 27, 2025 - Completed)

Production deployment successfully completed with full database synchronization:
- **Render Service**: UNIGRC (Node/Starter) - https://unigrc.onrender.com
- **Production Database**: Neon (us-west-2 Oregon) - `ep-muddy-breeze-aft589fg-pooler`
- **Database Status**: 146 tables synced between Replit (dev) and Render (prod)
- **Synchronization Method**: Exported schema from Replit using pg_dump, created 103 missing tables in Render
- **Tables per module**: approval_*, audit_*, compliance_*, escalation_*, notification_*, user_preferences, working_papers, etc.
- **Authentication**: Session-based with local credentials (Valencia.araneda@gmail.com / Admin2024!)
- **Login Verification**: Tested 11/27/2025 18:35 UTC - Login working correctly on production

# External Dependencies

-   **Neon Database**: Serverless PostgreSQL hosting. 
    - Production (Render): `ep-muddy-breeze-aft589fg-pooler` (us-west-2 Oregon)
    - Development (Replit): `DATABASE_URL` via Replit integration
    - Connection strategy: `server/db.ts` prioritizes `DATABASE_URL` over `POOLED_DATABASE_URL`
-   **Render Hosting**: Node.js web service for production deployment.
-   **Replit Integration**: Development environment tools and Replit Auth.
-   **Google Fonts**: Inter font family.
-   **Recharts**: For dashboard analytics and visualizations.
-   **React Flow**: For risk relationship maps.
-   **html2canvas**: Client-side PNG export functionality.
-   **date-fns**: For date formatting and manipulation.
-   **Lucide React**: Icon system.
-   **Email Services**: Mailgun API and SMTP.
-   **Azure OpenAI**: Enterprise AI service for the integrated AI assistant.
-   **Upstash Redis**: Distributed caching via Redis REST API.
