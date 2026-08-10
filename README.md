# UML Tutor Project

A web platform where students practise drawing UML diagrams. A student creates
five kinds of work — a use case diagram, use case descriptions, a system
sequence diagram, a class diagram and a sequence diagram. The platform checks
each one, checks that they all agree with each other, and can also compare the
use case diagram against the assignment's own written requirements.

The project has two parts that work together:

- a **back end** that stores all the data and runs every automated check — it
  is the source of truth; and
- a **front end** that students and teachers use to draw the diagrams and read
  the reports.

## The Two Parts

### Back end (`umltutor-backend/`)

The back end is a web API built with Node.js, Express and Prisma, written in
plain JavaScript. It stores users, classes, assignments, submissions and every
diagram a student saves, and it runs all validation.

Key things it does:

- runs dozens of checks across all five artifacts plus cross-diagram
  consistency, in six ordered phases;
- keeps its rules in a readable catalogue of more than 140 definitions;
- traces knock-on errors back to their root cause, so reports show the real
  problem instead of a wall of errors;
- understands assignment requirement text entirely offline — no external AI
  and no hardcoded assignment model;
- checks a student's use case diagram against the assignment's own text,
  tolerating typos and refusing to guess when the text is too thin;
- manages the full submission workflow: drafts, checking, grading, feedback,
  exports and analytics.

### Frontend (`umltutor-frontend/`)

The front end is a React application that runs in the browser. It is the
canvas and the view: students draw the five diagrams in its editors, teachers
manage classes and assignments, and everyone reads the checking reports.

Key things it does:

- provides an editor for each of the five artifacts;
- supports development and tutorial modes;
- handles login through Firebase;
- renders the back end's validation reports, including the case-study
  consistency block;
- falls back to a lightweight in-browser check only when no back-end report is
  available (that fallback is never the official result).

## Getting Started

Start with the back end, because it is the part that validates:

```bash
cd umltutor-backend
npm install
npm run prisma:generate
cp .env.example .env      # add a database connection string
npm run prisma:push
npm run dev               # API running locally
npx jest                  # run the back end's test suite
```

Then start the front end:

```bash
cd umltutor-frontend
npm install
npm run dev               # the app running in the browser
```

Full setup instructions for each part are in their own README files.

## Documentation

- Back end: `umltutor-backend/README.md`, plus the detail documents in
  `umltutor-backend/docs/` (features and the validation flow).
- Frontend: `umltutor-frontend/README.md`.

## License

MIT. See `LICENSE` for details.