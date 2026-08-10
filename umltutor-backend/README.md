# UML Tutor Backend

Backend API for the UML Tutor learning platform. It validates UML diagrams,
keeps several diagram types consistent with each other, and can check a use case
diagram against the free-text case-study requirement of an assignment.

This is a Node.js / Express / Prisma API. All code is plain JavaScript
(CommonJS), and the checks are deterministic and offline — there is **no
hardcoded case-study model**. Anything an assignment says is parsed from its own
text at runtime.

## Quick Start

### Install

```bash
npm install
npm run prisma:generate
cp .env.example .env   # create one if missing (keys: DATABASE_URL, JWT_SECRET, ...)
npm run prisma:push    # sync the Prisma schema to the database
npm run dev            # nodemon -> src/server.js (default port 3000)
```

The app also needs these optional integrations:

- **Firebase** for authentication (`FIREBASE_SERVICE_ACCOUNT_PATH` or
  `FIREBASE_SERVICE_ACCOUNT_JSON`, plus a `firebase-service-account.json`).
- **Redis** for the two-level cache (`REDIS_URL`). It falls back to an
  in-memory cache alone when Redis is unavailable.
- **Cloudinary** for file CDN (`CLOUDINARY_*` env keys). Without it, files are
  kept on disk under `uploads/`.

### Run Tests

The test suites are pure unit tests (no database connection needed) and are
configured entirely by the npm scripts — no separate Jest config file is
required.

```bash
npx jest            # run all Jest suites in src/tests/
npm run test:watch  # watch mode
npm run test:coverage
```

Note: the `npm test` script additionally runs `prisma db push`, which needs the
`DATABASE_URL` in the environment to match the schema provider. If you only want
to run the suites, use `npx jest` as above.

There are **29 test suites** (304 tests) in `src/tests/`.

### Deployment

- `Dockerfile` — two-stage Node 18 build; runs `prisma generate`, starts on port 5000.
- `vercel.json` + `api/index.js` — serverless entry that exports the Express app.
- `k8s/deployment.yaml` — Kubernetes manifest.
- `.github/workflows/deploy.yml` — builds a GHCR image on push to `main`.

## What Every Folder Does

```
src/
├── app.js                # Express app: middleware, route mounts, /api-docs, /health
├── server.js             # Entry point: HTTP + Socket.IO, init, listen
├── config/               # Prisma client, Firebase admin, paths, Swagger
├── controllers/          # Thin HTTP handlers -> forward to services
├── routes/               # Express routers (auth, classes, assignments, submissions, ...)
├── services/             # Business logic (the actual work happens here)
├── repositories/         # Thin Prisma data-access layer
├── rules/                # Rule registry + dependency-aware pipeline + runtime config
├── nlp/                  # Offline NLP: similarity, sentence utils, requirement parsing
├── middleware/           # Auth, rate limiting, Zod validation, error handling
├── utils/                # Cache, uploads, errors, JWT, logger, misc helpers
├── fixtures/             # Shape/templates used by tests (not served to production)
└── tests/                # Jest test suites
```

### services/ — the core

- `checkingEngine.js` — the **validation engine**. One `checkModel` call runs
  ~40 `validate*` steps across the five model sections: use case diagram,
  use case description, system sequence diagrams (SSDs), class diagram and
  sequence diagrams, plus cross-diagram consistency. It also holds the
  dynamic case-study → use case diagram check and builds the case-study report.
- `rulePipeline.js` is in `rules/`, but it drives the engine: it runs `checkModelPhased`
  (6 phases) and `checkModelWithPipeline` (enriches issues and suppresses
  cascading errors where one root cause explains several symptoms).
- `submissionService.js` — the student/teacher submission workflow: drafts,
  artifacts, completion, run-check, grading, feedback, tutorial-mode requests,
  exports and analytics.
- `requirementService.js` — resolves an assignment's requirement text and
  parses it into a structured requirement model on demand (never stored).
- `suggestionEngine.js` — turns validation findings into repair/renaming
  suggestions.
- Plus per-domain services: `authService`, `classService`, `assignmentService`,
  `announcementService`, `notificationService`, `resourceService`,
  `studentService`, `ssdValidationService`.

### nlp/ — offline natural-language support

- `similarity.js` — string similarity, fuzzy match, lemma mapping, synonyms,
  function/use-case classification used by most validators.
- `sentenceUtils.js` — sentence and method/attribute parsing helpers.
- `semanticService.js` — shared semantic representation + SSD/operation
  comparison used across the sequence/class/SSD phases.
- `promptRequirementParser.js` — parses free-text requirement prose into a
  structured model (actors, use cases, requirements buckets, coverage).
- `requirementClassifier.js` — classifies each requirement sentence into a type
  (functional, actor, context, domain entity, business rule, constraint, ...).
- `suggestionGenerator.js` — assignment-aware suggestions and
  system-name candidates derived from the requirement text.
- `constants.js` — shared word dictionaries and thresholds.

### rules/

- `ruleRegistry.js` — the full catalogue of **143 rule definitions** (136
  active, 7 disabled). Categories: structural 25, consistency 40, naming 16,
  completeness 21, UML standard 21, NLP 13, best practice 7. Rules span the use
  case diagram, descriptions, SSDs, class diagram, sequence diagram and
  cross-diagram checks. Helpers: `getRuleByCode`, `getRulesByDiagramType`, ...
- `rulePipeline.js` — `checkModelPhased` (6 phases: diagram, description, ssd,
  class-diagram, sequence-diagram, consistency) and `checkModelWithPipeline`
  (issue enrichment + cascade suppression).
- `ruleConfig.js` — runtime enable/disable and threshold overrides.

### middleware/ and utils/

- `routeMiddleware.js` — Firebase token auth + role authorization.
- `validationMiddleware.js` — Zod schema validation for body/query/params.
- `errorHandler.js` — `AppError` hierarchy, async wrapper, 404 handler.
- `rateLimiter.js` — global and per-route rate limits.
- `utils/redis.js` + `serviceCache.js` — two-level cache (memory + Redis).
- `utils/fileUpload.js` + `cloudinary.js` — multer uploads + optional CDN.
- `utils/errors.js`, `logger.js`, `jwt.js`, `password.js`, `startup.js`,
  `tokenCache.js`, `userCache.js`, `tutorialRequestUtils.js`,
  `submissionQueryUtils.js`.

## Domain Model (Prisma)

15 models: `User`, `Class`, `ClassStudent`, `Assignment`, `Submission`,
`SubmissionExport`, `UseCaseDiagram`, `UseCaseDescription`, `SSDDiagram`,
`ClassDiagram`, `SequenceDiagram`, `Evaluation`, `Notification`,
`Announcement`, `Resource`.

Each submission stores up to one use case diagram, one class diagram, and
per-use-case descriptions, SSDs and sequence diagrams. `Assignment` carries the
free-text `requirementText` used by the case-study check.

## API Endpoints

- `POST /api/checking/check` — validate a UML model (optionally with a
  `requirementText` the case-study check uses).
- `POST /api/submissions/:id/run-check` — authoritative run: resolves the
  assignment's requirement text, runs the full engine, returns the report.
- Auth: `/api/auth/*` — register, logout, profile, change password, account.
- Classes: `/api/classes/*` and `/api/student/classes/*` — CRUD, join, students,
  analytics, announcements, resources.
- Assignments: `/api/assignments/*`, `/api/student/assignments/*`.
- Submissions: `/api/submissions/*` — draft/save, status, detail, grade,
  feedback, tutorial-mode requests, exports, analytics.
- Notifications: `/api/notifications/*`.
- Docs: Swagger UI at `/api-docs`.

## The Case-Study Drive (no hardcoding)

The use case diagram check never uses a fixed assignment model. On every
`run-check`:

1. The assignment's free text is parsed into a structured requirement model
   (actors, use cases, requirement-type buckets).
2. Only **functional** sentences describing a role performing an action become
   expected use cases. Descriptive/context/domain/business-rule prose is kept
   aside and never turned into fake use cases.
3. A **reliability gate** decides whether the text is substantial enough to
   check at all. Thin fragments produce a single "insufficient context" warning
   and the report switches to a validation-only view — nothing is guessed.
4. A **confidence score (0..1)** is attached to every derived use case. Only
   high-confidence goals (`≥ 0.75`) are enforced as missing; low-confidence
   hints and plain-noun names are reported as informational notes.
5. **Login is treated as a supported precondition.** When the assignment
   mentions authentication, auth use cases are neither required nor flagged as
   unsupported.
6. Actors are matched with alias + fuzzy similarity, so misspellings do not
   produce false "missing actor" errors.
7. `buildCaseStudyReport` returns per-actor, per-use-case and system-boundary
   statuses plus an overall verdict (`consistent | warnings | errors |
   insufficient`) that drives the front-end report.

## Testing Notes

- Run with `npx jest` (the `npm test` script first tries a `prisma db push`,
  which only works when `DATABASE_URL` matches the schema provider — the suites
  themselves do not need a database).
- Suites cover every validation phase (UCD, description, SSD, class, sequence,
  cross-diagram), the rule registry reconciliation, NLP parsing/classification,
  suggestion engine/generator, performance, and several regression bugs
  (autosave, submission query flat-selector, score coercion of letter grades).

## License

MIT. See `LICENSE` for details.