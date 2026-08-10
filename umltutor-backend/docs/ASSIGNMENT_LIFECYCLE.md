# Assignment Lifecycle (End-to-End)

This document follows one assignment from the moment a teacher creates it until
a student sees their final grade. It covers teacher tasks, student tasks, and
the automated checking that produces the report.

Every stage below lists **where** it happens in the code as proof. The front
end is in `umltutor-frontend/`, the back end in `umltutor-backend/`.

## Roles

Two roles use the system:

- **teacher** — creates classes and assignments, checks submissions, grades.
- **student** — joins classes, draws the UML model, submits, reads the report.

Routes enforce who may call them. For example, only a teacher may run the
automated check:

```
umltutor-backend/src/routes/submissionRoutes.js:181
POST /api/submissions/:id/run-check  (authorize('TEACHER'))
```

## 1. Teacher Creates a Class

A teacher creates a class that will hold the assignments.

- **Proof:** `POST /api/classes` + `createClass`
  (`umltutor-backend/src/routes/classRoutes.js:37`,
  `umltutor-backend/src/services/classService.js:30`).
- The class gets a machine-generated join code used by students.

Students then join using that class code:

- **Proof:** `POST /api/student/classes/join` + `joinClass`
  (`umltutor-backend/src/routes/studentRoutes.js:30`,
  `umltutor-backend/src/services/classService.js:109`).

## 2. Teacher Creates an Assignment

The teacher posts an assignment to the class. The front-end form is
`CreateAssignmentModal.jsx`
(`umltutor-frontend/src/features/teacher/components/CreateAssignmentModal.jsx`).

The assignment carries:

- title, release date, due date (deadline), maximum score, and an
  **assignment type** — either free text (`TEXT`) or an uploaded file (`FILE`);
- the assignment's text content, which is the **requirement text** the
  case-study check later reads;
- an optional attached reference file.

**Proof:**

- Route: `POST /api/classes/:classId/assignments` and `POST /api/assignments`
  (`umltutor-backend/src/routes/classRoutes.js:93`,
  `umltutor-backend/src/routes/assignmentRoutes.js:23`).
- Controller: `createAssignmentDefinition`
  (`umltutor-backend/src/controllers/assignmentController.js:14`), which maps
  the `assignmentType` / `textContent` / `maxScore` fields into the record.
- Service: `createAssignmentDefinition`
  (`umltutor-backend/src/services/assignmentService.js:90`) — stores the
  assignment and **notifies every enrolled student** that a new assignment was
  posted.

Students see the new assignment on their dashboard. The back end composes each
assignment row with the student's own submission status, score and feedback
(`getAvailableAssignmentsForStudent`,
`umltutor-backend/src/services/assignmentService.js:219`).

## 3. Student Opens the Assignment

When a student enters the workspace, the back end returns the assignment
together with any previously saved work.

**Proof:** `GET /api/student/assignments/:id` + `getAssignmentForStudent`
(`umltutor-backend/src/routes/studentRoutes.js:34`,
`umltutor-backend/src/services/assignmentService.js:276`). It:

- loads the assignment, the student's submission, and the saved UML artifacts;
- verifies the student is enrolled in the class;
- returns a warning (not an error) when there is no saved work yet.

The front-end workspace page (`WorkspacePage.jsx`,
`umltutor-frontend/src/pages/WorkspacePage.jsx`) renders the five editors, and
switches the workspace into **read-only mode** once the submission is
submitted or graded, or once the deadline has passed.

## 4. Student Draws and Saves (Draft)

The five UML editors (use case diagram, use case description, system sequence
diagram, class diagram, sequence diagram) let the student draw the model. Every
save goes to the back end.

**Proof:** `POST /api/submissions/:assignmentId` + `submitAssignment`
(`umltutor-backend/src/routes/submissionRoutes.js:82`,
`umltutor-backend/src/controllers/submissionController.js:3`), which calls
`createSubmission` (`umltutor-backend/src/services/submissionService.js:237`).

`createSubmission`:

- checks the student is enrolled and that the deadline has not passed
  (a late save is rejected);
- blocks changes once the submission is `submitted` or `graded`;
- creates or updates the submission row and upserts all five artifacts in
  parallel (`_upsertArtifactsParallel`,
  `umltutor-backend/src/services/submissionService.js:164`);
- reports back a slim "lean" response for fast saving when the status is still
  `draft`.

Saving with status `draft` simply means "keep my work, do not submit yet."

## 5. Student Submits

Submitting changes the submission status from `draft` to `submitted`, records
the submission time, and locks the work from further edits.

**Proof:** same `createSubmission` path; the status field drives everything
(`umltutor-backend/src/services/submissionService.js:277-295`). The teacher is
notified that a submission was updated.

## 6. Teacher Runs the Automated Check → Report Is Generated

This is the moment "a report is generated". The teacher opens the review page
(`AssignmentReview.jsx`,
`umltutor-frontend/src/pages/teacher/AssignmentReview.jsx`) and presses
**Run Automated Check-In**.

**Proof:** the button calls `runSubmissionCheck`, which hits
`POST /api/submissions/:id/run-check` (teacher-only,
`umltutor-backend/src/routes/submissionRoutes.js:181`) →
`runSubmissionCheck` controller →
`runCheckForTeacher` service (`umltutor-backend/src/services/submissionService.js:489`).

Inside the check:

1. The saved submission and its artifacts are loaded.
2. The assignment's requirement text is resolved and parsed on demand
   (`requirementService.getRequirementModelForSubmission`,
   `umltutor-backend/src/services/requirementService.js:40`).
3. The validation engine runs in six phases — diagram, description, SSD, class
   diagram, sequence diagram, cross-diagram consistency — plus the dynamic
   case-study consistency check (`CheckingEngine.checkModel`,
   `umltutor-backend/src/services/checkingEngine.js:22`).
4. New issues are merged with any existing report issues for the same scope
   (per-section re-checks update only their own findings).
5. The report — issues, per-section summary (error/warning/info counts) and the
   case-study block — is stored in the submission's **evaluation record**
   (`update` branch, `umltutor-backend/src/services/submissionService.js:563-587`),
   and the submission is set back to `submitted`.

The student can then read the report via the status endpoint with
`includeReport=true` (`getSubmissionStatus`,
`umltutor-backend/src/services/submissionService.js:326`; route
`umltutor-backend/src/routes/submissionRoutes.js:95`).

## 7. Teacher Grades and Gives Feedback

The review page offers:

- **Post Grade & Feedback** — a final score (0–100 or a quick letter grade) plus
  written remarks. The back end stores the score and remarks in the evaluation
  record, sets the submission status to `graded`, and notifies the student.

**Proof:** `POST /api/submissions/:id/grade` and
`POST /api/submissions/:id/save-feedback`
(`umltutor-backend/src/routes/submissionRoutes.js:217,205`) →
`saveFeedbackForTeacher` (`umltutor-backend/src/services/submissionService.js:635`).

Scoring notes:

- A letter grade such as `A` never crashes the maths — the score is coerced to
  a safe number and simply left unchanged when it is not numeric
  (`_coerceScore`, `umltutor-backend/src/services/submissionService.js:157`);
- saving a draft evaluation keeps the submission at `submitted`; saving a final
  one marks it `graded` and notifies the student.

The teacher can also re-run the automated check any time, and view or download
the assignment instructions and reference file on the same page.

## 8. Student Sees the Result

The student's assignment list and submission pages now show:

- the submission status (`pending` / `draft` / `submitted` / `graded`),
- the score and the teacher's remarks,
- the validation report and issues (when a check has been run),
- a submission receipt.

**Proof:** the assignment list status computation
(`getAvailableAssignmentsForStudent`, service `assignmentService.js:219`), the
student's submission list (`getMySubmissions`, `submissionService.js:959`),
the status-with-report endpoint (`submissionService.js:326`), and the receipt
(`getSubmissionReceipt`, `submissionService.js:890`; route
`umltutor-backend/src/routes/submissionRoutes.js:156`).

## 9. Tutorial Mode (Optional, Student-Requested)

A student may ask the teacher to switch their work into guided tutorial mode.
Teachers approve or decline these requests.

**Proof:**

- Student request: `POST /api/submissions/:id/request-tutorial`
  (`umltutor-backend/src/routes/submissionRoutes.js:229`) →
  `requestTutorial` (`submissionService.js:1046`). The student must have
  submitted first, and there is no pending or approved request already.
- Teacher review: `GET /api/submissions/teacher/tutorial-requests`
  (`submissionRoutes.js:31`) → `getTutorialRequestsForTeacher`
  (`submissionService.js:1188`).
- Approve / reject: `POST /api/submissions/:id/approve-tutorial` and
  `POST /api/submissions/:id/reject-tutorial`
  (`submissionRoutes.js:241,253`) → `approveTutorial` / `rejectTutorial`
  (`submissionService.js:1098,1139`). One workflow from request to review is
  tracked per submission (requested / approved / rejected, with a review time
  and rejection reason).
- When approved, the workspace auto-switches to guided mode
  (`WorkspacePage.jsx`, `umltutor-frontend/src/pages/WorkspacePage.jsx:75`).

## 10. Exporting Work

Students and teachers can download the work (single diagrams, a combined PDF,
report text/JSON). Each export is recorded in the `SubmissionExport` record so
the teacher can see who exported what.

**Proof:** `POST /api/submissions/:assignmentId/exports` + `recordExport`
(`umltutor-backend/src/routes/submissionRoutes.js:131`,
`umltutor-backend/src/services/submissionService.js:1234`), listing via
`getExportsForAssignment` / `getExportsForStudent` (`submissionService.js:1260,1276`).

## 11. Analytics (Teacher and Student)

The system summarises progress for both roles.

**Teacher:**

- All submissions across all assignments: `GET /api/submissions/teacher/all`
  (`submissionRoutes.js:19`) → `getAllSubmissionsForTeacher`
  (`submissionService.js:824`).
- Per-assignment rows: `GET /api/submissions/:assignmentId/all`
  (`submissionRoutes.js:119`) → `getAssignmentSubmissions`
  (`submissionService.js:696`). This returns a row for **every enrolled
  student**, even those who have not submitted (status `pending`).
- Class analytics (submission rate, average grade, totals): `GET
  /api/classes/:classId/analytics` (`classRoutes.js:107`) →
  `getClassAnalytics` (`umltutor-backend/src/services/classService.js:316`).

**Student:**

- `GET /api/submissions/student/analytics` (`submissionRoutes.js:56`) →
  `getStudentAnalytics` (`submissionService.js:924`): number of assignments,
  completed count, average score, per-submission status and score.

## One-View Summary

```
teacher creates class ──► students join ──► teacher creates assignment
                                                 │  (title, deadlines, max score,
                                                 │   requirement text, file)
                                                 ▼
                             student opens assignment (gets saved work back)
                                                 │
                             student draws the five artifacts ─► saves drafts
                                                 │
                             student submits (locked; deadline enforced)
                                                 │
                             teacher runs automated check-in ─► report generated
                                                 │  (6 phases + case-study + summary)
                             teacher grades & gives feedback ─► student sees
                                                 │  score, remarks, report, receipt
                             (optional) tutorial-mode request/approve/reject
                                                 │
                              exports recorded ─► analytics for both roles
```

## Missing from the Older Docs

Earlier documentation described the validation engine and the modules, but did
not tie them to the concrete assignment workflow. This document is the missing
link: it names the endpoints, controllers and services that form the
assignment's full journey and which role performs each step.

## Key Files (Proof Index)

- Assignment: `umltutor-backend/src/routes/assignmentRoutes.js`,
  `umltutor-backend/src/controllers/assignmentController.js`,
  `umltutor-backend/src/services/assignmentService.js`
- Submission: `umltutor-backend/src/routes/submissionRoutes.js`,
  `umltutor-backend/src/controllers/submissionController.js`,
  `umltutor-backend/src/services/submissionService.js`
- Checking: `umltutor-backend/src/services/checkingEngine.js`,
  `umltutor-backend/src/services/requirementService.js`
- Classes: `umltutor-backend/src/routes/classRoutes.js`,
  `umltutor-backend/src/services/classService.js`
- Database: `umltutor-backend/prisma/schema.prisma` (Assignment, Submission,
  UseCaseDiagram, UseCaseDescription, SSDDiagram, ClassDiagram,
  SequenceDiagram, Evaluation, SubmissionExport)
- Front end: `umltutor-frontend/src/pages/WorkspacePage.jsx`,
  `umltutor-frontend/src/pages/teacher/AssignmentReview.jsx`,
  `umltutor-frontend/src/features/teacher/components/CreateAssignmentModal.jsx`,
  `umltutor-frontend/src/services/submissionService.js`