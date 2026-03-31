# Discovery: Education Analytics Platform

## Problem Statement
Schools need a fast, reliable workflow for publishing academic progress in near real time. Teachers currently manage marks and assignments in fragmented tools, parents receive delayed updates, and administrators lack actionable class-wise and subject-wise insights.

This project solves that by providing:
- Teacher workflows for continuous academic updates.
- Parent-facing digital report cards with progress visualization.
- School and department analytics for performance trends and learning gaps.

## Scope for MVP
The MVP targets an end-to-end workflow within a constrained 3-hour delivery window.

In scope:
- Authentication and role-based access for teacher, parent, admin, department.
- Academic records pipeline (marks, assignments, report cards).
- Parent dashboard data endpoints.
- Analytics endpoints for class/subject performance and learning gaps.
- Auditability of critical academic updates.

Out of scope (MVP):
- Advanced ML remediation engine.
- Multi-tenant district-wide production architecture.
- Native mobile app build.
- Full offline synchronization.

## Primary Users and Needs
### Teacher
- Upload marks and assignment outcomes quickly.
- Confirm published updates are visible to parents.
- Maintain data integrity with minimal friction.

### Parent
- View latest report card and trend lines for student performance.
- Receive timely updates when new records are published.
- Trust that data is accurate and secure.

### School Admin
- Track class-level and subject-level outcomes.
- Detect weak performance segments early.
- Support remedial planning with evidence.

### Department User
- Review broader trends and compare cohorts.
- Identify systemic learning gaps for policy decisions.

## Functional Requirements (Discovery View)
- Continuous academic update workflow from teacher to parent visibility.
- Report card retrieval and progress history for parents.
- Role-constrained access to data and actions.
- Analytics summaries for class and subject performance.
- Auditable trail of key records and state changes.

## Non-Functional Requirements (Discovery View)
- Secure handling of user data and role boundaries.
- Consistent API behavior with clear validation errors.
- Maintainable codebase with modular boundaries.
- Responsive UX support for mobile parent usage.

## Constraints and Assumptions
- Timebox is strict (3-hour practical target).
- Single-school MVP is acceptable for initial delivery.
- Polling is acceptable for near-real-time parent updates in MVP.
- PostgreSQL is the system of record.
- JWT-based authentication is sufficient for MVP security posture.

## Risks and Mitigations
- Risk: Over-scoping under tight timeline.
  - Mitigation: Prioritize end-to-end critical path before enhancements.

- Risk: Data access leakage between roles.
  - Mitigation: Enforce RBAC in middleware and database-level policies.

- Risk: Incomplete traceability of changes.
  - Mitigation: Audit logging via triggers and explicit action logging.

- Risk: Real-time complexity delays delivery.
  - Mitigation: Use polling now; keep WebSocket as post-MVP enhancement.

## Proposed MVP Architecture Direction
- Backend: Node.js + Express with logical service modules.
- Database: PostgreSQL with normalized entities and audit logs.
- Auth: JWT + RBAC middleware.
- Real-time pattern: Parent polling endpoint for updates.
- Frontend: React-based responsive web interface.

## Core Domain Entities
- User, Role, School, Department
- Teacher, Student, Class, Subject
- Mark, Assignment, ReportCard
- AuditLog, NotificationSubscription, PerformanceCache

## Success Criteria for MVP
- Teacher can publish marks successfully.
- Parent can retrieve latest student progress and report card data.
- Admin/department can fetch class/subject analytics.
- Unauthorized role access is blocked.
- Key academic updates are auditable.

## Delivery Notes
This discovery document captures initial assumptions, scope boundaries, and implementation direction. It should be updated if major product or architecture decisions change during later phases.
