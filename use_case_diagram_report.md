# Use Case Diagram Analysis Report

## System Boundary
**Status:** ✓ Exists  
**Issue:** Missing system name  
**Suggestion:** Name the system "Notices Management System" to reflect the assignment domain.

## Actors
| Current Name | Issue | Suggestion |
|--------------|-------|------------|
| administrater | Typo | Use exact role: **Administrator** |
| sraff member | Typo | Use exact role: **Staff** |
| facult member | Typo | Use exact role: **Faculty** |
| Student | ✓ Correct | Keep as **Student** |

## Use Cases
| Current Name | Issue | Suggestion |
|--------------|-------|------------|
| manage registerad members | Typo in "registerad" | Use exact requirement: **Maintain Members** (Actor: Administrator) |
| maintain courses | ✓ Matches | Keep as **Maintain Courses** (Actor: Staff) |
| add motices | Typo in "motices" | Use exact requirement: **Add Notices** (Actor: Staff) |
| view notices | ✓ Matches | Keep as **View Notices** (Actor: Staff, Faculty, Student) |

## Missing Use Cases (from assignment)
- **Manage Recipients** (Actor: Staff) - for selecting notice recipients
- **Validate Notice Information** (Actor: System) - for checking validity of entered data
- **Login** (Actor: Administrator, Staff, Faculty, Student) - authentication for all roles

## Actor-Use Case Mapping (Corrected)
```
Administrator → Maintain Members
Staff → Maintain Courses, Add Notices, Manage Recipients, View Notices
Faculty → View Notices
Student → View Notices
System → Validate Notice Information
```

## Recommendations
1. **Rename system boundary** to "Notices Management System"
2. **Fix all actor names** to match assignment exactly: Administrator, Staff, Faculty, Student
3. **Fix use case names** to match requirements: Maintain Members, Maintain Courses, Add Notices, View Notices
4. **Add missing use cases** for recipient management and validation
5. **Add Login use case** for all actors
6. **Connect View Notices** to Faculty and Student actors (currently only shows Staff)