# UML Tutor Frontend

The front end of the UML Tutor learning platform. It is the application students
and teachers see in the browser, where UML diagrams are drawn and checked.

In the overall system, the front end is the **view and the canvas**. It stores
nothing authoritative and runs no official checks. It sketches the diagrams,
sends them to the back end, and presents the reports, grades and suggestions
that the back end produces. The back-end report is always the final word; a
lightweight in-browser checker exists only as a fallback when no back-end report
is available.

The front end is built with React, styled with Tailwind CSS, and communicates
with the back end through a single API client. Firebase handles user login.

## Quick Start

```bash
npm install          # install dependencies
npm run dev          # webpack dev server
npm run build        # production bundle
npm run lint         # ESLint code style check
```

Create a `.env` file with the back-end address and the Firebase key before
running the app.

## What Each Area of the Code Does

```
src/
├── app/               # Redux store, one slice per concern
├── components/        # reusable UI, workspace shell, layout
├── contexts/          # app-wide providers
├── features/          # one module per capability (editors, checking, ...)
├── hooks/             # reusable logic, model loading
├── nlp/               # fallback text helpers (mirror of the back end)
├── pages/             # top-level student and teacher screens
├── services/          # API client and back-end communication
├── utils/             # exports, stale-data guards, helpers
└── styles/            # global styling
```

Each area has a clear job:

- **entry and app** — mounts the application, wires up the router, the global
  state store and the shared providers.
- **app** — the global Redux store, split into slices that each hold one part
  of the app's state (the current mode, the models being edited, checking
  results, submissions, and so on).
- **services** — one shared API client that attaches the login token to every
  request and centralises error handling, plus small modules for talking to
  each part of the back end.
- **contexts** — app-wide providers, including the piece that keeps the login
  state in sync with the back end.
- **features** — one self-contained module per capability: the five UML
  editors, the checking panel, auth, assignments, classroom, submissions,
  notifications, the teacher area and the tutorial flow.
- **components** — reusable building blocks: shared UI elements, the workspace
  shell, and the layout that wraps every page.
- **pages** — the top-level screens for students and teachers.
- **hooks** — reusable logic, most importantly the hook that loads and
  normalises a student's UML model from the back end.
- **utils** — helpers for exporting files, guarding against stale data, and
  other shared tasks.
- **nlp** — a small copy of the back end's text helpers, used only by the
  in-browser fallback checker.
- **styles** — the global styling.

## The Main Parts

### The Five UML Editors

The workspace shows one editor per artifact: the use case diagram, the use case
description, the system sequence diagram, the class diagram and the sequence
diagram. The editors load the saved model from the back end and render it for
editing. A shared wrapper coordinates mode switching, tutorial progress,
autosaving, exporting and submitting across all five editors.

### The Checking Panel

When a check has run, this panel presents the report. It shows a summary for
each artifact, a plain-language list of suggestions, and the case-study
consistency block with an overall verdict, the status of the system boundary,
per-actor and per-use-case statuses, the expected elements, and the findings
grouped by severity. For assignment texts that were too thin to check, it
explains why the check could not run.

### Modes, Tutorial and Practice

The app has two modes of working — development and tutorial — and guides
students through the five modelling steps in order. A self-contained practice
area lets students experiment with all five editors on their own, keeping their
work locally.

### Teacher and Student Areas

Separate areas serve the two roles. Teachers create assignments, manage
classes, review submissions, and handle tutorial requests. Students see their
classes and assignments, work on them in the workspace, submit them, and view
their reports.

The complete user journey — teacher creates a class and an assignment, the
student draws and submits, the teacher runs the automated check, grades, and
the student reads the report — is described with file references in the back
end's lifecycle document:
[`umltutor-backend/docs/ASSIGNMENT_LIFECYCLE.md`](../umltutor-backend/docs/ASSIGNMENT_LIFECYCLE.md).
It lists the front-end pages used at each stage alongside their back-end
endpoints.

## Routing

The app uses a small routing layer to direct users to the landing page, the
login and registration pages, the teacher dashboard, the student dashboard, the
assignment workspace and the submission report page.

## Notes for Maintainers

- The route matching is written by hand; new routes should follow the existing
  pattern of URL handling and slug parsing.
- The `nlp` folder mirrors its back-end counterpart for the in-browser
  fallback. Keep the two copies in sync when either changes.