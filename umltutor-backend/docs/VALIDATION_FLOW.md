# Validation Flow

This document explains how student work is checked, from the moment the student
requests a check until the report is shown. It is written in plain English and
avoids technical detail.

## 1. Where Validation Happens

There are three ways a model gets validated:

1. **The main check (run-check).** The student's saved submission is read, the
   assignment's requirement text is loaded, the full check runs, and the report
   is saved and returned. Grading is based on this report.
2. **A direct model check.** A model is sent to the back end on its own and
   checked immediately, without involving a saved submission.
3. **An in-browser fallback.** If no back-end report is available, the front end
   can run a lightweight check in the browser. This is only a fallback and is
   never treated as the official result.

The back-end report is always the source of truth.

## 2. The Six Validation Phases

The engine runs its checks in six phases, one after another:

1. **Use case diagram** — the boundary, names, connectivity, relationships and
   duplicates, plus the case-study consistency group.
2. **Use case description** — whether the description is complete and its flows
   are written correctly.
3. **System sequence diagram (SSD)** — the diagram structure and whether it
   aligns with the description.
4. **Class diagram** — classes, methods, relationships and multiplicities.
5. **Sequence diagram** — lifelines, operations, activations and fragments.
6. **Consistency** — whether all five artifacts agree with each other.

A serious error in an early phase stops the remaining checks for that phase, so
the student is not overwhelmed with errors caused by the original mistake.

## 3. Root Causes Instead of Symptoms

After the main checks run, one more step makes the report clearer:

- **Issue enrichment.** Dependencies between rules tell the engine which errors
  are only knock-ons of an earlier error. These relationships are recorded so
  the front end can point to the original cause.
- **Cascade suppression.** When many errors share one root cause, the redundant
  ones are collapsed into the single real problem. The result is a short report
  that names the true issue instead of listing dozens of symptoms.

## 4. Suggestions

Every finding can carry a written suggestion. Two engines produce them:

- a general one that maps validation results to repair and renaming advice;
- an assignment-aware one that, during the case-study check, writes advice
  taken directly from the assignment's own text (roles, expected capabilities,
  possible system names).

The front end collects all suggestions and shows them once each, in plain
language.

## 5. The Case-Study Check

This check compares the student's use case diagram with the assignment's own
requirement text. It is fully dynamic — nothing about the case study is stored
in the code.

**Parsing.** The assignment text is read and turned into a structured summary:
which actors appear, which capabilities they perform, and how complete the text
is. Only sentences that describe a real action are treated as candidate
capabilities; all other prose is set aside and ignored.

**Reliability gate.** Before anything is enforced, the engine decides whether
the text is substantial enough to check. If it is too thin (a fragment, a
one-line story, or unclear writing), the engine:

- raises exactly one "insufficient context" warning,
- explains which parts of the text were missing,
- and enforces no expected actors or use cases at all.

**Confidence gate.** Each candidate capability has a confidence score from 0 to
1. Only clearly supported capabilities are enforced as missing when absent.
Weak hints and plain-noun names are reported as notes, never enforced.

**Login handling.** When the text mentions authentication, login use cases are
neither required nor flagged as unsupported.

**Matching.** Actors and use cases in the student's diagram are matched to the
expected ones by meaning, not exact spelling. Close matches pass or get a
name-quality note; clearly unrelated items get a warning. Every comparison
records a score so the front end can show how close the match was.

**Report.** The check produces a report containing the expected actors, use
cases and system-name candidates; per-element statuses; and an overall verdict
of "consistent", "warnings", "errors" or "insufficient". For thin texts, the
report switches to a validation-only view that explains why the check could not
run.

## 6. End-to-End Flow

Here is the full journey of a run-check request:

1. The student clicks the "Run Checker" button.
2. The back end loads the student's saved artifacts.
3. It reads and parses the assignment's requirement text.
4. The validation engine checks the whole model in the six phases.
5. The case-study consistency check compares the use case diagram to the
   parsed requirement text and builds its report.
6. The pipeline enriches the findings with root causes and removes cascading
   noise.
7. The suggestion engines write plain-language advice.
8. The finished report is saved and returned to the front end, which renders it.

## 7. Front-End Rendering

The checking panel displays a summary for each artifact, a deduplicated list of
suggestions, and — when the back end supplied a case-study report — the overall
verdict, the system boundary status, per-actor and per-use-case statuses, the
expected elements, and the findings grouped by severity. If the assignment text
was too thin, it instead shows the validation-only explanation.

## 8. Reference

- Rule definitions: `src/rules/ruleRegistry.js`
- Phase and suppression logic: `src/rules/rulePipeline.js`
- Core engine: `src/services/checkingEngine.js`
- Requirement parsing and classification: `src/nlp/promptRequirementParser.js`,
  `src/nlp/requirementClassifier.js`
- Case-study report: `src/services/checkingEngine.js`
- Assignment-aware suggestions: `src/nlp/suggestionGenerator.js`
- Requirement resolution: `src/services/requirementService.js`