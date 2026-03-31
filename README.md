## Objective
Develop a platform where teachers upload marks, assignments, and continuous assessments in real time. Parents receive digital report cards with progress graphs via a mobile app. Schools and education departments get analytics on class-wise and subject-wise performance, learning gaps, and remedial recommendations.

## Timeline
3 hours (subject to adjustment at the company's discretion).

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

## Mandatory Repository Structure and Documentation
Every repository must include complete and readable documentation within the repository itself. At a minimum, the following items are mandatory:

### Required Items and Expectations
- `README.md`: clear setup and execution instructions so that a reviewer can spin up the project locally, install dependencies, configure required steps, and run the application without guesswork.
- Development documentation: describe implementation approach, technical decisions, milestones, challenges, trade-offs, and evolution of the solution.
- Feature documentation: describe what has been implemented, which features are complete, which are partial, and how implemented capabilities address the problem statement.
- Design philosophy: explain the design philosophy or engineering approach used (e.g., simplicity-first, modularity, rapid validation, automation-first, robustness, user-centered flow).
- Business or domain understanding notes: document business context, user assumptions, business rules, domain constraints, and decision logic inferred or applied.
- AI review files for commits: for each commit made by the student, there must be a corresponding AI review file that records AI-assisted review, reflection, or assessment for that commit.

## Commit Discipline and Change Traceability
Commit quality is an explicit evaluation parameter. Students are expected to work in disciplined, incremental steps rather than with bulk, last-minute changes.

- Commits must be meaningful, incremental, and properly described.
- Commit messages should clearly indicate what changed and why.
- Large, vague, or last-minute bulk commits may attract negative evaluation.
- Students must maintain a clear mapping between work done and repository history.
- For every commit, the student must prepare or maintain a corresponding AI review file that captures review notes, AI-assisted critique, or reflective analysis for that commit.
- The AI review record should help reviewers understand how AI was used responsibly, what was accepted or rejected, and how decisions were refined.

### Suggested Commit Practice
- Make commits at logical checkpoints rather than only at the end.
- Keep messages specific, for example: "Add authentication flow and session middleware" rather than "updates".
- Use documentation commits whenever major design, feature, or domain decisions change.

## Evaluation Notes
Students will be judged on both the final implementation and the development process. Adhering to the expectations in this document is required and directly impacts evaluation.