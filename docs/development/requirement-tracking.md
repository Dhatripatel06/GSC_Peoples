# GSC Peoples - P0 Requirement Tracking Matrix

Status values: `Complete`, `Partial`, `Missing`, `Blocked`, `Out of scope`.

Last audited: 2026-11-19.

## Executive audit

- Stack verified: Next.js 16 / React 19 / Tailwind 4 / TypeScript 5.9; Express 5 / Prisma 7 / PostgreSQL; Vitest / Supertest / Playwright.
- Existing implementation is not a blank foundation. Employee CRUD, department APIs, tenant scoping, reporting-cycle protection, and employee audit logging already exist.
- Authentication is not production-ready: production SSO is a fail-closed placeholder and no password/session/invitation/reset implementation exists.
- Role keys and employee permissions exist, but most P0 permission registries and API routes are not implemented.
- Company profile fields, onboarding, attendance, leave, documents, notifications, audit viewer, and dashboards are missing or placeholder surfaces.
- No Phase is complete until its acceptance criteria have executable passing tests.

## Module A - Authentication and user management

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| AUTH-001 | Email/password login and logout | Partial | Local credential login/logout routes and HTTP-only cookie UI exist; production SSO remains to be integrated and live acceptance tests remain. |
| AUTH-002 | Forgot/reset password | Partial | Reset-token model, routes, and reset UI exist; live single-use/session-revocation tests remain. |
| AUTH-003 | HTTP-only 8-hour idle sessions | Partial | HTTP-only cookie/session records and 8-hour idle enforcement exist; CSRF and live-session tests remain. |
| AUTH-004 | 7-day single-use invitation | Partial | Seven-day invitation records, acceptance route, and UI exist; live single-use and expiry tests remain. |
| AUTH-005 | Fixed role assignment with last Super Admin protection | Partial | Four role assignment routes and last-Super-Admin checks exist; live role-account tests remain. |
| AUTH-006 | Activate/deactivate accounts | Partial | Account status routes and session revocation exist; live state-transition tests remain. |

## Module B - Company and organization

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| ORG-001 | Company profile, logo, timezone, working days/hours | Partial | Additive company fields, migration constraints, API, and Settings UI exist; live persistence tests remain. |
| ORG-002 | Department CRUD | Partial | Department API and migration constraints exist; verify UI completeness and tests in Phase 1/2. |
| ORG-003 | Designation CRUD | Missing | No designation entity/API/UI. |
| ORG-004 | Reporting hierarchy | Complete | Composite tenant FK and insert/update cycle protection exist. |
| ORG-005 | Holiday calendar CRUD | Missing | No holiday entity/API/UI. |

## Module C - Employee management / People CRM

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| EMP-001 | Employee creation | Complete | Existing Zod contracts, service, repository, API and tests cover creation. |
| EMP-002 | Sequential employee ID | Missing | Employee numbers are accepted, not automatically generated. |
| EMP-003 | Directory, search, filters | Complete | Existing directory API/UI supports pagination and filters. |
| EMP-004 | Employee profile | Partial | Core employment fields exist; required personal/employment fields are incomplete. |
| EMP-005 | Employee editing/change history | Partial | Update and employee audit log exist; expand field model and history UI. |
| EMP-006 | Employment status | Partial | Status API exists; lifecycle/other P0 rules need verification. |
| EMP-007 | Offboarding without hard delete | Missing | No termination workflow or soft-delete/offboarding model. |
| EMP-008 | Activity timeline | Missing | Employee audit log exists, but no complete timeline API/UI. |
| EMP-009 | Employee self-edit permitted fields | Missing | EMPLOYEE permission is read-only. |

## Module D - Employee onboarding

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| ONB-001 | Checklist from company template | Missing | No onboarding entities/API/UI. |
| ONB-002 | Add/edit/remove onboarding tasks | Missing | Placeholder route only. |
| ONB-003 | Complete task with completion info | Missing | No task completion model/API. |
| ONB-004 | Status/progress calculation | Missing | No calculation. |
| ONB-005 | Invitation/status tracking | Missing | Membership INVITED exists; no onboarding invitation workflow. |

## Module E - Attendance

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| ATT-001 | Server-timestamp check-in/out | Missing | Placeholder route only. |
| ATT-002 | Duplicate daily check-in prevention | Missing | No attendance entity/API constraint. |
| ATT-003 | Daily attendance history | Missing | Placeholder route only. |
| ATT-004 | Monthly summary | Missing | No summary implementation. |
| ATT-005 | HR attendance dashboard | Missing | No dashboard implementation. |
| ATT-006 | Correction requests | Missing | No correction entity/API/UI. |
| ATT-007 | Manager/HR approve/reject corrections | Missing | No correction workflow. |
| ATT-008 | HR manual correction | Missing | No manual correction API/audit history. |

## Module F - Leave

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| LEAVE-001 | Leave type management and default types | Missing | No leave entities/API/UI. |
| LEAVE-002 | Balances and HR adjustments | Missing | No balance model. |
| LEAVE-003 | Full/half-day applications | Missing | No leave request model/API. |
| LEAVE-004 | Validation/overlap prevention | Missing | No implementation. |
| LEAVE-005 | Manager/HR approval routing | Missing | No implementation. |
| LEAVE-006 | Approve/reject with comments | Missing | No implementation. |
| LEAVE-007 | Cancel and restore balance | Missing | No implementation. |
| LEAVE-008 | History/pending queue | Missing | No implementation. |
| LEAVE-009 | Monthly leave calendar | Missing | Placeholder route only. |

## Module G - Documents

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| DOC-001 | Employee document upload | Missing | Placeholder route only. |
| DOC-002 | Company document management | Missing | No implementation. |
| DOC-003 | Private storage | Missing | No implementation. |
| DOC-004 | 60-second signed preview/download | Missing | No implementation. |
| DOC-005 | Manager visibility | Missing | No implementation. |
| DOC-006 | Soft delete/30-day retention | Missing | No implementation. |

## Module H - Dashboards

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| DASH-001 | Super Admin/HR dashboard | Missing | Dashboard shell/placeholder only. |
| DASH-002 | Recent joiners/activity | Missing | No database-backed implementation. |
| DASH-003 | Manager dashboard | Missing | No implementation. |
| DASH-004 | Employee dashboard | Missing | No implementation. |

## Module I - Notifications

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| NOTIF-001 | In-app unread notifications | Missing | No entity/API/UI. |
| NOTIF-002 | Leave, correction and onboarding notifications | Missing | No notification engine/deduplication. |

## Module J - Settings and audit logs

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| SET-001 | Company/work calendar/leave settings | Missing | Company fields and leave settings absent. |
| SET-002 | User account management | Missing | No role/account administration API/UI. |
| SET-003 | Fixed four-role permissions | Partial | Fixed role keys and employee permission registry exist; need complete P0 permission registry and enforcement. |
| SET-004 | Super Admin append-only audit viewer | Partial | Append-only employee audit log exists, but no general audit log/entity viewer. |

## Phase 1 scope and acceptance criteria

Phase 1 covers AUTH-001 through AUTH-006 and ORG-001 through the company setup portion of role/user administration.

Acceptance must include:

- Login/logout with secure, HTTP-only, server-side idle sessions and CSRF protection.
- Forgot/reset and seven-day single-use invitations with password setup.
- ACTIVE/DISABLED user enforcement and ACTIVE/SUSPENDED/REVOKED membership enforcement.
- Fixed four-role assignment and last-Super-Admin protection.
- Company profile with logo, timezone, working days and working hours.
- Company/user isolation and no direct-ID cross-company access.
- API and UI tests for all four roles and session/account lifecycle.

## Baseline verification status

- Baseline unit/API test command could not start until dependencies were restored.
- Dependency restoration was in progress during the audit due to a timed-out download/linking step.
- API typecheck passes.
- Web typecheck passes after the Settings page repair.
- Prisma generation passes.
- No full Phase 1 acceptance claim is made: database migration deployment and live route tests remain pending.
- Baseline API: 62 existing tests passed, 3 suites failed before Prisma generation was available.
- Baseline web: 60 existing tests passed, 9 suites failed on existing `lucide-react` package resolution.
