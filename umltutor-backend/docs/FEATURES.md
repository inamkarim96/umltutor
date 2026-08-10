# Backend Features

This document explains the features and inner workings of the UML Tutor
backend. It is written in plain English and describes exactly what the code
does today. If something is not here, it does not run.

## 1. Validation System

### 1.1 Rule catalogue (`rules/ruleRegistry.js`)

The backend ships **143 rule definitions**, of which **136 are active** and 7
are disabled. Each entry has: an id and code, a name, the diagram type it
applies to, a severity (`error` / `warning` / `info`), a category, a
description and a human-friendly message template. Some rules carry
`dependencies` — see 1.3.

The rules cover all five modeling artifacts a student produces:

- **Use case diagram** — boundary and system name, actor and use case naming,
  connectivity, duplicates, include/extend/generalize relationships,
  multi-boundary, and the dynamic case-study consistency group.
- **Use case description** — title, primary actor, preconditions,
  postconditions, main flow, alternative flows.
- **System sequence diagram (SSD)** — lifelines, messages, return messages,
  semantic alignment with the description.
- **Class diagram** — class naming, attributes, methods, relationships,
  multiplicity, structural rules.
- **Sequence diagram** — lifelines, operations existence, activation bars,
  combined fragments (`alt`/`loop`/`opt`/`par`), message ordering.
- **Cross-diagram consistency** — description ↔ SSD ↔ class operations ↔
  sequence, actor-name consistency, SSD ↔ class operation + responsibility
  placement.

Categories (as counted from the registry): structural 25, consistency 40,
naming 16, completeness 21, UML standard 21, NLP 13, best practice 7.

Helpers exposed by the registry: `getRuleByCode`, `getRulesByDiagramType`,
`getRulesByCategory`, `getEnabledRules`, `getDependencyChain`,
`getAffectedByDependency`.

### 1.2 Runtime configuration (`rules/ruleConfig.js`)

A small runtime config lets operators enable/disable rules and override
severities or thresholds at run time: `loadConfig`, `isRuleEnabled`,
`getSeverity`, `getThreshold` (default 0.5), `getConfig`, `resetConfig`.

### 1.3 Pipeline (`rules/rulePipeline.js`)

The pipeline is dependency-aware and runs the engine in phases:

- `checkModelPhased(model)` — runs 6 phases in order: **diagram, description,
  ssd, class-diagram, sequence-diagram, consistency**. A critical error early in
  a phase prevents wasted downstream validation.
- `checkModelWithPipeline(model, requirementModel?)` — after the engine runs,
  it enriches issues and applies **cascade suppression**: when one root cause
  explains many symptoms (for example every use case is flagged because the
  boundary was never created), the downstream findings are collapsed so the
  student sees the real problem instead of a wall of errors.

This keeps reports focused: root causes first, noise removed.

## 2. Validation Engine (`services/checkingEngine.js`)

The heart of the system is a **static `checkModel(...)`** that delegates to
about 40 `validate*` methods. It accepts the full UML model and, optionally, a
parsed requirement model. It evaluates:

- use case diagram structure and relationships;
- use case descriptions and their flows;
- SSD structure and description↔SSD semantics;
- class diagram structure and SSD↔class operation mapping;
- sequence structure, activations and combined fragments;
- cross-diagram global consistency (mapping every use case's actors, methods,
  lifelines and messages across the five artifacts);
- the **dynamic case-study → use case diagram** consistency group (see §4).

It also exposes `analyzeDiagram` (used by the pipelines) and
`buildCaseStudyReport` (the front-end report builder).

## 3. Offline NLP Support (`nlp/`)

All text analysis is deterministic and offline — no external AI calls.

- **`similarity.js`** — Levenshtein distance, `similarity`/`fuzzyMatch`,
  best-match search, keyword extraction, token normalization, lemmatization,
  synonym groups, phrasal-verb matching, and two higher-level matchers used
  everywhere: `actorRoleSimilarity` and `classifyUseCaseMatch`.
- **`sentenceUtils.js`** — helpers to validate sentences and naming, classify
  system steps, parse scenario steps, and parse method signatures / class
  attributes.
- **`semanticService.js`** — a shared `SemanticRepresentation` + processor so
  SSD messages, sequence operations and class methods are compared by the same
  rules across validation phases.
- **`constants.js`** — shared dictionaries (verbs, internal vs external verbs,
  stop words, placeholder names, system-invalid names, synonym groups,
  lemmatization map) and thresholds (`MATCH_THRESHOLD` 0.5,
  `PARTIAL_THRESHOLD` 0.25).

### 3.1 Requirement parser (`nlp/promptRequirementParser.js`)

`parseRequirementText(text)` turns free-text requirement prose into a
structured model:

```js
{
  actors: [],                 // role nouns mentioned (normalized, singular)
  useCases: [],               // derived capabilities with name + primaryActor
  responsibilities: [],       // actor → capability pairs
  requirements: { TYPE: [sentences] },  // non-functional prose, bucketed
  coverage: 0..1,             // how completely the prose was understood
  sources: [],                // raw sentences
  reliable: true|false,       // is there enough text to check at all?
  loginSupported: true|false, // does the text mention authentication?
  context: { reasoning, signals },  // reliability explanation
}
```

Each derived use case carries `confidence` (0..1) and `highConfidence`
(`confidence ≥ 0.75`). The parser splits conjoined action phrases (including
comma-separated verb lists) into separate capabilities, re-attaches purpose
clauses (`… to <action> …` becomes the goal), and normalizes plural role nouns
to a single actor. It never contains a fixed assignment model.

### 3.2 Requirement classifier (`nlp/requirementClassifier.js`)

`classifyRequirementSentence` labels each sentence with one of the requirement
types (functional, system step, supporting step, actor, domain entity,
business rule, precondition, postcondition, constraint, non-functional,
context, ambiguous). Only **functional** sentences may become expected use
cases; everything else is bucketed under `requirements.<TYPE>` and is never
turned into a fake use case.

### 3.3 Reliability analysis (`analyzeCaseStudyContext`)

A function in the parser scores five signals to decide whether the text is
substantial enough to check:

1. are there multiple descriptive sentences?
2. is there enough content (non-stop) vocabulary?
3. is there a functional (action) verb?
4. does an actor perform an action?
5. is the prose semantically complete (covers the actors it named)?

Each signal appears in `context.signals`. If the text is too thin, `reliable`
is `false` and the engine refuses to guess expected actors/use cases.

## 4. Case-Study-Driven Use Case Diagram Checking

This is the teacher-facing feature: the student draws a use case diagram, and
the backend checks it against the **assignment's own text**.

**Flow on every `run-check`:**

1. `requirementService.getRequirementTextForAssignment` reads the assignment's
   `requirementText` (falling back to `textContent`). There is no snapshot —
   the text is re-parsed on every check, so edits can never go stale.
2. `requirementService.getRequirementModelForSubmission` parses it with the NLP
   parser above.
3. `CheckingEngine.validateCaseStudyDiagramConsistency` compares the student's
   diagram to the parsed model and emits `CASE_STUDY_*` issues.

**Behaviour rules:**

- **Reliability gate.** If the text cannot support a reliable expectation set,
  exactly one `CASE_STUDY_INSUFFICIENT` warning is raised
  (`specCode INSUFFICIENT_CONTEXT`) and nothing is enforced.
- **Confidence gate.** Only derived use cases with `highConfidence` may become
  *required*. A low-confidence hint becomes `LOW_CONFIDENCE_REQUIREMENT`
  (info). A plain-noun derived name (no capability verb) becomes
  `INVALID_USE_CASE_NAME` (info). Neither is ever enforced.
- **Login as a precondition.** When the text mentions authentication, auth use
  cases are skipped in both the required and unsupported checks.
- **Actor tolerance.** Actors are matched with alias + fuzzy similarity. Exact
  matches pass; near-matches surface a name-quality note; unrelated actors
  produce an unsupported-actor warning.
- **System boundary.** A missing, unnamed or generic boundary name produces a
  `MISSING_SYSTEM_NAME` warning with a suggested name derived from the
  assignment's domain words; a name that contradicts the domain produces a
  system-name mismatch.
- **Evidence on every finding.** Each issue carries `context` details such as
  the required actor/use case, the best `matchedScore`, a confidence value and
  an assignment-aware `suggestion`.

**Codes emitted** (severity): actor missing (error), required use case missing
(error), actor responsibility mismatch (warning), unsupported use case
(warning), unsupported actor (warning), actor name mismatch (warning), system
name mismatch (error), system name missing (warning), match found (info),
low-confidence requirement (info), invalid use case name (info), insufficient
context (warning).

### 4.1 Case-study report shape

`buildCaseStudyReport` returns the structure the front end renders directly:

```js
{
  expected: { actors, useCases, systemCandidates },
  findings,                  // specCode + legacyCode + severity + relatedId
  counts:  { total, error, warning, info, byCode },
  coverage: { actorCoverage, useCaseCoverage },
  validation: { reliable, loginSupported, reasoning, signals },
  actorStatus:   [{ actor, status: 'found'|'typo'|'missing', submitted, matchedScore }],
  useCaseStatus: [{ useCase, primaryActor, confidence, highConfidence,
                    status: 'found'|'missing'|'lowConfidence'|'invalid'|'optional',
                    submitted, matchedScore }],
  systemName: { status: 'found'|'invalid'|'missing'|'mismatch', submitted, expected, matchedScore },
  overall: 'consistent' | 'warnings' | 'errors' | 'insufficient',
}
```

`overall` drives the banner in the checking panel; `'insufficient'` switches the
panel to a validation-only view that explains *why* the check could not run.

### 4.2 Assignment-aware suggestions (`nlp/suggestionGenerator.js`)

`suggestionGenerator.js` converts raw findings into concrete fixes using the
requirement text itself:

- `deriveSystemNameCandidates(requirementModel)` — 1–4 plausible system names
  from the assignment's domain vocabulary; a pure context noun (a place
  word such as "department") is used as a modifier, never the primary name.
- `generateAssignmentSuggestion(issue, requirementModel)` — produces messages
  such as "name the system after the assignment topic…", "the actor X is not
  part of the assignment; the roles are …", "rename this actor to the exact
  role in the assignment".
- `enrichIssueSuggestions(issues, requirementModel)` — bulk-writes those
  suggestions onto a set of issues.

## 5. Suggestion Engine (`services/suggestionEngine.js`)

A separate, older suggestion engine (not the NLP one) repairs and renames
diagram elements:

- `generateSuggestions(result, model)` — maps validation codes to repair /
  naming suggestion objects, deduplicated.
- `suggestFunctionName` — proposes operation names for SSD messages.
- `suggestOperationOwner` — proposes the correct class to own an operation.

It is used by `checkingController` (manual `POST /api/checking/check`) and by
the front-end fallback report.

## 6. Submission & Grading (`services/submissionService.js`)

A large workflow service covering the whole student/teacher cycle:

- draft/save/submit artifacts (one use case diagram, one class diagram,
  per-use-case descriptions, SSDs, sequence diagrams);
- completion calculation and tutorial-mode requests (request/approve/reject);
- run-check (authoritative report) and status with optional report;
- teacher grading, remarks and feedback (with a safe score coercion so letter
  grades never crash the maths);
- submission exports and receipts;
- per-student and per-teacher analytics with cache invalidation.

`utils/submissionQueryUtils.js` holds schema-version-resilient reads
(e.g. `findSubmissionWithArtifacts`) that avoid a Prisma flat-selector bug.

## 7. Communication & Data

- **Caching**: `utils/redis.js` + `utils/serviceCache.js` give a two-level
  cache (memory + Redis) with in-flight dedup and prefix invalidation. When
  Redis is absent the memory layer alone keeps the app functional.
- **Notifications**: `services/notificationService.js` batches and flushes
  queued notifications; `submissionService` triggers them on events.
- **Files**: `utils/fileUpload.js` (multer) + optional Cloudinary CDN; class
  resources and assignment/submission files are validated and cleaned up.
- **Logging**: `utils/logger.js` (Winston + daily rotation).

## 8. Controllers, Routes, Repositories

- `controllers/*` are thin HTTP handlers — they parse the request, call a
  service, and respond with the standard `{ success, data }` envelope.
- `routes/*` define the Express routers: auth, classes, assignments,
  submissions, checking, notifications, student, resources.
- `repositories/*` are thin Prisma data-access layers kept separate from
  business logic.

## 9. API Surface

- `GET /health` — liveness.
- `GET /api-docs` — Swagger UI (OpenAPI 3 spec built with `swagger-jsdoc`).
- `POST /api/checking/check` — validate a model directly (no submission).
- `/api/auth/*`, `/api/classes/*`, `/api/assignments/*`, `/api/submissions/*`,
  `/api/notifications/*`, `/api/student/*`, `/api/resources/*`.
- `POST /api/submissions/:id/run-check` — the authoritative grading check.

## 10. Tests

All suites live in `src/tests/` and run under `npx jest` (29 suites, 304
tests). The suites are pure unit tests — no database connection is required.

Required coverage areas:

- every validation phase: UCD (`ucdDescription`, `ucdRules`), description
  (`alternativeFlows`, `missingRules`), SSD (`descriptionSSD`, `ssdPhase89`),
  class (`classStructural`, `ssdClassDiagram`, `ssdClassOperations`,
  `classSequence`), sequence (`sequencePhase131415`, `engineGaps`),
  cross-diagram (`consistencyEngine`, `semanticService`).
- the case-study engine and NLP (`caseStudyEngine`, `caseStudyNlpChecks`,
  `caseStudyUcdValidation`, `requirementParser`, `requirementClassifier`,
  `suggestionGenerator`).
- rules and pipelines (`ruleRegistry`, `pipeline`, `modelFixtures`).
- performance (`performance`) and regressions (`sequenceAutosave`,
  `submissionQueryUtils`, `submissionServiceScore`).