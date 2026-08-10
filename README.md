# UML Tutor Project

A web platform where students practise drawing UML diagrams. They create use
case diagrams, use case descriptions, system sequence diagrams (SSDs), class
diagrams and sequence diagrams. The platform validates each diagram, checks
that the different diagrams agree with each other, and can check a use case
diagram against the plain-text requirement of an assignment.

The project used to consist of a backend API plus a frontend. Only the backend
runs automated checks; the frontend draws the diagrams and shows the reports.

## Repository Layout

```
umltutor/
├── README.md                    # this file
├── umltutor-backend/            # Node.js API (the source of truth for checking)
│   ├── src/                     # routes, controllers, services, rules, nlp, ...
│   ├── docs/                    # FEATURES.md, VALIDATION_FLOW.md
│   └── README.md                # backend setup, folders, API endpoints
└── umltutor-frontend/           # React single-page application (drawing + reports)
    └── README.md                # frontend stack, screens, checking report
```

## The Two Parts

### Backend (`umltutor-backend/`)

Node.js + Express + Prisma API, written in plain JavaScript. It stores users,
classes, assignments, submissions and every diagram artifact, and it runs all
validation.

- **Validation engine** — one `checkModel` call runs ~40 checks across the five
  diagram sections plus cross-diagram consistency, in 6 phases via
  `rulePipeline.checkModelPhased`.
- **Rule registry** — 143 rule definitions (136 active, 7 disabled): structural
  25, consistency 40, naming 16, completeness 21, UML standard 21, NLP 13, best
  practice 7.
- **Dependency-aware pipeline** — enriches issues with root causes and
  suppresses cascading errors.
- **Offline NLP** — string similarity, sentence parsing, and requirement
  analysis. Everything runs deterministically; there are no API calls and no
  hardcoded assignment model.
- **Case-study aware check** — the use case diagram is compared with the
  assignment's own free-text requirement, parsed at runtime. It is confidence
  gated: only high-confidence functional goals are enforced, login is treated
  as a supported precondition, thin text is reported as "insufficient" instead
  of guessed, and the report returns per-actor / per-use-case / system-name
  statuses plus an overall verdict.
- **Submission workflow** — drafts, artifacts, run-check, grading, feedback,
  tutorial-mode requests, exports and analytics.
- **Testing** — 29 Jest suites (304 tests) in `src/tests/`, run on a local
  SQLite database. See the backend README's "Testing Notes".

### Frontend (`umltutor-frontend/`)

React 18 application (JavaScript with Babel, built by Webpack 5, styled with
Tailwind CSS). It has editors for all five diagram types, two app modes
(development and tutorial), Firebase login, a teacher area and a student area.
The checking panel renders the backend's validation report — including the
case-study consistency block with verdict banner, actor/use case/system-name
status lists and suggestions. An in-browser checker exists only as a fallback
when no backend report is available.

## Getting Started

Backend first (it is the part that validates):

```bash
cd umltutor-backend
npm install
npm run prisma:generate
cp .env.example .env   # add DATABASE_URL (SQLite works for tests)
npm run prisma:push
npm run dev            # API on http://localhost:3000
npm test               # run the backend test suite
```

Then the frontend:

```bash
cd umltutor-frontend
npm install
npm run dev            # webpack dev server
```

## Documentation

- Backend: `umltutor-backend/README.md`, `umltutor-backend/docs/FEATURES.md`,
  `umltutor-backend/docs/VALIDATION_FLOW.md`.
- Frontend: `umltutor-frontend/README.md`.

## License

MIT. See `LICENSE` for details.