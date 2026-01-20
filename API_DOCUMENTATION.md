# API Documentation

Base URL: `/api/v1`

---

## Authentication

### Disable User
- **Endpoint:** `POST /auth/disable-user`
- **Permission:** Admin only
- **Parameters:** None specified
- **Description:** Disable a Firebase user account

---

## Account Management

### Get All Accounts
- **Endpoint:** `GET /account`
- **Parameters:** None
- **Description:** Retrieve all accounts

### Get Accounts with Filters
- **Endpoint:** `POST /account/getAccounts`
- **Parameters:** Filter parameters in request body
- **Description:** Get accounts with filtering options

### Create Account
- **Endpoint:** `POST /account`
- **Request Body:** Account schema validation required
- **Description:** Create a new account

### Update Account
- **Endpoint:** `PUT /account/:accountId`
- **Parameters:**
  - `accountId` (path) - UUID of the account
- **Request Body:** Account schema validation required
- **Description:** Update account by ID

### Partially Update Account
- **Endpoint:** `PATCH /account/update-contact/:accountId`
- **Parameters:**
  - `accountId` (path) - UUID of the account
- **Request Body:** Account schema validation required
- **Description:** Partially update account details

### Delete Account
- **Endpoint:** `DELETE /account/:accountId`
- **Parameters:**
  - `accountId` (path) - UUID of the account
- **Permission:** Admin only
- **Description:** Delete single account

### Bulk Delete Accounts
- **Endpoint:** `POST /account/bulk-delete`
- **Permission:** Admin only
- **Request Body:** Array of account IDs to delete
- **Description:** Delete multiple accounts

### Get Account by ID
- **Endpoint:** `GET /account/:accountId`
- **Parameters:**
  - `accountId` (path) - UUID of the account
- **Description:** Get specific account details

### Get Leads by Account
- **Endpoint:** `POST /account/leads/:accountId`
- **Parameters:**
  - `accountId` (path) - UUID of the account
- **Description:** Get all leads associated with an account

### Get Contacts by Account
- **Endpoint:** `GET /account/contacts/:accountId`
- **Parameters:**
  - `accountId` (path) - UUID of the account
- **Description:** Get all contacts associated with an account

### Upload Accounts via Excel
- **Endpoint:** `POST /account/upload-excel-accounts`
- **Permission:** Admin only
- **Request Body:** Multipart form data with Excel file
- **Description:** Bulk upload accounts using Excel file

### Get Accounts by Organization (Lookup)
- **Endpoint:** `GET /account/lookup/orgnizationId`
- **Parameters:** Organization ID from authenticated user context
- **Description:** Get accounts filtered by organization

---

## Contact Management

### Get All Contacts
- **Endpoint:** `GET /contact`
- **Parameters:** None
- **Description:** Retrieve all contacts

### Get Contacts with Filters
- **Endpoint:** `POST /contact/getContacts`
- **Parameters:** Filter parameters in request body
- **Description:** Get contacts with filtering options

### Create Contact
- **Endpoint:** `POST /contact`
- **Request Body:** Contact schema validation required
- **Description:** Create a new contact

### Update Contact
- **Endpoint:** `PUT /contact/:contactId`
- **Parameters:**
  - `contactId` (path) - UUID of the contact
- **Request Body:** Contact schema validation required
- **Description:** Update contact by ID

### Partially Update Contact
- **Endpoint:** `PATCH /contact/:contactId`
- **Parameters:**
  - `contactId` (path) - UUID of the contact
- **Request Body:** Partial contact schema validation required
- **Description:** Partially update contact details

### Delete Contact
- **Endpoint:** `DELETE /contact/:contactId`
- **Parameters:**
  - `contactId` (path) - UUID of the contact
- **Description:** Delete a contact

### Get Contact by ID
- **Endpoint:** `GET /contact/:contactId`
- **Parameters:**
  - `contactId` (path) - UUID of the contact
- **Description:** Get specific contact details

### Bulk Delete Contacts
- **Endpoint:** `POST /contact/bulk-delete`
- **Permission:** Admin only
- **Request Body:** Array of contact IDs to delete
- **Description:** Delete multiple contacts

### Upload Contacts via Excel
- **Endpoint:** `POST /contact/upload-excel-contacts`
- **Permission:** Admin only
- **Request Body:** Multipart form data with Excel file
- **Description:** Bulk upload contacts using Excel file

### Get Contacts by Account
- **Endpoint:** `POST /contact/account/:accountId`
- **Parameters:**
  - `accountId` (path) - UUID of the account
- **Description:** Get all contacts associated with an account

### Get Contacts by Organization (Lookup)
- **Endpoint:** `GET /contact/lookup/orgnizationId-ownerId`
- **Parameters:** Organization ID and Owner ID from authenticated user context
- **Description:** Get contacts filtered by organization and owner

### Upload Contacts via VCF
- **Endpoint:** `POST /contact/upload-vcf-contacts`
- **Permission:** Admin only
- **Request Body:** Multipart form data with VCF file
- **Description:** Bulk upload contacts using VCF file

---

## Lead Management

### Get All Leads
- **Endpoint:** `GET /lead`
- **Parameters:** None
- **Description:** Retrieve all leads

### Create Lead
- **Endpoint:** `POST /lead/create-lead`
- **Request Body:** Lead schema validation required
- **Description:** Create a new lead

### Get Leads with Filters
- **Endpoint:** `POST /lead/get-leads`
- **Permission:** Admin, Sales Manager, Salesperson
- **Parameters:** Filter parameters in request body
- **Description:** Get leads with filtering options

### Update Lead
- **Endpoint:** `PUT /lead/update-lead/:leadId`
- **Parameters:**
  - `leadId` (path) - UUID of the lead
- **Permission:** Admin, Salesperson, Sales Manager
- **Request Body:** Lead schema validation required
- **Description:** Update lead by ID

### Get Lead by ID
- **Endpoint:** `GET /lead/get-lead/:leadId`
- **Parameters:**
  - `leadId` (path) - UUID of the lead
- **Permission:** Salesperson, Admin, Sales Manager
- **Description:** Get specific lead details

### Delete Lead
- **Endpoint:** `DELETE /lead/delete-lead/:leadId`
- **Parameters:**
  - `leadId` (path) - UUID of the lead
- **Permission:** Admin only
- **Description:** Delete a lead

### Upload Leads via Excel
- **Endpoint:** `POST /lead/upload-excel-leads`
- **Permission:** Admin only
- **Request Body:** Multipart form data with Excel file
- **Description:** Bulk upload leads using Excel file

### Bulk Delete Leads
- **Endpoint:** `POST /lead/bulk-delete`
- **Permission:** Admin only
- **Request Body:** Bulk delete schema validation required
- **Description:** Delete multiple leads

### Get Leads by Contact
- **Endpoint:** `POST /lead/bycontact/:contactId`
- **Parameters:**
  - `contactId` (path) - UUID of the contact
- **Description:** Get all leads associated with a contact

### Get Leads by Account
- **Endpoint:** `POST /lead/byaccount/:accountId`
- **Parameters:**
  - `accountId` (path) - UUID of the account
- **Description:** Get all leads associated with an account

### Assign Leads by Title
- **Endpoint:** `PUT /lead/assign-by-type/:leadTitle`
- **Parameters:**
  - `leadTitle` (path) - Title of leads to be assigned
- **Request Body:**
  - `userId` (string, required) - ID of the user to assign as owner
- **Description:** Assign all leads with the same title to a specific user

---

## Opportunity Management

### Get All Opportunities
- **Endpoint:** `GET /opportunity`
- **Parameters:** None
- **Description:** Retrieve all opportunities

### Get All Opportunities with Filters
- **Endpoint:** `POST /opportunity/getAllopportunity`
- **Permission:** Admin, Sales Manager, Salesperson
- **Parameters:** Filter parameters in request body
- **Description:** Get opportunities with filtering options

### Create Opportunity
- **Endpoint:** `POST /opportunity/create-opportunity`
- **Request Body:** Opportunity schema validation required
- **Description:** Create a new opportunity

### Update Opportunity
- **Endpoint:** `PUT /opportunity/:opportunityId`
- **Parameters:**
  - `opportunityId` (path) - UUID of the opportunity
- **Permission:** Admin, Salesperson, Sales Manager
- **Request Body:** Opportunity schema validation required
- **Description:** Update opportunity by ID

### Delete Opportunity
- **Endpoint:** `DELETE /opportunity/:opportunityId`
- **Parameters:**
  - `opportunityId` (path) - UUID of the opportunity
- **Permission:** Admin only
- **Description:** Delete an opportunity

### Get Opportunity by ID
- **Endpoint:** `GET /opportunity/:opportunityId`
- **Parameters:**
  - `opportunityId` (path) - UUID of the opportunity
- **Permission:** Salesperson, Admin, Sales Manager
- **Description:** Get specific opportunity details

### Bulk Delete Opportunities
- **Endpoint:** `POST /opportunity/bulk-delete`
- **Permission:** Admin only
- **Request Body:** Bulk delete opportunity schema validation required
- **Description:** Delete multiple opportunities

### Get Opportunities by Account
- **Endpoint:** `POST /opportunity/getAllopportunity/byaccount/:accountID`
- **Parameters:**
  - `accountID` (path) - UUID of the account
- **Permission:** Admin, Sales Manager, Salesperson
- **Description:** Get all opportunities associated with an account

### Get Opportunities by Contact
- **Endpoint:** `POST /opportunity/getAllopportunity/bycontact/:contactID`
- **Parameters:**
  - `contactID` (path) - UUID of the contact
- **Permission:** Admin, Sales Manager, Salesperson
- **Description:** Get all opportunities associated with a contact

---

## User Management

### Get All Users
- **Endpoint:** `GET /users`
- **Parameters:** None
- **Description:** Retrieve all users

### Get Users Subscriptions
- **Endpoint:** `GET /users/getUsersSubscriptions`
- **Parameters:** None
- **Description:** Get all users with their subscription details

### Check if User Onboarded
- **Endpoint:** `POST /users/isUserOnboarded`
- **Parameters:** User identification in request body
- **Description:** Check if a user has completed onboarding

### Check if Invitation Revoked
- **Endpoint:** `POST /users/isInvitationRevoked`
- **Request Body:** Invitation revoked schema validation required
- **Description:** Check if a user invitation has been revoked

### Get User by ID
- **Endpoint:** `GET /users/:userId`
- **Parameters:**
  - `userId` (path) - UUID of the user
- **Description:** Get specific user details

### Update User (Upsert)
- **Endpoint:** `POST /users`
- **Request Body:** User profile data
- **Description:** Update or insert user profile

### Invite User
- **Endpoint:** `POST /users/invite`
- **Request Body:** Invite user schema validation required
- **Description:** Send invitation to a user

### Update Profile
- **Endpoint:** `PUT /users/update/:userId`
- **Parameters:**
  - `userId` (path) - UUID of the user
- **Request Body:** Profile schema validation required
- **Description:** Update user profile

### Add User Role
- **Endpoint:** `POST /users/add-role`
- **Request Body:** Add role to user schema validation required
- **Description:** Add a role to a user

### Remove User Role
- **Endpoint:** `POST /users/remove-role`
- **Request Body:** Delete role schema validation required
- **Description:** Remove a role from a user

### Partially Update User
- **Endpoint:** `PATCH /users/update/:userId`
- **Parameters:**
  - `userId` (path) - UUID of the user
- **Request Body:** Partial user data
- **Description:** Partially update user details

### Get Users by Organization
- **Endpoint:** `GET /users/organization/userslist/:userId`
- **Parameters:**
  - `userId` (path) - UUID of the user to get organization from
- **Description:** Get all users in the same organization

### Add User Details
- **Endpoint:** `POST /users/adduser`
- **Request Body:** User details
- **Description:** Add additional user details

### Update User Role
- **Endpoint:** `POST /users/updateUserRole`
- **Request Body:** Update user role schema validation required
- **Description:** Update a user's role

### Update User Profile
- **Endpoint:** `POST /users/updateUserProfile/:userId`
- **Parameters:**
  - `userId` (path) - UUID of the user
- **Request Body:** Update user profile schema validation required
- **Description:** Update user profile details

---

## Role Management

### Get All Roles
- **Endpoint:** `GET /users/role`
- **Parameters:** None
- **Description:** Retrieve all roles

### Create Role
- **Endpoint:** `POST /users/role`
- **Request Body:** Role schema validation required
- **Description:** Create a new role

### Update Role
- **Endpoint:** `PUT /users/role/:roleId`
- **Parameters:**
  - `roleId` (path) - UUID of the role
- **Request Body:** Role schema validation required
- **Description:** Update role by ID

### Delete Role
- **Endpoint:** `DELETE /users/role/delete-role/:roleId`
- **Parameters:**
  - `roleId` (path) - UUID of the role
- **Description:** Delete a role

---

## Activity Management

### Get All Activities
- **Endpoint:** `GET /activity`
- **Parameters:** None
- **Description:** Retrieve all activities

### Create Activity
- **Endpoint:** `POST /activity`
- **Request Body:** Activity schema validation required
- **Description:** Create a new activity

### Get Activities with Filters
- **Endpoint:** `POST /activity/getActivities`
- **Parameters:** Filter parameters in request body
- **Description:** Get activities with filtering options

### Get Activity by ID
- **Endpoint:** `GET /activity/:activityId`
- **Parameters:**
  - `activityId` (path) - UUID of the activity
- **Description:** Get specific activity details

### Get Activities by Account
- **Endpoint:** `POST /activity/account/:accountId`
- **Parameters:**
  - `accountId` (path) - UUID of the account
- **Description:** Get all activities associated with an account

### Get Activities by Contact
- **Endpoint:** `POST /activity/contact/:contactId`
- **Parameters:**
  - `contactId` (path) - UUID of the contact
- **Description:** Get all activities associated with a contact

### Get Activities by Lead
- **Endpoint:** `POST /activity/lead/:leadId`
- **Parameters:**
  - `leadId` (path) - UUID of the lead
- **Description:** Get all activities associated with a lead

### Get Activities by Opportunity
- **Endpoint:** `POST /activity/opportunity/:opportunityId`
- **Parameters:**
  - `opportunityId` (path) - UUID of the opportunity
- **Description:** Get all activities associated with an opportunity

### Update Activity
- **Endpoint:** `PUT /activity/:activityId`
- **Parameters:**
  - `activityId` (path) - UUID of the activity
- **Request Body:** Activity schema validation required
- **Description:** Update activity by ID

### Delete Activity
- **Endpoint:** `DELETE /activity/delete-activity/:activityId`
- **Parameters:**
  - `activityId` (path) - UUID of the activity
- **Permission:** Admin only
- **Description:** Delete an activity

### Bulk Delete Activities
- **Endpoint:** `POST /activity/bulk-delete`
- **Permission:** Admin only
- **Request Body:** Bulk delete activity schema validation required
- **Description:** Delete multiple activities

---

## Note Management

### Get All Notes Data
- **Endpoint:** `GET /note`
- **Parameters:** None
- **Description:** Retrieve all notes data

### Create Note
- **Endpoint:** `POST /note`
- **Request Body:** Note data
- **Description:** Create a new note

### Get All Notes with Filters
- **Endpoint:** `POST /note/getAllNotes`
- **Parameters:** Filter parameters in request body
- **Description:** Get all notes with filtering options

### Get Note by ID
- **Endpoint:** `GET /note/:noteId`
- **Parameters:**
  - `noteId` (path) - UUID of the note
- **Description:** Get specific note details

### Get Notes by Account
- **Endpoint:** `POST /note/account/:accountId`
- **Parameters:**
  - `accountId` (path) - UUID of the account
- **Description:** Get all notes associated with an account

### Get Notes by Contact
- **Endpoint:** `POST /note/contact/:contactId`
- **Parameters:**
  - `contactId` (path) - UUID of the contact
- **Description:** Get all notes associated with a contact

### Get Notes by Lead
- **Endpoint:** `POST /note/lead/:leadId`
- **Parameters:**
  - `leadId` (path) - UUID of the lead
- **Description:** Get all notes associated with a lead

### Get Notes by Opportunity
- **Endpoint:** `POST /note/opportunity/:opportunityId`
- **Parameters:**
  - `opportunityId` (path) - UUID of the opportunity
- **Description:** Get all notes associated with an opportunity

### Get Notes by Activity
- **Endpoint:** `POST /note/activity/:activityId`
- **Parameters:**
  - `activityId` (path) - UUID of the activity
- **Description:** Get all notes associated with an activity

### Update Note
- **Endpoint:** `PUT /note/:noteId`
- **Parameters:**
  - `noteId` (path) - UUID of the note
- **Request Body:** Note data
- **Description:** Update note by ID

### Bulk Delete Notes
- **Endpoint:** `POST /note/bulk-delete`
- **Permission:** Admin only
- **Request Body:** Array of note IDs to delete
- **Description:** Delete multiple notes

---

## Dashboard

### Get Lead Status Counts
- **Endpoint:** `GET /dashboard/get-status-lead-counts`
- **Parameters:** None
- **Description:** Get count of leads by status

### Get Lead Status Percentage
- **Endpoint:** `GET /dashboard/get-status-lead-percentage`
- **Parameters:** None
- **Description:** Get percentage distribution of leads by status

### Get Qualified Lead Rate
- **Endpoint:** `GET /dashboard/qualified-lead-rate`
- **Parameters:** None
- **Description:** Get the rate of qualified leads

### Get Average Estimated Lead Price
- **Endpoint:** `GET /dashboard/avg-est-lead-price`
- **Parameters:** None
- **Description:** Get average and estimated price of leads

### Get Leads Data
- **Endpoint:** `GET /dashboard/leads`
- **Parameters:** None
- **Description:** Get leads data for dashboard

### Get All Leads Dashboard Data
- **Endpoint:** `POST /dashboard/leads-all`
- **Parameters:** Filter parameters in request body
- **Description:** Get all lead data for dashboard in one API call

### Get All Opportunity Dashboard Data
- **Endpoint:** `POST /dashboard/opportunity-all`
- **Parameters:** Filter parameters in request body
- **Description:** Get all opportunity data for dashboard in one API call

### Get All Activity Dashboard Data
- **Endpoint:** `POST /dashboard/activity-all`
- **Parameters:** Filter parameters in request body
- **Description:** Get all activity data for dashboard in one API call

---

## Case Management

### Get All Cases
- **Endpoint:** `GET /cases`
- **Parameters:** None
- **Description:** Retrieve all cases

### Get Cases with Filters
- **Endpoint:** `POST /cases/filter`
- **Parameters:** Filter parameters in request body
- **Description:** Get cases with complex filtering

### Create Case
- **Endpoint:** `POST /cases`
- **Request Body:** Case schema validation required
- **Description:** Create a new case

### Get Case by ID
- **Endpoint:** `GET /cases/:caseId`
- **Parameters:**
  - `caseId` (path) - UUID of the case
- **Description:** Get specific case details

### Update Case
- **Endpoint:** `PUT /cases/:caseId`
- **Parameters:**
  - `caseId` (path) - UUID of the case
- **Request Body:** Update case schema validation required
- **Description:** Update case by ID

### Partially Update Case
- **Endpoint:** `PATCH /cases/:caseId`
- **Parameters:**
  - `caseId` (path) - UUID of the case
- **Request Body:** Partial case schema validation required
- **Description:** Partially update case details

### Delete Case
- **Endpoint:** `DELETE /cases/:caseId`
- **Parameters:**
  - `caseId` (path) - UUID of the case
- **Description:** Delete a case

### Bulk Delete Cases
- **Endpoint:** `POST /cases/bulk-delete`
- **Request Body:** Array of case IDs to delete
- **Description:** Delete multiple cases

### Assign Technician to Case
- **Endpoint:** `POST /cases/:caseId/assign`
- **Parameters:**
  - `caseId` (path) - UUID of the case
- **Request Body:** Assign technician schema validation required
- **Description:** Assign a technician to a case

### Update Case Status
- **Endpoint:** `PATCH /cases/:caseId/status`
- **Parameters:**
  - `caseId` (path) - UUID of the case
- **Request Body:** Update case status schema validation required
- **Description:** Update the status of a case

### Get Cases by Customer
- **Endpoint:** `GET /cases/customer/:customerId`
- **Parameters:**
  - `customerId` (path) - UUID of the customer
- **Description:** Get all cases for a specific customer

### Get Cases by Technician
- **Endpoint:** `GET /cases/technician/:technicianId`
- **Parameters:**
  - `technicianId` (path) - UUID of the technician
- **Description:** Get all cases assigned to a technician

### Get Case History
- **Endpoint:** `GET /cases/:caseId/history`
- **Parameters:**
  - `caseId` (path) - UUID of the case
- **Description:** Get status history of a case

---

## Plan Management

### Add Plan
- **Endpoint:** `POST /plan/add-plan`
- **Request Body:** Plan schema validation required
- **Description:** Create a new plan

### Get All Plans
- **Endpoint:** `GET /plan/getAllPlans`
- **Parameters:** None
- **Description:** Retrieve all plans

### Get Plan by ID
- **Endpoint:** `GET /plan/get-plan/:planId`
- **Parameters:**
  - `planId` (path) - UUID of the plan
- **Description:** Get specific plan details

### Update Plan
- **Endpoint:** `PUT /plan/update-plan/:planId`
- **Parameters:**
  - `planId` (path) - UUID of the plan
- **Request Body:** Plan schema validation required
- **Description:** Update plan by ID

### Bulk Delete Plans
- **Endpoint:** `POST /plan/bulkDelete`
- **Request Body:** Array of plan IDs to delete
- **Description:** Delete multiple plans

### Delete Plan
- **Endpoint:** `DELETE /plan/delete-plan/:planId`
- **Parameters:**
  - `planId` (path) - UUID of the plan
- **Description:** Delete a plan

---

## Subscription Management

### Create Subscription
- **Endpoint:** `POST /subscription/create-subscription`
- **Request Body:** Create subscription API schema validation required
- **Description:** Create a new subscription

### Verify Subscription
- **Endpoint:** `POST /subscription/verify-subscription`
- **Request Body:** Verify subscription schema validation required
- **Description:** Verify a subscription payment

### Create Subscription by Admin
- **Endpoint:** `POST /subscription/create-subscription-by-admin`
- **Request Body:** Subscription schema validation required
- **Description:** Create subscription as admin

### Get All Subscriptions
- **Endpoint:** `GET /subscription`
- **Parameters:** None
- **Description:** Retrieve all subscriptions

### Get Subscriptions with Plan Type
- **Endpoint:** `GET /subscription/get-plans-subscriptions`
- **Parameters:** None
- **Description:** Get all subscriptions grouped by plan type

### Get User Subscriptions
- **Endpoint:** `GET /subscription/get-user-subscription/:userId`
- **Parameters:**
  - `userId` (path) - UUID of the user
- **Description:** Get all subscriptions for a user

### Get Active Subscription
- **Endpoint:** `GET /subscription/get-active-subscription/:userId`
- **Parameters:**
  - `userId` (path) - UUID of the user
- **Description:** Get user's active subscription

### Cancel Subscription
- **Endpoint:** `PATCH /subscription/cancel-subscription/:subscriptionId`
- **Parameters:**
  - `subscriptionId` (path) - UUID of the subscription
- **Description:** Cancel a subscription

### Bulk Delete Subscriptions
- **Endpoint:** `POST /subscription/bulkDelete`
- **Request Body:** Array of subscription IDs to delete
- **Description:** Delete multiple subscriptions

### Delete Subscription
- **Endpoint:** `DELETE /subscription/delete-subscription/:subscriptionId`
- **Parameters:**
  - `subscriptionId` (path) - UUID of the subscription
- **Description:** Delete a subscription

### Get Statistics for Super Admin
- **Endpoint:** `GET /subscription/getStatisticsDataForSuperAdmin`
- **Parameters:** None
- **Description:** Get subscription statistics for super admin dashboard

### Get Subscription by ID
- **Endpoint:** `GET /subscription/:subscriptionId`
- **Parameters:**
  - `subscriptionId` (path) - UUID of the subscription
- **Description:** Get specific subscription details

### Update Payment Status
- **Endpoint:** `POST /subscription/update-payment-status`
- **Request Body:** Payment status update data
- **Description:** Update subscription payment status

---

## Organization Management

### Create Organization
- **Endpoint:** `POST /organization/create-organization`
- **Request Body:** Organization schema validation required
- **Description:** Create a new organization

### Get Organization by ID
- **Endpoint:** `GET /organization/get-organization/:organizationId`
- **Parameters:**
  - `organizationId` (path) - UUID of the organization
- **Description:** Get specific organization details

### Get All Organizations
- **Endpoint:** `GET /organization/getAllOrganization`
- **Parameters:** None
- **Description:** Retrieve all organizations

### Update Organization
- **Endpoint:** `PUT /organization/update-organization/:organizationId`
- **Parameters:**
  - `organizationId` (path) - UUID of the organization
- **Request Body:** Organization schema validation required
- **Description:** Update organization by ID

### Partially Update Organization
- **Endpoint:** `PATCH /organization/:organizationId`
- **Parameters:**
  - `organizationId` (path) - UUID of the organization
- **Request Body:** Partial organization data
- **Description:** Partially update organization details

### Delete Organization
- **Endpoint:** `DELETE /organization/delete-organization/:organizationId`
- **Parameters:**
  - `organizationId` (path) - UUID of the organization
- **Permission:** Admin only
- **Description:** Delete an organization

---

## Referral Management

### Get All Referrals
- **Endpoint:** `GET /refer`
- **Parameters:** None
- **Description:** Retrieve all referrals

### Create Referral
- **Endpoint:** `POST /refer/create-refer`
- **Request Body:** Refer schema validation required
- **Description:** Create a new referral

### Update Referral
- **Endpoint:** `PUT /refer/update-refer/:referId`
- **Parameters:**
  - `referId` (path) - UUID of the referral
- **Request Body:** Refer schema validation required
- **Description:** Update referral by ID

### Get All Referrals with Filters
- **Endpoint:** `POST /refer/getAllRefer`
- **Parameters:** Filter parameters in request body
- **Description:** Get all referrals with filtering options

### Get Referral by ID
- **Endpoint:** `GET /refer/:referId`
- **Parameters:**
  - `referId` (path) - UUID of the referral
- **Description:** Get specific referral details

### Bulk Delete Referrals
- **Endpoint:** `POST /refer/bulk-delete/`
- **Permission:** Admin only
- **Request Body:** Array of referral IDs to delete
- **Description:** Delete multiple referrals

---

## Calendar Management

### Get All Appointments
- **Endpoint:** `GET /calender`
- **Parameters:** None
- **Description:** Retrieve all calendar appointments

### Create Appointment
- **Endpoint:** `POST /calender/create-calender`
- **Request Body:** Calendar schema validation required
- **Description:** Create a new calendar appointment

### Update Appointment
- **Endpoint:** `PUT /calender/update-calender/:appointmentId`
- **Parameters:**
  - `appointmentId` (path) - UUID of the appointment
- **Request Body:** Calendar schema validation required
- **Description:** Update appointment by ID

### Delete Appointment
- **Endpoint:** `DELETE /calender/delete-calender/:appointmentId`
- **Parameters:**
  - `appointmentId` (path) - UUID of the appointment
- **Description:** Delete an appointment

### Get Appointments
- **Endpoint:** `GET /calender/getAppointments`
- **Parameters:** None
- **Description:** Get appointments (with potential filtering)

### Get Users by Organization
- **Endpoint:** `GET /calender/users/`
- **Parameters:** Organization ID from authenticated user context
- **Description:** Get all users in the organization for calendar

### Get Appointment by ID
- **Endpoint:** `GET /calender/:appointmentId`
- **Parameters:**
  - `appointmentId` (path) - UUID of the appointment
- **Description:** Get specific appointment details

---

## Services

### Get Signed URL
- **Endpoint:** `POST /services/get-signed-url`
- **Request Body:** Get signed URL schema validation required
- **Description:** Get a signed URL for file upload/download

---

## Document Upload (Admin)

### Create Upload Session
- **Endpoint:** `POST /upload-session`
- **Permission:** Admin, Sales Manager
- **Request Body:** Upload session data
- **Description:** Create a new upload session for an opportunity

### Get Upload Session Details
- **Endpoint:** `GET /upload-session/:uploadSessionId`
- **Parameters:**
  - `uploadSessionId` (path) - UUID of the upload session
- **Permission:** Admin, Sales Manager
- **Description:** Get details of a specific upload session

### Get Opportunity Sessions
- **Endpoint:** `GET /upload-session/opportunity/:opportunityId`
- **Parameters:**
  - `opportunityId` (path) - UUID of the opportunity
- **Permission:** Admin, Sales Manager
- **Description:** Get all upload sessions for an opportunity

### Delete Upload Session
- **Endpoint:** `DELETE /upload-session/:uploadSessionId`
- **Parameters:**
  - `uploadSessionId` (path) - UUID of the upload session
- **Permission:** Admin, Sales Manager
- **Description:** Delete an upload session and its requirements

### Create Requirement
- **Endpoint:** `POST /upload-session/:uploadSessionId/requirement`
- **Parameters:**
  - `uploadSessionId` (path) - UUID of the upload session
- **Permission:** Admin, Sales Manager
- **Request Body:**
  - `documentName` (string) - Name of the document
  - `documentType` (string) - Type of document
  - `description` (string, optional) - Document description
  - `isRequired` (boolean) - Whether document is required
  - `allowedFileTypes` (array) - List of allowed file types
  - `maxFileSize` (number) - Maximum file size in bytes
  - `displayOrder` (number, optional) - Display order
- **Description:** Create a document requirement for upload session

### Get Opportunity Requirements
- **Endpoint:** `GET /upload-session/opportunity/:opportunityId/requirements`
- **Parameters:**
  - `opportunityId` (path) - UUID of the opportunity
- **Permission:** Admin, Sales Manager
- **Description:** Get all document requirements for an opportunity

### Update Requirement
- **Endpoint:** `PUT /upload-session/requirement/:requirementId`
- **Parameters:**
  - `requirementId` (path) - UUID of the requirement
- **Permission:** Admin, Sales Manager
- **Request Body:** Same as create requirement
- **Description:** Update a document requirement

### Delete Requirement
- **Endpoint:** `DELETE /upload-session/requirement/:requirementId`
- **Parameters:**
  - `requirementId` (path) - UUID of the requirement
- **Permission:** Admin, Sales Manager
- **Description:** Delete a document requirement

### Get Opportunity Uploads
- **Endpoint:** `GET /upload-session/uploads/:opportunityId`
- **Parameters:**
  - `opportunityId` (path) - UUID of the opportunity
- **Permission:** Admin, Sales Manager
- **Description:** Get all uploaded documents for an opportunity

---

## Document Upload (Public)

### Get Upload Session (Public)
- **Endpoint:** `GET /public/upload/:sessionToken`
- **Parameters:**
  - `sessionToken` (path) - Session token for authentication
- **Description:** Get session details and requirements using public token

### Initialize Upload
- **Endpoint:** `POST /public/upload/:sessionToken/init`
- **Parameters:**
  - `sessionToken` (path) - Session token for authentication
- **Request Body:**
  - `requirementId` (string) - UUID of the requirement
  - `fileName` (string) - Name of the file
  - `fileSize` (number) - Size of the file in bytes
  - `mimeType` (string) - MIME type of the file
  - `totalChunks` (number) - Total number of chunks
- **Description:** Initialize a document upload

### Upload Chunk
- **Endpoint:** `POST /public/upload/:sessionToken/chunk`
- **Parameters:**
  - `sessionToken` (path) - Session token for authentication
- **Request Body:** Multipart form data
  - `file` (file) - Chunk file
  - `uploadId` (string) - UUID of the upload
  - `chunkIndex` (number) - Index of the chunk (0-based)
  - `chunkHash` (string) - Hash of the chunk for verification
- **Description:** Upload a file chunk

### Get Upload Progress
- **Endpoint:** `GET /public/upload/:sessionToken/progress/:uploadId`
- **Parameters:**
  - `sessionToken` (path) - Session token for authentication
  - `uploadId` (path) - UUID of the upload
- **Description:** Get upload progress for a specific upload

### Get Uploaded Chunks
- **Endpoint:** `GET /public/upload/:sessionToken/chunks/:uploadId`
- **Parameters:**
  - `sessionToken` (path) - Session token for authentication
  - `uploadId` (path) - UUID of the upload
- **Description:** Get list of uploaded chunks for resume functionality

---

## Document Management

### Get Documents
- **Endpoint:** `GET /documents`
- **Permission:** Admin, Sales Manager
- **Query Parameters:**
  - `opportunityId` (optional) - Filter by opportunity
  - `sessionId` (optional) - Filter by session
  - `status` (optional) - Filter by status
- **Description:** Get all uploaded documents with filters

### Delete Document
- **Endpoint:** `DELETE /documents/:uploadId`
- **Parameters:**
  - `uploadId` (path) - UUID of the upload
- **Permission:** Admin, Sales Manager
- **Description:** Delete a single uploaded document

### Bulk Delete Documents
- **Endpoint:** `POST /documents/bulk-delete`
- **Permission:** Admin, Sales Manager
- **Request Body:** Array of upload IDs to delete
- **Description:** Delete multiple uploaded documents

---

## Common Response Format

All API responses follow this general format:

```json
{
  "success": true/false,
  "message": "Description of the result",
  "data": {}, // Response data
  "code": 200 // HTTP status code
}
```

## Authentication

Most endpoints require JWT authentication via Firebase. Include the authentication token in the request header:

```
Authorization: Bearer <firebase-id-token>
```

## Permissions

The following role names are used throughout the API:
- `ADMIN` - Full administrative access
- `SALESMANAGER` - Sales management access
- `SALESPERSON` - Sales person access
- `SUPERADMIN` - Super admin access (for multi-tenant features)

---

## Notes

- All IDs are UUIDs (RFC 4122 compliant)
- File uploads use multipart/form-data encoding
- Date/time values follow ISO 8601 format
- Bulk operations return count of affected records
- Related view endpoints allow fetching associated data across entities
