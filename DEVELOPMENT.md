# Development Documentation

## Implementation Approach

This document records the technical decisions, architectural choices, and development methodology for the Education Analytics Platform.

### Design Philosophy

**"Simplicity and rapid delivery over perfect scalability"**

For a 3-hour MVP window, we prioritize:
1. **Getting features working end-to-end** rather than perfect design
2. **Incremental commits** with clear intent
3. **Pragmatic trade-offs**: Monolithic > Microservices, Polling > WebSocket, Threshold-based > ML
4. **Documentation as we go**: Each commit has an AI review explaining decisions

### Architecture Decision: Monolithic with Logical Separation

**Decision**: Build as single Node.js/Express backend with logical service separation.

**Rationale**:
- ✅ Can deploy and test as single entity in 3 hours
- ✅ Services (academics, parents, analytics, auth) are distinct folders → easy to extract later
- ✅ Single database connection pool → simpler debugging, better for MVP
- ✅ No inter-service communication overhead

**If we had more time**:
- Extract each service to separate Node process
- Add API gateway for routing
- Deploy with Docker Compose or Kubernetes

**Limitations**: 
- Single point of failure (no service isolation)
- Resource limits not independent per service
- Horizontal scaling requires duplicating entire app

**Mitigation**: Post-MVP, extract services using same API contracts.

---

## Technical Stack Decisions

### Backend Framework: Express.js (not Fastify, Hapi, etc.)

**Decision**: Use Express.js + Node.js

**Rationale**:
- ✅ Fastest to prototype (minimal boilerplate)
- ✅ Rich middleware ecosystem (cors, jwt, auth)
- ✅ pg driver is mature and simple
- ✅ Everyone knows Express

**Why not**:
- ❌ Fastify: too "optimized" for a 3-hour window; same outcome
- ❌ Django/FastAPI: adds language context switch; Node.js already chosen

---

### Database: PostgreSQL with Row-Level Security

**Decision**: PostgreSQL with RLS policies, not separate app-level filtering.

**Rationale**:
- ✅ RLS enforces data isolation at database level (can't accidentally leak data)
- ✅ Audit triggers run automatically for compliance
- ✅ JSONB columns for flexible metadata
- ✅ Rich query operators (for analytics)

**Implementation**:
```sql
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY marks_parent_select ON marks FOR SELECT
    USING (
        student_id IN (
            SELECT s.id FROM students s
            WHERE s.user_id = CURRENT_USER_ID()
        )
    );
```

**Why immutable marks?**
- ✅ Prevents accidental overwrites (teacher can't delete mark by mistake)
- ✅ Full audit trail: can see every change and who made it
- ✅ Data integrity: truth of past state never changes
- ❌ Cost: Corrections need new row + audit note (not UpdateMarkView + edit)

---

### Authentication: JWT + RBAC

**Decision**: JWT tokens with RBAC middleware (not OAuth, not sessions).

**Rationale**:
- ✅ JWT setup: 20 mins (bcryptjs + jsonwebtoken packages)
- ✅ RBAC: 30 mins (middleware guards by role)
- ✅ Stateless: no session storage needed (scales horizontally)

**Why not OAuth?**
- ❌ Google/GitHub login adds 45 mins for no UX benefit in 3-hour window
- ❌ Students don't have @school.com emails necessarily
- ❌ Post-MVP: can add OAuth as second factor

**Why not Sessions + Cookies?**
- ❌ Need separate session store (Redis/Memcached)
- ❌ CORS complications with cross-origin requests
- ❌ Harder to test (state management)

**JWT Flow**:
```
Login (email + password)
  → Bcrypt compare password_hash
  → If valid: sign JWT {userId, role, expiresIn: 7d}
  → Client stores in localStorage
  → All requests: Header Authorization: Bearer <token>
  → Server verifies signature + expiry
```

---

### Real-Time Updates: Polling (MVP), WebSocket (Future)

**Decision**: Polling endpoint `GET /api/updates/:studentId?since=timestamp` (10-30s intervals).

**Rationale**:
- ✅ Parent polls endpoint every 30 secs for new marks
- ✅ Simple: 40-line endpoint + polling hook
- ✅ Works with existing JWT auth (no WebSocket upgrade needed)
- ✅ No server state (stateless polling = horizontal scaling)

**Why not WebSocket?**
- ❌ WebSocket setup: 1.5 hours (socket.io + connection management + rooms)
- ❌ Adds server state (who's connected, when to broadcast?)
- ❌ For parents using app 2-3 times weekly, polling is fine
- ✅ Future: Add WebSocket for real-time alerts when needed

**Polling vs WebSocket Comparison**:

| Metric | Polling | WebSocket |
|--------|---------|-----------|
| Dev time | 30 mins | 1.5 hours |
| User experience | "Update in ~30s" | "Instant (1-2s)" |
| Server load | Higher (per request) | Lower (persistent channel) |
| Scaling | Easier (stateless) | Harder (session affinity) |
| MVP suitability | ✅ Great | ❌ Overkill |

**Post-MVP upgrade path**:
```javascript
// Current: Polling
const updates = fetch(`/api/updates/${studentId}?since=${lastFetch}`);

// Future: WebSocket
socket.on('student:marks-published', (data) => {
  setUpdates(prev => [data, ...prev]);
});
```

---

### Single School MVP (not Multi-Tenant)

**Decision**: Design for single school; multi-school post-MVP.

**Rationale**:
- ✅ Simplifies schema: no need for school_id filtering everywhere initially
- ✅ Sample data: one school seeded in schema.sql
- ✅ User registration: can auto-assign school_id = 1

**Why not multi-tenant from start?**
- ❌ Every query needs `WHERE school_id = ?` (complexity)
- ❌ Seeding test data for multiple schools (overhead)
- ❌ RLS policies become more complex
- ✅ Post-MVP: Add school selection to login; adjust queries

**Migration path**:
```diff
  // Current (single school)
- SELECT marks FROM marks WHERE student_id = ?;
  
  // Future (multi-tenant)
+ SELECT marks FROM marks WHERE student_id = ? AND school_id = ?;
```

---

## Key Implementation Details

### Mark Storage: Immutable Records

**Pattern**: 
- Insert new mark record (never UPDATE)
- Store previous values in JSONB column
- Audit trigger captures all changes

**Example**:
```sql
INSERT INTO marks (student_id, subject_id, marks_obtained, published_at, teacher_id)
VALUES (1, 5, 85, NOW(), 2);

-- Audit log automatically created:
INSERT INTO audit_logs (action, entity, entity_id, changes)
VALUES ('INSERT', 'marks', <new_id>, 
  JSON { 'student_id': 1, 'marks_obtained': 85 });
```

**Why?**
- ✅ Compliance: Every change logged (auditors happy)
- ✅ Time travel: Can query marks as of any timestamp
- ✅ Prevents data loss: No accidental overwrites
- ❌ Cost: Corrections require new entry (vs. UPDATE)

**Correction workflow**:
```
Teacher realizes: "I entered 85, should be 95"
  → Add comment to audit_log: "Correction: was 85"
  → INSERT new mark record with 95
  → Both records visible in history
```

---

### Role-Based Access Control

**Roles**:
- `teacher`: Can upload marks for own class, see assignments
- `parent`: Can see own child's marks, report card, progress
- `admin`: Can see any student's data, class analytics
- `department`: Can see analytics across multiple classes

**Implementation**:
```javascript
// Middleware
const rbac = (allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// Usage
router.post('/marks', authMiddleware, rbac('teacher'), async (req, res) => {
  // Only teachers can upload marks
});

router.get('/analytics', authMiddleware, rbac(['admin', 'department']), async (req, res) => {
  // Only admin and department users can view analytics
});
```

**Database enforcement (RLS)**:
```sql
-- Parents can only see their child's marks
CREATE POLICY marks_parent_select ON marks FOR SELECT
    USING (
        student_id IN (
            SELECT s.id FROM students s
            WHERE s.user_id = CURRENT_USER_ID()
        )
    );
```

---

## Testing Strategy

### Unit Tests (Pending Phase 10)
- Mark validation logic (invalid marks, missing student, etc.)
- Birthday to age calculation for reports
- Learning gap detection (score < 40)

### Integration Tests (Pending Phase 10)
- Teacher upload mark → triggers audit log
- Parent login → sees child's latest marks
- Admin login → sees class performance trends

### Manual Verification
- Health check: `curl http://localhost:5000/health`
- Login: `curl POST /api/auth/login` returns token
- RBAC: Try parent endpoint without teacher role → 403 Forbidden

---

## Development Phases

### Phase 1: Backend Setup & Auth ✅ (60 mins)
- [x] Express server with CORS
- [x] PostgreSQL schema with audit triggers
- [x] JWT login/register endpoints
- [x] RBAC middleware
- [x] Base route stubs
- **Verification**: Login works; JWT tokens decode; RBAC blocks unauthorized

### Phase 2: Academic Records Service (45 mins)
**Goal**: Teachers can upload and publish marks.

Tasks:
- [ ] `POST /api/academics/marks` endpoint with validation
- [ ] Validate: student exists in class, subject assigned to class, teacher owns class
- [ ] Trigger audit_log on insert
- [ ] `GET /api/academics/classes/:id/marks` (with RLS privacy)

### Phase 3: Parent App Service (30 mins)
**Goal**: Parents see dashboard with child's marks.

Tasks:
- [ ] `GET /api/parents/dashboard` aggregates latest marks + report card
- [ ] `GET /api/parents/students/:id/progress` returns marks history for charts
- [ ] Polling endpoint `GET /api/updates/:studentId?since=timestamp`

### Phase 4: Analytics Service (30 mins)
**Goal**: Admins see class trends and learning gaps.

Tasks:
- [ ] `GET /api/analytics/class/:id/performance` (avg, pass %, distribution)
- [ ] `GET /api/analytics/subject/:id/gaps` (identify low scorers)
- [ ] Cache refresh on mark publish

### Phase 5: Frontend Setup (30 mins)
**Goal**: React UI with login, role-gated views, Tailwind styling.

Tasks:
- [ ] React + Vite + Tailwind init
- [ ] Auth context, useAuth hook, useApi hook
- [ ] LoginPage, RoleGate component
- [ ] Navbar with logout + role display

### Phase 6: Teacher Dashboard (45 mins)
**Goal**: Teachers upload marks form.

Tasks:
- [ ] TeacherDashboard page (mark upload form)
- [ ] MarkUploadForm component (validation + submit)
- [ ] Show recent publishes + class list

### Phase 7: Parent Dashboard & Chart (45 mins)
**Goal**: Parents view progress chart and report card.

Tasks:
- [ ] ParentDashboard page
- [ ] ProgressChart component (recharts line chart)
- [ ] useStudentUpdates polling hook
- [ ] Optional: PDF export

### Phase 8: Admin Analytics (30 mins)
**Goal**: Admin views trends and learning gaps.

Tasks:
- [ ] AdminAnalytics page
- [ ] ClassPerformanceTrend component (bar chart)
- [ ] LearningGaps table component
- [ ] Filters: class, subject, date range

### Phase 9: Mobile Responsiveness (15 mins)
**Goal**: Mobile-friendly UI (375px viewport).

Tasks:
- [ ] Test on DevTools mobile view
- [ ] Adjust Tailwind breakpoints (md:, lg:)
- [ ] Mobile-friendly modals/popovers

### Phase 10: Testing & Documentation (30 mins)
**Goal**: Tests pass; README spins up from scratch.

Tasks:
- [ ] Jest unit tests (validation, gap detection)
- [ ] Supertest integration tests (endpoints, RLS)
- [ ] Update README with final status
- [ ] Create DEVELOPMENT.md examples

---

## Known Limitations & Trade-Offs

| Limitation | Impact | Solution |
|-----------|--------|----------|
| Single school | Can't compare across schools | Post-MVP: Add school selector |
| Polling (30s lag) | Parents see delayed updates | Post-MVP: Upgrade to WebSocket |
| No CSV import | Manual form upload | Phase 8: Add CSV parser |
| Threshold-based gaps | "Gap" = score < 40 | Post-MVP: Add ML prediction |
| Monolithic backend | No service isolation | Post-MVP: Extract to microservices |
| No offline sync | Must have internet | Post-MVP: Add PWA + sync |

---

## AI Review Process

Every commit includes corresponding AI review file:

**File naming**: `.reviews/<commit_hash>_<short_message>.md`

**Template**:
```markdown
# AI Review: <Commit Message>

**Commit Hash**: abc1234  
**Timestamp**: 2026-03-31 14:30  
**Lines Changed**: +45, -12

## What Changed
- Implemented POST /api/academics/marks endpoint
- Added validation for student-class-subject relationships
- Triggered audit_log on mark creation

## AI Assessment
✅ **Security**: RBAC enforced (teacher-only)
✅ **Correctness**: Validation covers edge cases
✅ **Performance**: Index on student_id + class_id added
⚠️ **Future**: CSV import deferred (Phase 8)

## Decisions Made
- Form input over CSV for speed
- Immutable marks table (no UPDATE) for audit compliance
- Stored procedure considered, using simple SQL for clarity

## Alternative Approaches Considered
1. CSV import in MVP: ❌ Too slow (1 hour extra)
2. Mutable marks + soft delete: ❌ Audit trail incomplete
3. Async mark processing with queue: ❌ Overengineered for MVP

## Notes for Reviewers
This commit is "AI-assisted": Used copilot for:
- SQL schema design (approved)
- Middleware boilerplate (approved)
- Test template (modified for project)

Fully human-written: Validation logic, business rules
```

---

## Lessons & Observations

(Updated as we progress)

1. **Immutable marks** simplifies auditing but needs clear communication to teachers about corrections
2. **Polling vs WebSocket** trade-off: For MVP, polling is 100% the right call (30 mins vs 1.5 hours)
3. **RLS policies** are powerful but require careful testing (can accidentally hide data)
4. **Single school** MVP allows much simpler schemas/queries; multi-tenancy later is straightforward

---

## Future Enhancements (Post-MVP)

- [ ] WebSocket real-time push notifications (vs polling)
- [ ] Multi-school district rollups and benchmarking
- [ ] Automated alerts (email/SMS on low scores)
- [ ] ML-based learning gap prediction
- [ ] CSV import for bulk mark uploads
- [ ] PDF generation for report cards
- [ ] Native mobile apps (React Native or Flutter)
- [ ] Offline sync for parent app
- [ ] Third-party integrations (Google Classroom, Salesforce)

---

**Last Updated**: 2026-03-31 (Phase 1 complete)
