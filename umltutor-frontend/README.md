# UML Tutor Frontend

The React single-page application students and teachers use to sketch UML
diagrams, check them against the assignment, and submit them for review.

Stack: React 18, JavaScript (Babel), Webpack 5, Tailwind CSS, Redux Toolkit,
React Flow, React Hook Form + Zod, Firebase Authentication, Axios.

> The current front end has **no automated test suite**. `@testing-library/*`,
> `msw` and `cypress` are installed as dev dependencies but unused. The browser
> checks inside the app are the fallback layer — the backend report is
> authoritative.

## Quick Start

```bash
npm install
npm run dev     # webpack dev server
npm run build   # production bundle
npm run lint    # ESLint (requires a flat eslint.config.js — not yet present)
```

Create a `.env` (webpack `DefinePlugin` reads it at build) with
`API_BASE_URL` (e.g. `http://localhost:3000`) and `FIREBASE_API_KEY`.

## How the App Is Wired Together

### Entry and layout

- `src/main.jsx` — mounts the app: Redux `<Provider>` → `AppProvider` →
  `ThemeProvider` → `ToastProvider` → `<App />` (StrictMode only in dev).
- `src/App.jsx` — `ErrorBoundary` → `BrowserRouter` → `AuthProvider` →
  `GlobalEventHandler` + `AppContent`. It implements a **custom router**: a
  hardcoded route table is matched against `window.location.pathname` (React
  Router is used only for `BrowserRouter`, `matchPath`, `Link` and
  `useNavigate`). Pages parse their own slugs from the URL.
- `src/app/store.js` — Redux Toolkit store combining 9 slices; a
  `auth/logout` action resets the entire state.

### Identity and API

- Firebase is the identity provider; the backend is the source of truth for
  roles, profiles and submissions.
- `src/services/apiClient.js` — one Axios instance. The request interceptor
  attaches the Firebase ID token; the response interceptor unwraps the
  backend's `{ success, data }` envelope and centralizes 401/403/5xx handling.
- `src/contexts/AuthContext.jsx` — listens to Firebase auth state and syncs the
  backend profile.
- Service modules: `authService`, `assignmentService`, `classService`,
  `submissionService`, `notificationAPI`.

### State slices (Redux Toolkit)

| Slice | Holds |
| --- | --- |
| `auth` | user, token, isAuthenticated, isGuest |
| `mode` | current mode (development / tutorial), checking toggle, tutorial step + progress, used-in-description registry, locked system name |
| `checking` | running flag, validation results, summary |
| `uml` | `tutorialModel` and `developmentModel` (unified UML model objects), active use case |
| `description` | descriptions list, current description, dirty flag |
| `assignments` | assignments + detail, list staleness guard |
| `classroom` | classes, students, analytics, announcements, resources |
| `submission` | submissions, current submission, tutorial requests |
| `notifications` | notifications list, unread count |

Server-backed slices avoid duplicate GETs with a 30-second staleness guard
(`utils/fetchStaleGuard.js`) and in-flight request dedup
(`utils/inflightRequest.js`).

## Feature Modules (`src/features/`)

- **checking** — the validation UI. `CheckingModePanel.jsx` renders the report;
  `performDynamicValidation` is the in-browser fallback checker;
  `ConsistencyChecker.js` is a lightweight offline checker. `grammarRules.js`
  re-exports NLP helpers. See "Checking report" below.
- **diagram** — the use case diagram editor (React Flow) plus the `umlSlice`
  model state. Nodes: actor, use case, system boundary.
- **description** — the use case description editor with a `react-hook-form` +
  `zod` form and a validator.
- **ssd** — system sequence diagram editor (lifelines + messages).
- **class-diagram** — class/interfaces nodes, relationships, toolbars.
- **sequence-diagram** — detailed sequence editor with activation bars,
  combined fragments, and autosave `useSequenceAutosave`.
- **modes** — app mode (development / tutorial) and tutorial progress.
- **auth** — auth slice plus login/register pages.
- **assignments** — assignment definitions and student assignment views.
- **classroom** — classes, enrollment, announcements, resources.
- **submissions** — submission lifecycle + report/detail UI.
- **notifications** — notification list + unread count.
- **teacher** — teacher-only UI: create assignment, enrollment, file browser,
  announcement board, tutorial requests panel, settings.
- **tutorial** — tutorial workflow metadata: the five modeling steps, unlock
  rules and `localStorage` persistence.

## The Five UML Editors

The workspace loads the backend model, splits it into
`tutorialModel` / `developmentModel`, and renders one editor per artifact:

1. **Use case diagram** (`use-case`)
2. **Use case description** (`description`)
3. **System sequence diagram** (`ssd`)
4. **Class diagram** (`class-diagram`)
5. **Sequence diagram** (`sequence-diagram`)

`src/hooks/useUMLModel.js` loads and normalizes the JSON (unwrapping
stringified artifacts), handles 404/403/401/5xx fallbacks and exposes
refresh. `src/components/shared/ModeAwareEditor.jsx` wraps the editors with
mode switching, tutorial progression, autosave, export, panel wiring and
submission. Autosave uses `useManualSave` +
`src/features/sequence-diagram/useSequenceAutosave.js`.

## Checking Report

The checking panel (`src/features/checking/CheckingModePanel.jsx`) shows:

- a header with a **RUN CHECKER** button (teacher view only) and live error /
  warning badges;
- a **section summary** for the active artifact (system boundary / system name /
  use cases / actors for the use case diagram; title / actor / preconditions /
  postconditions / main flow for descriptions; message flow + consistency for
  SSDs);
- a deduplicated **suggestions** list (from `issue.context.suggestion`);
- the **CASE-STUDY CONSISTENCY** block when the backend supplies a
  `caseStudyReport`:
  — an **overall verdict banner** (`consistent` / `warnings` / `errors` /
    `insufficient`);
  — the **system boundary status** with a suggested name when missing;
  — a **per-actor status row** (`found` / `typo` / `missing` with match %);
  — a **per-use-case status row** (`found` / `missing` / `lowConfidence` /
    `invalid` / `optional` with confidence %);
  — expected actors / use cases / system-name chips;
  — findings grouped by severity;
  — for thin assignment text, a validation-only view explaining which NLP
    signals were missing.

Data source priority: submission full report (if provided) → local report from
`run-check` → global `state.checking.results`. The front-end fallback checker
runs only when no backend report is available.

## Practice Mode

`src/components/practice/PracticeWorkbench.jsx` is a self-contained sandbox for
all five editors. It persists to `localStorage` and offers JSON/PNG/SVG export
via `practiceExportUtils.js`.

## Export

`src/utils/exportUtils.js` exports diagrams and reports as PNG / JPG / SVG /
PDF / JSON / TXT. It uses a fast React Flow→canvas path (`html-to-image`) with
a `jsPDF` combined multi-section report fallback. `html2canvas` is declared but
not used.

## Routing Quick Reference

- `/` landing, `/login`, `/register`
- `/teacher/*` — dashboard, classes, assignments, submissions, review,
  tutorial requests
- `/student/*` — dashboard, classes, assignments (upcoming / pending /
  submitted / reviewed), practice, settings
- `/student/assignments/:titleSlug/work` — the assignment workspace
- `/student/submissions/:submissionId/report` — submission report page

## Notes for Maintainers

- The route matching is custom (see `App.jsx`); before adding routes, understand
  the `pushState` / `popstate` interception and the slug-parsing pattern.
- `src/nlp/*` mirrors the backend's `nlp` helpers for the in-browser fallback —
  keep the two copies in sync.
- `src/features/shared/` is currently empty. `html2canvas` and some legacy
  student submission functions are dead code.