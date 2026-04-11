# UML Validation & Consistency Testing Assignments (Updated)

This document contains 4 distinct assignments designed specifically to trigger errors and warnings in your grammar, structural, and consistency checkers. 
**Per requirements, these assignments contain multiple actors, multiple use cases (2, 3, 5, and 4), multiple use case descriptions, and multiple System Sequence Diagrams (SSDs).**

---

## 📝 Assignment 1: ATM System (2 Use Cases)
**Focus Area:** Diagram Grammar & Precondition Errors

**1. Case Study (Scenario):**
> "The Bank needs an ATM system. A **Bank Customer** inserts their card to withdraw cash. The system validates the PIN and dispenses money. A **Maintenance Tech** logs in periodically to change the receipt paper, pausing the ATM while working."

**2. Intentionally Faulty Submission (To be entered by student):**
*   **System Name:** `System` *(Trigger: Weak System Name Error)*
*   **Actors:** `Bank Customer`, `Maintenance Tech`
*   **Use Cases (2):** 
    1. `Cash` *(Trigger: Invalid Use Case Name, no verb)*
    2. `Change Paper`

*   **Use Case Descriptions (2):**
    *   **Description 1 (For 'Cash'):**
        *   **Primary Actor:** `Bank Customer`
        *   **Precondition:** `None` *(Trigger: Precondition Missing/Invalid)*
        *   **Postcondition:** `got cash` *(Trigger: Grammar check error - not a proper sentence)*
        *   **Main Flow:**
            1. Customer enters PIN.
            2. System accepts.
            3. Customer takes cash.
    *   **Description 2 (For 'Change Paper'):**
        *   **Primary Actor:** `Maintenance Tech`
        *   **Precondition:** `The tech is logged in.`
        *   **Postcondition:** `The paper is replaced.`
        *   **Main Flow:**
            1. Tech opens machine.
            2. System pauses ATM.
            3. Tech replaces paper.

*   **System Sequence Diagrams (2):**
    *   **SSD 1 (Cash):** Messages: `enterPIN()`, `takeCash()`
    *   **SSD 2 (Change Paper):** Messages: `openMachine()`, `pauseATM()`, `replacePaper()`

---

## 📝 Assignment 2: University Portal (3 Use Cases)
**Focus Area:** Actor Mismatch & Extra SSD Messages

**1. Case Study (Scenario):**
> "A **Student** registers for a course through the University Portal. The system checks seat availability. A **Professor** can grade a student, and an **Admin** can add a new course to the system."

**2. Intentionally Faulty Submission (To be entered by student):**
*   **System Name:** `University Portal`
*   **Actors:** `Student`, `Professor`, `Admin`
*   **Use Cases (3):** `Register Course`, `Grade Student`, `Add Course`

*   **Use Case Descriptions (3):**
    *   **Description 1 (Register Course):**
        *   **Primary Actor:** `Studentt` *(Trigger: Actor Mismatch Error - spelling mistake in description vs diagram)*
        *   **Precondition:** `The student must be logged in.`
        *   **Postcondition:** `The course is registered.`
        *   **Main Flow:**
            1. Student selects a course.
            2. System verifies available seats.
            3. System registers the student.
    *   **Description 2 (Grade Student):**
        *   **Primary Actor:** `Professor`
        *   **Precondition:** `Professor is assigned to the course.`
        *   **Postcondition:** `Grade is submitted.`
        *   **Main Flow:**
            1. Professor selects student.
            2. System shows record.
            3. Professor submits grade.
    *   **Description 3 (Add Course):**
        *   **Primary Actor:** `Admin`
        *   **Precondition:** `Admin has privileges.`
        *   **Postcondition:** `Course is catalogued.`
        *   **Main Flow:**
            1. Admin enters course details.
            2. System saves course.

*   **System Sequence Diagrams (3):**
    *   **SSD 1 (Register Course):** Messages: `selectCourse()`, `verifySeats()`, `notifyFailure()` *(Trigger: Consistency Checker Error - `notifyFailure` is an extra message not present in the Main Flow)*
    *   **SSD 2 (Grade Student):** Messages: `selectStudent()`, `showRecord()`, `submitGrade()`
    *   **SSD 3 (Add Course):** Messages: `enterDetails()`, `saveCourse()`

---

## 📝 Assignment 3: E-Commerce Store (5 Use Cases)
**Focus Area:** Missing Steps & Chronological Order Mismatch

**1. Case Study (Scenario):**
> "An Online **Shopper** buys a product, views the catalog, and tracks orders. The **Seller** manages the inventory and processes refunds."

**2. Intentionally Faulty Submission (To be entered by student):**
*   **System Name:** `E-Commerce App`
*   **Actors:** `Shopper`, `Seller`
*   **Use Cases (5):** `Purchase Product`, `View Catalog`, `Track Order`, `Manage Inventory`, `Process Refund`

*   **Use Case Descriptions (5):**
    *   **Description 1 (Purchase Product):**
        *   **Primary Actor:** `Shopper`
        *   **Precondition:** `The cart is not empty.`
        *   **Postcondition:** `Order is placed successfully.`
        *   **Main Flow:**
            1. Shopper adds item to cart.
            2. Shopper enters shipping details.
            3. System calculates total.
            4. Shopper confirms payment.
            5. System generates order ID.
    *   **Description 2 (View Catalog):**
        *   Flow: 1. Shopper searches item. 2. System displays results.
    *   **Description 3 (Track Order):**
        *   Flow: 1. Shopper enters ID. 2. System shows status.
    *   **Description 4 (Manage Inventory):**
        *   Flow: 1. Seller updates stock. 2. System confirms update.
    *   **Description 5 (Process Refund):**
        *   Flow: 1. Seller approves refund. 2. System processes refund.

*   **System Sequence Diagrams (5):**
    *   **SSD 1 (Purchase Product):** 
        Messages: `addItem()`, `calculateTotal()` *(Trigger: Order Mismatch - happened before shipping details in SSD)*, `confirmPayment()` *(Trigger: Missing Step - skipped "shipping details" completely)*
    *   **SSD 2 (View Catalog):** `searchItem()`, `displayResults()`
    *   **SSD 3 (Track Order):** `enterID()`, `showStatus()`
    *   **SSD 4 (Manage Inventory):** `updateStock()`, `confirmUpdate()`
    *   **SSD 5 (Process Refund):** `approveRefund()`, `processRefund()`

---

## 📝 Assignment 4: Hospital System (4 Use Cases)
**Focus Area:** Structural Errors & Empty Flow Steps

**1. Case Study (Scenario):**
> "A **Patient** books or cancels an appointment. A **Receptionist** is required but missing from action. A **Doctor** views patient history and prescribes medicine."

**2. Intentionally Faulty Submission (To be entered by student):**
*   **System Name:** `Hospital System`
*   **Actors:** `Patient`, `Receptionist`, `Doctor`
*   **Diagram Error:** Do not connect the `Receptionist` actor to any Use Case. *(Trigger: Actor Not Connected Error)*
*   **Use Cases (4):** `Book Appointment`, `Cancel Appointment`, `View History`, `Prescribe Medicine`

*   **Use Case Descriptions (4):**
    *   **Description 1 (Book Appointment):**
        *   **Primary Actor:** `Patient`
        *   **Main Flow:**
            1. Patient requests appointment.
            2. *(Leave this step completely empty in the UI)* *(Trigger: Empty Main Flow Step Error)*
            3. System confirms slot.
    *   **Description 2 (Cancel Appointment):**
        *   Flow: 1. Patient requests cancel. 2. System updates database. 
    *   **Description 3 (View History):**
        *   Flow: 1. Doctor enters patient ID. 2. System shows records.
    *   **Description 4 (Prescribe Medicine):**
        *   Flow: 1. Doctor adds prescription. 2. System saves prescription.

*   **System Sequence Diagrams (4):**
    *   **SSD 1 (Book Appointment):** Add only 1 lifeline (Patient) and no System lifeline. *(Trigger: Incomplete SSD Error - minimum 2 lifelines required)*
    *   **SSD 2 (Cancel Appointment):** `requestCancel()`, `updateDatabase()`
    *   **SSD 3 (View History):** `enterPatientID()`, `showRecords()`
    *   **SSD 4 (Prescribe Medicine):** `addPrescription()`, `savePrescription()`
