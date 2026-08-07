# Manual Test — Department Notices System (5 Artifacts)

> **Goal:** Manually test all five modeling steps (Use Case Diagram, Use Case Description, SSD, Class Diagram, Sequence Diagram) in the UML Tutor application against the "Department Notices" case study.
> **Expected result:** The five artifacts, entered as described below, are *consistent* with each other and pass validation (score reflects only intentional minor warnings, no errors).

---

## Case Study Summary

A department notices website that manages notices each semester:

- **Notices:** time table, sessional/final paper dates, project review dates, holiday announcements, meeting announcements.
- **Roles:** Administrator, Staff, Faculty, Student.
- **Staff** adds notices (after logging in), enters the relevant information, the system validates it, asks for recipients (all faculty / all students / selected faculty / selected students e.g. 4th semester), saves the message, and it appears on the relevant pages.
- Past notices are viewable by staff, faculty, and students after login.

For this manual test we model **one** core use case: **"Add Notice"** by a **Staff Member**, consistent across all five artifacts.

---

## Step 1 — Use Case Diagram (UCD)

Draw on the canvas with a System Boundary "Department Notices System", a Staff Member actor, and one use case "Add Notice".

```json
{
  "nodes": [
    {
      "id": "sb-1",
      "type": "systemBoundary",
      "data": { "label": "Department Notices System", "width": 600, "height": 500 }
    },
    {
      "id": "uc-add-notice",
      "type": "usecase",
      "parentNode": "sb-1",
      "data": { "label": "Add a Notice" }
    },
    {
      "id": "actor-staff",
      "type": "actor",
      "data": { "label": "Staff Member" }
    }
  ],
  "edges": [
    { "id": "e1", "source": "actor-staff", "target": "uc-add-notice", "type": "association" }
  ]
}
```

---

## Step 2 — Use Case Description (for the use case above)

```json
{
  "uc-add-notice": {
    "useCaseName": "Add a Notice",
    "primaryActor": "Staff Member",
    "preconditions": "Staff member is logged in and on the Add Notice page.",
    "postconditions": "The notice is saved and visible to the selected recipients.",
    "mainFlow": [
      { "step": 1, "action": "Staff member chooses the appropriate notice type" },
      { "step": 2, "action": "Staff member enters the required notice information" },
      { "step": 3, "action": "System validates the entered information" },
      { "step": 4, "action": "Staff member selects the recipients of the notice" },
      { "step": 5, "action": "System saves the notice and displays it to recipients" }
    ]
  }
}
```

> **Check:** `primaryActor` ("Staff Member") exactly matches the actor label in Step 1.

---

## Step 3 — SSD (System Sequence Diagram)

**Lifelines:** `Staff Member` (actor) → `System` (system).

```json
{
  "uc-add-notice": {
    "lifelines": [
      { "id": "lifeline-staff", "label": "Staff Member", "type": "actor" },
      { "id": "lifeline-system", "label": "System", "type": "system" }
    ],
    "messages": [
      { "id": "m1", "order": 1, "fromLifelineId": "lifeline-staff", "toLifelineId": "lifeline-system", "name": "chooseNoticeType()", "type": "synchronous" },
      { "id": "m2", "order": 2, "fromLifelineId": "lifeline-staff", "toLifelineId": "lifeline-system", "name": "enterNoticeInformation()", "type": "synchronous" },
      { "id": "m3", "order": 3, "fromLifelineId": "lifeline-staff", "toLifelineId": "lifeline-system", "name": "validateNotice()", "type": "synchronous" },
      { "id": "m4", "order": 4, "fromLifelineId": "lifeline-staff", "toLifelineId": "lifeline-system", "name": "selectRecipients()", "type": "synchronous" },
      { "id": "m5", "order": 5, "fromLifelineId": "lifeline-system", "toLifelineId": "lifeline-staff", "name": "saveNotice()", "type": "return", "isReturn": true }
    ]
  }
}
```

**Check:** the messages here (as methods) must exist as **operations on a class** in Step 4.

---

## Step 4 — Class Diagram (CD)

One **Notice** class exposing the exact methods that match the SSE messages.

```json
{
  "nodes": [
    {
      "id": "class-notice",
      "type": "class",
      "data": {
        "label": "Notice",
        "methods": [
          "+ chooseNoticeType()",
          "+ enterNoticeInformation()",
          "+ validateNotice()",
          "+ selectRecipients()",
          "+ saveNotice()"
        ]
      }
    }
  ],
  "edges": []
}
```

> **Induced on:** This is the classic "anti-anaemic" encounter used in the tutorial to show that each system call maps to a method. In a real model you would normally add classes such as `Members`, `Recipients`, `Faculty`, `Student`, but for a minimal consistent test the single `Notice` class is enough.

---

## Step 5 — Sequence Diagram (SD)

**Lifelines:** actor `Staff Member` + object `Notice` (matching the class in Step 4).

```json
{
  "uc-add-notice": {
    "lifelines": [
      { "id": "seq-actor", "label": "Staff Member", "type": "actor" },
      { "id": "seq-notice", "label": "Notice", "type": "object" }
    ],
    "messages": [
      { "id": "sm1", "order": 1, "fromLifelineId": "seq-actor", "toLifelineId": "seq-notice", "name": "chooseNoticeType()", "type": "synchronous" },
      { "id": "sm2", "order": 2, "fromLifelineId": "seq-notice", "toLifelineId": "seq-notice", "name": "enterNoticeInformation()", "type": "synchronous" },
      { "id": "sm3", "order": 3, "fromLifelineId": "seq-notice", "toLifelineId": "seq-notice", "name": "validateNotice()", "type": "synchronous" },
      { "id": "sm4", "order": 4, "fromLifelineId": "seq-notice", "toLifelineId": "seq-notice", "name": "selectRecipients()", "type": "synchronous" },
      { "id": "sm5", "order": 5, "fromLifelineId": "seq-notice", "toLifelineId": "seq-actor", "name": "saveNotice()", "type": "return", "isReturn": true }
    ],
    "fragments": [
      { "id": "f1", "operator": "validation", "guard": "inputs valid", "startMessageId": "sm2", "endMessageId": "sm3" }
    ]
  }
}
```

**Check:** the actor (`Staff Member`), the object lifeline (`Notice`), and the message names must mirror Steps 2–4 so the engine does not flag cross-diagram inconsistencies.

---

## Cross-Check Guideline (what to verify)

| # | Artifact | Consistency check to verify |
|---|----------|-----------------------------|
| 1 | Category Step 1 (δ UCD) | Actor "Staff Member" used in the description (Step 2). |
| 2 | Description | `primaryActor` ("Staff Member") matches UCD actor name exactly. |
| 3 | SSD | Message names become method calls — must exist on a class (Step 4). |
| 4 | Class Diagram | Every SSD/SE message is present as a method. |
| 5 | Sequence Diagram | Lifeline labels = UCD/CD names; messages = SSD messages; return message present. |
| 6 | Activation Fragment | Synchronous calls to an object ("Notice") must have an activation bar. |
| 7 | Combined Fragment | Optional: add `alt` for "recipients failed to save" to test fragment validation. |

---

## Optional Negative Test (to confirm validation fires)

Change **Step 3** message `selectRecipients()` to `selectPeople()` (no matching method in Step 4) and re-run. The engine should now flag a missing-class-operation / sequence-message-not-defined issue.

---

*Generated for manual end-to-end testing of all five artifacts.*