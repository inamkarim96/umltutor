# Backend Features

This document describes the modules that make up the back end and what each one
does. It is written in plain English and reflects the code as it is today. If
something is not described here, it does not run.

Where things live:

```
src/
├── controllers/   # handle incoming requests
├── routes/        # define the web endpoints
├── services/      # business logic (validation, submissions, grading)
├── repositories/  # database access
├── rules/         # validation rules and pipeline
├── nlp/           # offline text analysis
├── middleware/    # auth, rate limiting, request checks, errors
├── utils/         # shared helpers (cache, uploads, logging)
└── tests/         # Jest unit tests
```

## 1. The Rule System (`src/rules/`)

The back end uses a catalogue of rules to check student work. A rule is a small,
reusable test that looks at part of a diagram or piece of text and decides
whether something is wrong, worth a warning, or just an observation.

The rule catalogue holds more than 140 rule definitions, most of which are
active; a handful are switched off. Every rule covers one of the five modelling
artifacts a student produces:

- **Use case diagram** — how the system boundary, actors, use cases and their
  relationships are drawn and named.
- **Use case description** — how well the written description of a use case is
  filled in and written.
- **System sequence diagram (SSD)** — the lifelines and messages, and whether
  they match the description.
- **Class diagram** — the classes, their attributes, methods and relationships.
- **Sequence diagram** — the lifelines, operations, activations and message
  ordering.

There is also a group of rules that checks whether the different diagrams agree
with each other (for example, whether a message in the SSD matches a method in
the class diagram).

Related files in `src/rules/`:

- `ruleRegistry.js` — the full catalogue of rule definitions and helpers for
  looking rules up by code, diagram type, or category.
- `ruleConfig.js` — settings that let an operator switch rules on or off and
  change their severity or threshold without editing code.
- `rulePipeline.js` — coordinates the order in which rules run. It groups the
  work into phases so that a serious early mistake stops later, pointless checks.
  It also removes "noise": when one original mistake causes many knock-on errors,
  only the real cause is shown to the student.

## 2. The Validation Engine (`src/services/checkingEngine.js`)

This is the heart of the back end. It receives a complete UML model (all five
artifacts together) and runs the checks against it. It decides whether each
diagram is structurally sound, whether descriptions are complete, and whether
all the diagrams are consistent with one another.

It also carries out the case-study consistency check (see section 4) and builds
the report that the front end displays.

## 3. Offline Text Analysis (`src/nlp/`)

All the text work in the back end is done locally. There are no calls to
external AI services, and results are always the same for the same input.

- `similarity.js` — compares words and phrases to tell how close two names or
  sentences are, and finds the best match from a group of options.
- `sentenceUtils.js` — helpers for judging whether a sentence is well formed,
  spotting action steps, and reading method signatures and class attributes.
- `semanticService.js` — makes sure that messages, operations and methods are
  compared using the same rules across all validation phases.
- `constants.js` — shared word lists (action words, filler words, placeholder
  names, synonyms) and the similarity cut-off values used everywhere.
- `promptRequirementParser.js` — reads the free-text requirements of an
  assignment and turns them into a structured summary of who the actors are,
  which capabilities they perform and how complete the text is.
- `requirementClassifier.js` — sorts each sentence of the requirement text by
  what kind of information it contains. Only sentences that describe a real
  action can become expected use cases; everything else is set aside.
- `suggestionGenerator.js` — turns the findings of the case-study check into
  concrete, assignment-specific advice, such as what the system might be called
  or which roles are missing.

The parser also judges whether an assignment text is substantial enough to
check at all. If a text is too short or unclear, the engine refuses to guess
and instead explains that it cannot run the check properly.

## 4. The Case-Study Consistency Check

This is the teacher-facing feature. A student draws a use case diagram, and the
back end checks that diagram against the assignment's own written text. There is
no fixed, hardcoded assignment model — the text is read and understood fresh on
every check.

How it behaves:

- **Enough text first.** If the assignment text is too thin to support reliable
  expectations, the engine raises a single warning and enforces nothing.
- **Confidence matters.** Only capabilities that are clearly supported by the
  text are treated as required. Weak hints or plain nouns are reported as
  notes, never enforced.
- **Login is handled carefully.** When the text mentions login or
  authentication, login use cases are neither demanded nor flagged as extra.
- **Actor tolerance.** Actors are matched by meaning, not exact spelling, so a
  small typo does not become a false "missing actor" error. Unrelated actors
  still produce a warning.
- **System name handling.** A missing or generic system name produces a warning
  with a suggested name drawn from the assignment's topic.
- **Evidence on every finding.** Each issue carries an explanation of what was
  expected, how close the student's work came, and a suggested fix drawn from
  the assignment text.

The check produces a structured report (actors, use cases, system name, overall
verdict) that the front end renders directly. The overall verdict is one of
"consistent", "warnings", "errors" or "insufficient" (not enough text to check).

## 5. The Suggestion Engine (`src/services/suggestionEngine.js`)

A separate, simpler suggestion engine turns validation findings into repair
advice for diagram elements — for example, a sensible name for an operation or
the right class to place a method on. It is used alongside the assignment-aware
suggestions described above.

## 6. The Submission and Assignment Workflow (`src/services/submissionService.js`)

This module manages the whole student–teacher cycle for a submission:

- saving and submitting the five artifacts;
- calculating how complete the work is;
- running the authoritative check and producing the stored report;
- teacher grading, remarks and feedback;
- exporting submissions and issuing receipts;
- per-student and per-teacher analytics.

It relies on `utils/submissionQueryUtils.js` for reading submissions in a way
that stays correct across different database schema versions.

Together with `assignmentService.js` it covers the full assignment journey:
assignment creation, student saves and submits, the run-check that generates
the report, grading, tutorial-mode requests, exports and analytics. The whole
flow — who does what at each stage, with file references as proof — is
documented in [ASSIGNMENT_LIFECYCLE.md](ASSIGNMENT_LIFECYCLE.md).

## 7. Communication and Data Handling

- **Caching** — `utils/redis.js` and `utils/serviceCache.js` provide a two-level
  cache (memory plus Redis). If Redis is unavailable, the memory layer keeps the
  application working on its own.
- **Notifications** — `services/notificationService.js` queues notifications and
  sends them in batches; the submission module triggers them on events.
- **Files** — `utils/fileUpload.js` handles uploaded files with an optional
  cloud CDN. Class resources and assignment/submission files are checked and
  cleaned up.
- **Logging** — `utils/logger.js` records activity in daily log files.

## 8. Controllers, Routes and Repositories

- `src/controllers/` — thin handlers that take an incoming request, call a
  service, and send back a response in a standard format.
- `src/routes/` — defines the web endpoints for authentication, classes,
  assignments, submissions, checking, notifications, students and resources.
- `src/repositories/` — thin data-access layers that keep database calls
  separate from business logic.

## 9. Web Endpoints

The back end exposes a set of web endpoints for the front end to use:

- a health-check endpoint for monitoring;
- Swagger documentation at `/api-docs`;
- a direct validate-a-model endpoint for the front-end fallback;
- endpoint groups for authentication, classes, assignments, submissions,
  notifications, students and resources;
- the authoritative grading check that runs the full validation and returns the
  stored report.

## 10. Tests

All test suites live in `src/tests/` and run with Jest. They are pure unit
tests, so no database connection is needed. They cover every validation phase,
the rule catalogue, the text-analysis modules, the suggestion engines,
performance, and several past bug fixes to prevent regressions.