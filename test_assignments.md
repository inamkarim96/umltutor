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


Assignment 3: E-Commerce Store (5 Use Cases)
**Focus Area:** Missing Steps & Chronological Order Mismatch

**1. Case Study (Scenario):**
> "An Online **Shopper** buys a product, views the catalog, and tracks orders. The **Seller** manages the inventory and processes refunds."

**2. Intentionally Faulty Submission (To be entered by student):**
*   **System Name:** `E-Commerce App`
*   **Actors:** `Shopper`, `Seller`
*   **Use Cases (5):** `Purchase Product`, `View Catalog`, `Track Order`, `Manage Inventory`, `Process Refund`
E-Commerce App
System Name: E-Commerce App
Actors: Shopper, Seller

Use Case Descriptions (Corrected)
1. Purchase Product

Primary Actor: Shopper

Precondition: Cart is not empty; Shopper is logged in

Postcondition: Order is placed successfully with a unique order ID

Main Flow:

Shopper adds item to cart

Shopper enters shipping details

System calculates total

Shopper confirms payment

System generates order ID

2. View Catalog

Primary Actor: Shopper

Precondition: Shopper is logged in or guest access enabled

Postcondition: Catalog results are displayed

Main Flow:

Shopper searches item

System displays results

3. Track Order

Primary Actor: Shopper

Precondition: Shopper has a valid order ID

Postcondition: Order status is displayed

Main Flow:

Shopper enters order ID

System shows order status

4. Manage Inventory

Primary Actor: Seller

Precondition: Seller is authenticated

Postcondition: Inventory database updated successfully

Main Flow:

Seller updates stock

System confirms update

5. Process Refund

Primary Actor: Seller

Precondition: Refund request exists and is valid

Postcondition: Refund processed successfully

Main Flow:

Seller approves refund

System processes refund


## 📝 Assignment 4: Hospital System (4 Use Cases)
**Focus Area:** Structural Errors & Empty Flow Steps

**1. Case Study (Scenario):**
> "A **Patient** books or cancels an appointment. A **Receptionist** is required but missing from action. A **Doctor** views patient history and prescribes medicine."

**2. Intentionally Faulty Submission (To be entered by student):**
*   **System Name:** `Hospital System`
*   **Actors:** `Patient`, `Receptionist`, `Doctor`
*   **Diagram Error:** Do not connect the `Receptionist` actor to any Use Case. *(Trigger: Actor Not Connected Error)*
*   **Use Cases (4):** `Book Appointment`, `Cancel Appointment`, `View History`, `Prescribe Medicine`
🏥 Corrected Assignment 4: Hospital System
System Name: Hospital System
Actors: Patient, Receptionist, Doctor

Use Case Descriptions (Corrected)
1. Book Appointment

Primary Actor: Patient

Precondition: Patient is registered in the system

Postcondition: Appointment slot confirmed and stored in database

Main Flow:

Patient requests appointment

Receptionist checks availability

System confirms slot

2. Cancel Appointment

Primary Actor: Patient

Precondition: Patient has an existing appointment

Postcondition: Appointment canceled and database updated

Main Flow:

Patient requests cancellation

Receptionist verifies request

System updates database

3. View History

Primary Actor: Doctor

Precondition: Patient record exists in system

Postcondition: Patient history displayed to doctor

Main Flow:

Doctor enters patient ID

System shows records

4. Prescribe Medicine

Primary Actor: Doctor

Precondition: Patient record is accessible

Postcondition: Prescription saved in system

Main Flow:

Doctor adds prescription

System saves prescription



SSD 1 – Purchase Product

Lifelines: Shopper, System

Messages (Correct Order):

addItem()

enterShippingDetails()

calculateTotal()

confirmPayment()

generateOrderID()

SSD 2 – View Catalog

Lifelines: Shopper, System

Messages:

searchItem()

displayResults()

SSD 3 – Track Order

Lifelines: Shopper, System

Messages:

enterID()

showStatus()

SSD 4 – Manage Inventory

Lifelines: Seller, System

Messages:

updateStock()

confirmUpdate()

SSD 5 – Process Refund

Lifelines: Seller, System

Messages:

approveRefund()

processRefund()

🏥 Corrected SSDs for Hospital System
SSD 1 – Book Appointment

Lifelines: Patient, Receptionist, System

Messages:

requestAppointment()

checkAvailability()

confirmSlot()

SSD 2 – Cancel Appointment

Lifelines: Patient, Receptionist, System

Messages:

requestCancel()

verifyRequest()

updateDatabase()

SSD 3 – View History

Lifelines: Doctor, System

Messages:

enterPatientID()

showRecords()

SSD 4 – Prescribe Medicine

Lifelines: Doctor, System

Messages:

addPrescription()

savePrescription()