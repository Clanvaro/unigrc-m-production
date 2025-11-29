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

## Performance Optimizations (Nov 29, 2025)

-   **Risk Matrix Endpoint**: `/api/risk-matrix/optimized` uses CTE-based SQL approach for ~87ms response (production-compatible).
-   **Validation Lite Endpoint**: `/api/risk-processes/validation/lite` consolidates 4+ queries into single SQL using CTEs, returns counts + first 50 items per status, cached for 30s (~200-300ms).
-   **Catalog Endpoints**: Separated individual cached endpoints for macroprocesos, processes, subprocesos with 5-10 minute TTL.
-   **Database Indexing**: Added `idx_actions_origin_deleted` for audit wizard filter optimization.
-   **Storage Function Batch Loading**: `getRiskProcessLinksByValidationStatus` uses batch-fetch for owner lookups to prevent N+1 queries.

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

-   **Render PostgreSQL**: Always-on PostgreSQL hosting.
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