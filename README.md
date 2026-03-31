# Education Analytics Platform - Implementation Guide

## Project Overview

**Objective**: Develop a platform where teachers upload marks, assignments, and continuous assessments in real time. Parents receive digital report cards with progress graphs via a mobile app. Schools and education departments get analytics on class-wise and subject-wise performance, learning gaps, and remedial recommendations.

**Timeline**: 3 hours (subject to adjustment at the company's discretion).

## Goals
- Deliver a functional, end-to-end academic reporting and analytics workflow for teachers, parents, and administrators.
- Demonstrate engineering workflow, commit discipline, and documentation quality.

## Core Features (MVP)
- Teacher workflows for publishing ongoing academic progress updates.
- Parent-facing mobile experience for digital report cards and progress visualization.
- School and department analytics views for performance and learning gap insights.
- Role-appropriate access for teacher, parent, school, and department audiences.
- Internal notes or operational context for school staff (not parent-facing).

## Functional Requirements
- Support continuous academic updates and report card generation workflows.
- Enable secure collaboration and visibility across teacher, parent, and administrator roles.
- Provide analytics on class and subject performance trends and learning gaps.
- Offer ways to locate, organize, and review academic progress information.
- Maintain an auditable record of key academic updates and reporting milestones.

## Non-Functional Requirements
- Maintain consistent UX and responsive UI for desktop and mobile.
- Use clear error handling and validation feedback.
- Follow secure coding practices and role-appropriate visibility.
- Ensure code readability and maintainability.

## Illustrative User Flows
- Teacher publishes a new academic update and confirms visibility to parents.
- Parent reviews a digital report card and progress visuals for a student.
- School administrator reviews performance trends and learning gap insights.
- Education department reviews class and subject analytics for remedial planning.

## Testing Expectations
- Unit and integration tests are strongly encouraged, with a clear test command documented in `README.md`.

## Suggested Microservices (Optional)
- Academic Records Service: manage academic updates and report card generation.
- Parent App Service: deliver report cards, progress visuals, and notifications.
- Analytics Service: compute performance trends, gaps, and recommendations.
- Access and Permissions Service: manage role-based visibility and governance.

## Key Technical Opportunities (Optional)
- Postgres for academic records, users, and reporting history.
- Redis for caching dashboards and progress visuals.
- Queue for asynchronous report generation and analytics computation.
- Frontend for teacher, parent, and administrator experiences.
- Docker Compose for local orchestration of services.

## Stretch Opportunities
- Predictive remediation recommendations based on trend analysis.
- Multi-school rollups with district-level benchmarking.
- Automated alerts for sudden performance drops or overdue updates.
- Offline-friendly parent app experience with sync on reconnect.

## Delivery Approach (Required)
Students are expected to follow a disciplined development workflow. These practices are part of the evaluation:
- Discovery: clarify requirements, list assumptions, define scope.
- Planning: define milestones and a task breakdown.
- Implementation: write small, incremental commits with clear intent.
- Verification: run tests and check critical flows.
- Documentation: maintain clear and complete repository documentation.
- Review: use AI responsibly and record AI review notes for each commit.

## Repository-Based Practical Exercise
The main exercise is an individual practical implementation activity. Every participating student must work through a repository under the designated organization.

Evaluation will be primarily based on the contents of the repository, the quality and sequence of commits, the associated documentation, and the final state referenced by the submitted commit ID.

## Repository Rules
- Students must commit their work regularly to the repository. Work that is not reflected in the repository may be treated as non-existent for evaluation purposes.
- The final evaluated submission will be tied to a specific commit ID declared by the participant.
- The Loom demo video must correspond to the exact repository state represented by the submitted commit ID.

---

## Setup & Execution

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL 12+

### Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL credentials if different
   ```

3. **Initialize database**
   ```bash
   npm run db:init
   # OR reset database (clears all data):
   npm run db:reset
   ```

4. **Start the backend server**
   ```bash
   npm start          # Production
   npm run dev        # Development with nodemon
   ```
   Backend runs on `http://localhost:5000`

5. **Start the frontend app**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    Frontend runs on `http://localhost:5173`

6. **Health check**
   ```bash
   curl http://localhost:5000/health
   ```

7. **Run backend tests**
   ```bash
   npm test
   ```

---

## API Endpoints Summary

### Authentication (`/api/auth`)
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/login` | - | - | Login and get JWT token |
| POST | `/register` | - | - | Register a new user |
| GET | `/me` | ✅ | Any | Get current authenticated user |
| POST | `/logout` | ✅ | Any | Logout (client deletes token) |

### Academics (`/api/academics`)
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/marks` | ✅ | teacher | Upload marks for student |
| GET | `/classes/:classId/marks` | ✅ | teacher,admin | Get all marks in class |
| POST | `/assignments` | ✅ | teacher | Create assignment |
| GET | `/assignments/:classId` | ✅ | Any | Get class assignments |

### Parents (`/api/parents`)
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/dashboard` | ✅ | parent | Get student dashboard |
| GET | `/students/:studentId/progress` | ✅ | parent | Get student progress history |
| GET | `/reportcards/:reportCardId` | ✅ | parent | Get report card |
| GET | `/updates/:studentId` | ✅ | parent | Poll for updates (real-time) |

### Analytics (`/api/analytics`)
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/class/:classId/performance` | ✅ | admin,department | Class performance metrics |
| GET | `/subject/:subjectId/gaps` | ✅ | admin,department | Learning gaps report |
| GET | `/trends` | ✅ | admin,department | Performance trends |

---

## Project Structure

```
.
├── server.js                    # Express app entry point
├── db.js                        # PostgreSQL connection pool
├── schema.sql                   # Database DDL + sample data
├── package.json                 # Backend dependencies
├── jest.config.js               # Backend test config
├── middleware/
├── routes/
├── services/
├── tests/                       # Backend jest tests
├── docs/                        # Discovery and planning docs
├── .reviews/                    # Per-phase AI review files
└── frontend/                    # React + Vite application
```

---

## Database Schema Overview

### Core Entities
- **users**: Authentication and role management
- **roles**: teacher, parent, admin, department
- **students**: Student records linked to classes
- **teachers**: Teacher profiles with qualifications
- **classes**: Class groupings with grade/section
- **subjects**: Academic subjects
- **marks**: Immutable academic marks (audit trail)
- **assignments**: Assignment definitions
- **reportcards**: Snapshot documents
- **audit_logs**: Audit trail for all changes

### Key Features
✅ Row-Level Security (RLS) for role-based data filtering  
✅ Immutable marks table (insert-only, never overwrite)  
✅ Audit triggers on marks and reportcards  
✅ Performance cache for analytics queries  
✅ SampleData seeded in schema.sql

---

## Authentication & Authorization

### JWT Flow
```
Client Login
    ↓
POST /api/auth/login (email + password)
    ↓
Server: bcrypt password check
    ↓
Server: Generate JWT {userId, expiresIn: 7d}
    ↓
Return token to client
    ↓
Client stores token in localStorage
    ↓
All requests: Header: Authorization: Bearer <token>
```

### RBAC Middleware
- `authMiddleware`: Verifies JWT, fetches user with role
- `rbac(role)`: Guards endpoint by role(s)

Example:
```javascript
router.post('/marks', authMiddleware, rbac('teacher'), async (req, res) => {
  // Only authenticated teachers can access
});

router.get('/analytics/class/:id', authMiddleware, rbac(['admin', 'department']), (req, res) => {
  // Only admins or department users can access
});
```

---

## Design Decisions

### Architecture Choice: Monolithic Backend with Logical Separation
- **Why**: Fast to build in 3-hour window; easy to extract services later
- **Services**: academics, parents, analytics, auth (logical folders, not separate deployments)
- **If we had more time**: Extract to microservices with Docker Compose

### Real-Time Updates: Polling (not WebSocket)
- **Why**: Polling takes 30 mins; WebSocket takes 1.5 hours for same UX
- **Implementation**: Parent polls `GET /api/updates/:studentId?since=timestamp` every 30 secs
- **Future**: Upgrade to WebSocket for true push notifications

### Mark Storage: Immutable (Insert-Only)
- **Why**: Prevents accidental overwrites; full audit trail; data integrity
- **Corrections**: Create new mark entry + add note to audit log
- **Benefit**: Can reconstruct any state at any point in time

### Auth: JWT + RBAC (not OAuth)
- **Why**: OAuth adds 45 mins complexity for no UX benefit in MVP
- **Trade-off**: Simple email/password; no social login (post-MVP)

### Single School MVP (not Multi-Tenant)
- **Why**: Multi-tenancy adds 1+ hour; single school in 3-hour window is achievable
- **Future**: Add school_id filtering to enable multi-school

---

## Evaluation Checklist

### ✅ Evaluation Criteria Met
- [x] Clear setup instructions (this README)
- [x] Development documentation (this file + DEVELOPMENT.md)
- [x] Feature documentation (Feature Status below)
- [x] Design philosophy documented
- [x] Database schema with audit trails
- [x] Authentication and RBAC implemented
- [x] Academic, parent, and analytics routes implemented
- [x] Backend Jest test suite implemented and passing
- [x] Regular commits with AI review files (in progress)

### Feature Status

| Feature | Status | Description |
|---------|--------|-------------|
| Authentication | ✅ Complete | JWT login/register/logout |
| RBAC Middleware | ✅ Complete | Teacher, parent, admin, department roles |
| Database Schema | ✅ Complete | All tables, triggers, sample data |
| Mark Upload | ✅ Complete | Phase 2 backend + Phase 6 teacher UI |
| Parent Dashboard | ✅ Complete | Phase 3 backend + Phase 7 parent UI |
| Analytics Dashboard | ✅ Backend Complete | Phase 4 API complete, admin charts pending |
| Real-Time Updates | ✅ Complete (Polling) | Parent polling endpoint + frontend hook |
| Frontend UI | ✅ Core Complete | Phase 5-7 auth, teacher, and parent views |
| Tests | ✅ Backend Unit Tests | Jest tests for middleware and service validations |

---

## Required Documentation Files

- [x] **README.md** (this file): Setup and execution
- [x] **DEVELOPMENT.md**: Implementation approach, technical decisions, AI review process
- [x] **schema.sql**: Database structure with comments
- [x] **middleware/auth.js**: Code comments on JWT/RBAC
- [x] **.reviews/** directory: AI review files for each completed phase commit

---

## Commit Discipline

Every commit should:
1. Be small and focused (one feature or fix)
2. Have a clear message: "Add mark upload endpoint" not "updates"
3. Include corresponding AI review file in `.reviews/` directory

Example AI review file format:
```markdown
# AI Review: Add mark upload endpoint

**Commit**: abc1234 - "Add mark upload endpoint"

## Review
- ✅ Validation: Student-class-subject constraints checked
- ✅ Security: RBAC enforced (teacher-only)
- ✅ Audit: AuditLog created via trigger
- ⚠️ Note: CSV import deferred to Phase 8

## Decisions
- Form input over CSV for MVP speed
- Stored procedure considered, simple SQL used for clarity
```

---

## Next Steps

1. Build Phase 8 admin analytics UI charts against completed analytics APIs
2. Expand test coverage with API integration tests (Supertest + DB fixtures)
3. Add frontend test coverage for auth routing and dashboard behaviors
4. Polish accessibility and error states for production readiness
5. Prepare final demo script mapped to submitted commit ID

---

## Support & Questions

Refer to:
- `DEVELOPMENT.md` for design decisions and architectural trade-offs
- `schema.sql` for database structure
- Commit messages and AI review files for implementation reasoning

---

## Original Requirements

For full requirements and expectations, see the [Objective](#project-overview), [Goals](#project-overview), [Core Features](#core-features-mvp), and other sections above.