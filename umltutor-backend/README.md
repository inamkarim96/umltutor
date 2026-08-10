# UML Tutor Backend

The back end of the UML Tutor learning platform. It stores all student and
teacher data and runs every automated check on the UML diagrams students draw.
In the overall system it is the **source of truth**: the diagrams, grades,
reports and suggestions shown in the app all come from here.

The checks are deterministic and offline. There are no calls to external AI
services, and no hardcoded assignment model — whenever an assignment's text
needs to be checked, it is read and understood at that moment.

The back end is built with Node.js, Express and Prisma, written in plain
JavaScript.

## Quick Start

- **Install** — `npm install`, then generate the database client and create a
  `.env` file from the example with your database and security keys.
- **Database** — sync the Prisma schema to your database and start the server
  in development mode.
- **Tests** — run the Jest suites with `npx jest`. The tests are pure unit
  tests and do not need a database.

Optional integrations the app can use when configured:

- **Firebase** — for user authentication.
- **Redis** — for the two-level cache. Without it, the application falls back
  to an in-memory cache alone.
- **Cloudinary** — for hosting uploaded files. Without it, files are kept on
  disk.

## What Each Area of the Code Does

The code is organised into separate areas, each with a clear job:

- **app and entry files** — set up the web application, its middleware, routes
  and documentation.
- **controllers** — the thin layer between incoming web requests and the
  business logic. They receive a request, ask a service to do the work, and
  send back the response.
- **routes** — the definitions of the web endpoints (authentication, classes,
  assignments, submissions, notifications, students, resources).
- **repositories** — the data-access layer. They keep database calls separate
  from business logic.
- **services** — where the real work happens. This is where validation,
  submissions, grading, requirements and notifications are handled.
- **rules** — the collection of validation rules and the logic that runs them.
- **nlp** — the offline text-analysis helpers: comparing words, parsing
  sentences, and understanding assignment requirement text.
- **middleware** — general handling for user authentication, rate limiting,
  request checking and errors.
- **utils** — shared helpers: caching, file uploads, logging and more.
- **fixtures** — example shapes used by the tests. Never served to production.
- **tests** — the Jest test suites.

## The Main Parts

### Validation

The core of the back end. A single validation call runs dozens of checks across
all five artifacts a student produces — the use case diagram, use case
descriptions, system sequence diagrams, class diagram and sequence diagrams —
plus checks that all of them agree with one another. The checks run in six
phases so a serious early mistake stops later, pointless checks.

The rules the engine uses are kept in a readable catalogue of more than 140
definitions. Rules can be switched on or off and their severity changed at run
time. After the main checks, an extra step traces knock-on errors back to their
root cause so reports show the real problem instead of a wall of symptoms.

### The Case-Study Check

A special check for teachers: the student's use case diagram is compared with
the assignment's own written text. Because the text is understood fresh each
time, nothing is hardcoded. The check only enforces capabilities the text
clearly supports, treats login as a normal part of the story, tolerates small
typos in actor names, and refuses to guess when the text is too thin to check.
It ends by producing a report the front end renders directly.

### Submission, Grading and Communication

These services handle the day-to-day workflow: saving and submitting artifacts,
checking how complete a submission is, grading with remarks and feedback,
exporting submissions and receipts, and producing analytics. Around that, the
back end handles notifications, caching, file storage and logging.

## How Data Is Organised

The data model stores users, classes, assignments and submissions, together
with the diagram artifacts a student saves (one use case diagram, one class
diagram, and per-use-case descriptions, system sequence diagrams and sequence
diagrams). Each assignment may carry a free-text requirement that the
case-study check uses.

## Web Endpoints

The back end exposes endpoints for every part of the workflow:

- the authoritative grading check, plus a direct "check this model" endpoint;
- authentication, classes, assignments, submissions, notifications, students
  and resources;
- Swagger documentation of the whole interface.

## Testing

The test suites in `src/tests/` are unit tests with no database dependency.
They cover every validation phase, the rule catalogue, text analysis, the
case-study engine, the suggestion engines, performance, and several past bugs
to stop them from coming back.

## License

MIT. See `LICENSE` for details.