# Requirements Document

## Introduction

This feature enhances the reimbursement management system to provide better user experience, improved navigation, flexible submission options, and proper access control. The system will support submitting reimbursements on behalf of others, direct submission from fund pages, charge submissions (debts to the circle), and comprehensive management of personal reimbursements. All interfaces will be in Hebrew to match the target user base.

## Requirements

### Requirement 1: My Reimbursements Navigation

**User Story:** As a system user, I want a dedicated "ההחזרים שלי" (My Reimbursements) tab in the navigation bar, so that I can quickly access and manage all my reimbursement requests.

#### Acceptance Criteria

1. WHEN a user views the navigation bar THEN the system SHALL display a "ההחזרים שלי" navigation item
2. WHEN a user clicks on "ההחזרים שלי" THEN the system SHALL navigate to a page showing all reimbursements submitted by or assigned to the user
3. WHEN the user views their reimbursements page THEN the system SHALL display reimbursement status, amount, fund, budget, and submission date
4. WHEN the user views their reimbursements page THEN the system SHALL group or filter reimbursements by status (pending, approved, rejected)

### Requirement 2: Fund Selection in Reimbursement Submission

**User Story:** As a user submitting a reimbursement, I want to see available funds organized by budget, so that I can correctly select which fund to charge my expense to.

#### Acceptance Criteria

1. WHEN a user opens the reimbursement submission form THEN the system SHALL load and display all funds the user has access to
2. WHEN displaying funds THEN the system SHALL group funds by their parent budget
3. WHEN displaying funds THEN the system SHALL show the budget name and fund name for each option
4. IF a fund belongs to a circle budget THEN the system SHALL display it with the circle budget label
5. IF a fund belongs to a group budget THEN the system SHALL display it with the group name label
6. WHEN the funds list loads THEN the system SHALL NOT show an empty or broken dropdown

### Requirement 3: Submit Reimbursement on Behalf of Another User

**User Story:** As a user submitting a reimbursement, I want to optionally specify a different recipient for the reimbursement payment, so that I can submit expenses where someone else should receive the money.

#### Acceptance Criteria

1. WHEN a user views the reimbursement submission form THEN the system SHALL display an optional "שלח תשלום ל" (Send payment to) field
2. WHEN the "שלח תשלום ל" field is empty THEN the system SHALL default the payment recipient to the submitting user
3. WHEN a user selects a different user in "שלח תשלום ל" THEN the system SHALL record that user as the payment recipient
4. WHEN a reimbursement is approved THEN the system SHALL process payment to the specified recipient, not necessarily the submitter
5. WHEN displaying reimbursement details THEN the system SHALL show both the submitter and the payment recipient if they differ
6. WHEN the reimbursement is charged to a fund THEN the system SHALL deduct from the selected fund regardless of who receives payment

### Requirement 4: Direct Reimbursement and Planned Expense Submission from Fund Page

**User Story:** As a user viewing a specific fund, I want to submit reimbursements or planned expenses directly from that fund's page, so that I don't need to navigate away and re-select the fund.

#### Acceptance Criteria

1. WHEN a user views a fund detail page THEN the system SHALL display action buttons for "הגש החזר" (Submit Reimbursement) and "הוסף תכנון" (Add Planned Expense)
2. WHEN a user clicks "הגש החזר" from a fund page THEN the system SHALL open the reimbursement form with the fund pre-selected
3. WHEN a user clicks "הוסף תכנון" from a fund page THEN the system SHALL open the planned expense form with the fund pre-selected
4. WHEN the form opens with a pre-selected fund THEN the system SHALL allow the user to change the fund if needed
5. WHEN the user submits the form THEN the system SHALL validate that the user has access to the selected fund

### Requirement 5: Fund Access Control Based on Budget and Group Membership

**User Story:** As a system user, I want to only see and submit to funds that I have permission to access based on my role and group membership, so that I cannot accidentally submit to unauthorized funds.

#### Acceptance Criteria

1. WHEN any user views available funds THEN the system SHALL display all funds from circle budgets
2. WHEN a user belongs to one or more groups THEN the system SHALL display all funds from budgets of those groups
3. WHEN a user does not belong to a group THEN the system SHALL NOT display funds from that group's budgets
4. WHEN a user attempts to submit a reimbursement to a fund THEN the system SHALL validate the user has access to that fund's budget
5. IF a user attempts to submit to an unauthorized fund THEN the system SHALL reject the submission with an error message
6. WHEN a group treasurer views funds THEN the system SHALL display funds from their group's budgets and circle budgets

### Requirement 6: Delete Personal Reimbursement Submissions

**User Story:** As a user who submitted a reimbursement, I want to delete my submission, so that I can remove incorrect or duplicate entries.

#### Acceptance Criteria

1. WHEN a user views their reimbursements THEN the system SHALL display a delete action for each reimbursement
2. WHEN a user clicks delete on their own reimbursement THEN the system SHALL prompt for confirmation
3. WHEN the user confirms deletion THEN the system SHALL remove the reimbursement from the database
4. WHEN a reimbursement is deleted THEN the system SHALL update the display to remove it from the list
5. WHEN a user attempts to delete another user's reimbursement THEN the system SHALL reject the action with an authorization error
6. WHEN a reimbursement has been approved THEN the system SHALL prevent deletion and display an appropriate message

### Requirement 7: Edit Pending Reimbursement Submissions

**User Story:** As a user who submitted a reimbursement, I want to edit my pending reimbursement before it's approved, so that I can correct mistakes without deleting and resubmitting.

#### Acceptance Criteria

1. WHEN a user views their pending reimbursements THEN the system SHALL display an edit action for each pending reimbursement
2. WHEN a user clicks edit on a pending reimbursement THEN the system SHALL open the reimbursement form pre-filled with existing data
3. WHEN the user modifies and submits the form THEN the system SHALL update the reimbursement record
4. WHEN a reimbursement status is "approved" or "rejected" THEN the system SHALL NOT display the edit action
5. WHEN a user attempts to edit another user's reimbursement THEN the system SHALL reject the action with an authorization error
6. WHEN a reimbursement is updated THEN the system SHALL maintain the original submission timestamp

### Requirement 8: Submit Charge (Debt to Circle)

**User Story:** As a user who owes money to the circle, I want to submit a charge record, so that the system can offset this debt against my pending reimbursements.

#### Acceptance Criteria

1. WHEN a user accesses the reimbursement submission area THEN the system SHALL provide an option to "הגש חיוב" (Submit Charge)
2. WHEN a user submits a charge THEN the system SHALL record a negative amount against the user's account
3. WHEN calculating total reimbursements owed to a user THEN the system SHALL subtract any charges from the total
4. WHEN displaying a user's reimbursement summary THEN the system SHALL show total reimbursements, total charges, and net amount owed
5. WHEN a charge is submitted THEN the system SHALL require a description and amount
6. WHEN a charge is submitted THEN the system SHALL associate it with a specific fund or budget for tracking purposes
7. WHEN displaying charges THEN the system SHALL clearly distinguish them from regular reimbursements

### Requirement 9: Hebrew Language Interface

**User Story:** As a Hebrew-speaking user, I want the entire reimbursement system interface in Hebrew, so that I can use the system in my native language.

#### Acceptance Criteria

1. WHEN any user views the reimbursement interface THEN the system SHALL display all labels, buttons, and messages in Hebrew
2. WHEN the system displays navigation items THEN the system SHALL use Hebrew text (e.g., "ההחזרים שלי")
3. WHEN the system displays form fields THEN the system SHALL use Hebrew labels (e.g., "סכום", "תיאור", "קופה")
4. WHEN the system displays status values THEN the system SHALL use Hebrew text (e.g., "ממתין לאישור", "אושר", "נדחה")
5. WHEN the system displays error messages THEN the system SHALL present them in Hebrew
6. WHEN the system displays confirmation dialogs THEN the system SHALL use Hebrew text
