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

## React Query Cache Optimization (Nov 28, 2025)

Reduced frontend API calls by optimizing heavy endpoints with extended cache:
- **Endpoints optimized** with `staleTime: 5 minutes`, `refetchOnWindowFocus: false`, `refetchOnReconnect: false`:
  - `/api/risks/page-data` - structural data (gerencias, macroprocesos, etc.)
  - `/api/organization/process-map-risks` - aggregated risk calculations
  - `/api/dashboard/admin` - admin dashboard metrics
  - `/api/process-gerencias-all` - gerencia-process relationships
  - `/api/gerencias-risk-levels` - aggregated risk levels per gerencia
- Result: No redundant API calls when switching tabs or returning to window
- Mutations still invalidate cache properly for immediate data updates

## Authentication Cache Optimization (Nov 27, 2025)

Reduced auth API calls from ~10+ per navigation to 1 per session:
- `useAuth` hook updated with `staleTime: 5 minutes` (data rarely changes during session)
- `gcTime: 30 minutes` to keep data in TanStack Query cache longer
- `refetchOnMount: false` - prevents refetch on every component mount
- `refetchOnWindowFocus: false` - prevents refetch when browser tab regains focus
- `refetchOnReconnect: true` - DOES refetch on network reconnect to detect session expiration
- **Immediate session expiration**: useAuth queryFn calls `handleSessionExpired()` directly on 401 responses (not waiting for threshold)
- `handleSessionExpired()` clears queryClient and redirects to /login immediately
- Result: Single `/api/auth/me` call per session instead of multiple calls per page navigation

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