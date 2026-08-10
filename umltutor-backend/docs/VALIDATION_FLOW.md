# Validation Flow

This document explains how a UML model is validated from the moment a student
presses "check" until the report appears on screen. It is written in plain
English.

## 1. Where Validation Happens

There are three entry points, in order of importance:

1. **Authoritative backend check** — `POST /api/submissions/:id/run-check`.
   Resolves the assignment's requirement text, runs the full engine, and
   stores/serves the report. Grading is based on this.
2. **Per-model check API** — `POST /api/checking/check`. Validates a model
   sent directly in the request body (optionally with a requirement text).
3. **Front-end fallback** — `CheckingModePanel.performDynamicValidation` and a
   small `ConsistencyChecker`. This runs in the browser only when no backend
   report is available; it is a fallback, never the source of truth.

## 2. The Six Validation Phases

`rulePipeline.checkModelPhased` runs the engine in six phases, in order:

1. **diagram** — use case diagram structure: boundary, names, connectivity,
   relationships, duplicates, and the dynamic case-study group.
2. **description** — use case description completeness and flow correctness.
3. **ssd** — system sequence diagram structure and description↔SSD alignment.
4. **class-diagram** — class structure, methods, relationships, multiplicity.
5. **sequence-diagram** — lifelines, operations, activations, fragments.
6. **consistency** — cross-diagram mapping across all five artifacts.

A **critical error** in an early phase short-circuits the rest of that phase so
the student is not flooded with irrelevant downstream errors.

## 3. Dependency-Aware Pipeline

`rulePipeline.checkModelWithPipeline` runs after the engine and does two jobs:

### 3.1 Issue enrichment
Dependencies in the registry express "if rule B exists, it only fires because
rule A fired". The pipeline reads these chains and annotates findings so the
front end can show the *root cause* instead of the symptoms.

### 3.2 Cascade suppression
When several errors share one root cause, the pipeline collapses the redundant
ones. Example outcome: instead of ten "missing connection" errors caused by a
missing actor, the student sees the single real problem ("this actor does not
exist"). This keeps reports short and focused.

## 4. Suggestion Generation

Suggestions come from two independent engines:

- `services/suggestionEngine.js` — repair/naming suggestions matched to
  validation codes, deduplicated before display.
- `nlp/suggestionGenerator.js` — assignment-aware suggestions used by the
  case-study checks. When a requirement model exists, issue suggestions are
  overwritten with concrete text pulled from that requirement model (role
  names, derived capabilities, system-name candidates).

Every issue may carry a `context.suggestion`; the front end collects and
deduplicates those into a plain-language list.

## 5. The Case-Study Check (Requirement → Use Case Diagram)

This group validates the student's use case diagram against the assignment's
own requirement prose. It is fully dynamic — there is no fixed case-study data
in the code.

### 5.1 Parsing
`requirementService` reads the assignment text and hands it to the
`promptRequirementParser`, which produces a structured model (actors, use
cases, requirement buckets, coverage). `requirementClassifier` decides which
sentences are functional (action) statements; all other prose is stored under
its requirement type and ignored by the check.

### 5.2 Reliability gate
`analyzeCaseStudyContext` checks five signals. If the text is too thin
(fragments, a short login-only story, gibberish), the engine:

- raises exactly one `CASE_STUDY_INSUFFICIENT` warning
  (`specCode INSUFFICIENT_CONTEXT`),
- includes `context.reasoning` and the per-signal breakdown,
- returns without enforcing *any* expected actor or use case.

### 5.3 Confidence gate
Each derived use case has `confidence` 0..1. Only `highConfidence`
(`≥ 0.75`) use cases are enforced as `CASE_STUDY_USE_CASE_MISSING` when absent.
Low-confidence capabilities and plain-noun names are informational only.

### 5.4 Login handling
If the text mentions authentication (`loginSupported`), auth-labeled use cases
are skipped in the required check and in the unsupported check. A student who
draws "Login" on such an assignment is neither penalized for missing it nor
for including it.

### 5.5 Matching thresholds
- Actor match: exact (`≥ 0.97`) passes; near (`≥ 0.72`) → name-quality info;
  close-but-different (`≥ 0.4`) → name-mismatch warning; otherwise →
  unsupported-actor warning.
- Use case match: `≥ 0.48` → `MATCH_FOUND` info (with `relatedId` to the drawn
  node); below → missing error.
- Unsupported use case: a drawn use case matching all requirements below `0.4`
  is unsupported.
- System name: a submitted name that scores below `0.5` against the
  requirement domain is a mismatch.

Every matching value is attached to the finding as `context.matchedScore`.

### 5.6 Report
`buildCaseStudyReport` compiles:

- `expected` actors, use cases and system-name candidates;
- a `findings` array (`specCode` + legacy `CASE_STUDY_*` code + severity +
  `relatedId`);
- `counts` and `coverage`;
- `validation` (reliable / loginSupported / reasoning / signals);
- per-element `actorStatus[]`, `useCaseStatus[]` and `systemName` statuses;
- an `overall` verdict (`consistent | warnings | errors | insufficient`).

The front end renders the verdict banner, status rows, and (for
`insufficient`) a validation-only explanation of what text signals were
missing.

## 6. End-to-End Walkthrough (run-check)

```
student clicks "Run Checker"
   │
   ▼
POST /api/submissions/:id/run-check
   │
   ├─ submissionService loads the submission artifacts
   ├─ requirementService resolves + parses the assignment requirement text
   ├─ checkingEngine.checkModel(model, section, targetId, requirementModel)
   │     ├─ phased validation (6 phases, §2)
   │     ├─ dynamic case-study consistency check (§5)
   │     └─ buildCaseStudyReport(...)
   ├─ rulePipeline.checkModelWithPipeline: enrichment + suppression (§3)
   ├─ suggestion engines write assignment-aware suggestions (§4)
   └─ report saved → served to the front end
```

## 7. Front-End Rendering

`CheckingModePanel.jsx` consumes the report:

- a summary line per active section (use case diagram, description, SSD);
- a "suggestions" list (deduplicated);
- the CASE-STUDY CONSISTENCY block when a `caseStudyReport` is present:
  overall banner, system boundary status, per-actor and per-use-case statuses,
  expected chips, and findings grouped by severity — or, for thin assignment
  text, an explanation of what was missing.

The backend report is authoritative. The in-browser checker is used only as a
fallback when no report exists.

## 8. Reference

- Rule definitions: `src/rules/ruleRegistry.js`
- Phase and suppression logic: `src/rules/rulePipeline.js`
- Core engine: `src/services/checkingEngine.js`
- Requirement parsing/classification: `src/nlp/promptRequirementParser.js`,
  `src/nlp/requirementClassifier.js`
- Case-study report: `src/services/checkingEngine.js` →
  `buildCaseStudyReport`
- Assignment-aware suggestions: `src/nlp/suggestionGenerator.js`
- Requirement resolution: `src/services/requirementService.js`