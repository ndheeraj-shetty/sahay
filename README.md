# SAHAY
## The Household Life-Admin OS

**One trusted system for every Indian family's documents, daily responsibilities, health, savings and important decisions.**



# 1. ABOUT SAHAY

SAHAY is an AI-powered household life-management platform designed primarily for Indian families.

It provides one centralized, secure and intelligent platform where families can manage important documents, understand financial obligations, organize daily responsibilities, maintain health records, plan savings goals and access family information through an AI assistant.

Indian households manage essential information across multiple disconnected platforms:

- Important documents stored in physical files and different digital locations.
- Bills and EMIs tracked through messages and memory.
- Medical reports and prescriptions scattered across hospitals and phones.
- Document expiry dates and insurance renewals frequently overlooked.
- Family savings goals managed without structured tracking.
- Important information difficult to access during emergencies.

SAHAY addresses these problems by connecting essential household information into one integrated system.

Instead of simply storing information, SAHAY understands it and converts it into useful actions, reminders, insights and decisions.

### Vision

Every Indian family should have one trusted place that remembers what matters, warns them before problems become expensive, and helps them act in their own language.

### One-Line Pitch

SAHAY is a private household operating system that organizes family documents, manages daily obligations, protects health information, tracks savings goals and provides an intelligent assistant for household decisions.

---

# 2. THE PROBLEM WE SOLVE

### 2.1 Fragmented Family Documents

Important documents such as Aadhaar, PAN, insurance policies, prescriptions, certificates and property documents are scattered across physical files, phones and cloud storage.

### 2.2 Unorganized Household Responsibilities

Families manage electricity bills, EMIs, insurance renewals, school fees, medicine refills and other recurring obligations through different applications and manual reminders.

### 2.3 Disconnected Health Information

Medical history, prescriptions, allergies, vaccinations and lab reports are difficult to organize and retrieve when needed.

### 2.4 Lack of Structured Family Savings

Families have multiple financial goals but lack a centralized way to assign contributors, track savings and monitor progress.

### 2.5 Lack of Contextual Assistance

Traditional applications store information but do not understand how documents, bills, health records and family goals relate to one another.

### Core Problem

Indian households need a secure, permission-controlled system that connects their important information and helps them take timely action without losing control of their personal data.

---

# 3. SAHAY — SEVEN CORE MODULES

SAHAY is built around seven interconnected modules.

| No. | Module | Core Responsibility |
|---|---|---|
| 1 | Family Vault | Secure family document management |
| 2 | Document Doctor | Document intelligence and obligation detection |
| 3 | Sahay Daily | Unified household timeline and financial tracking |
| 4 | Health Shield | Family health records and emergency access |
| 5 | Lakshya Goal Vaults | Family savings and goal management |
| 6 | Sahay AI Assistant | Conversational household intelligence |
| 7 | Sahay Shield | Security, privacy and trust infrastructure |

These modules share data through a common backend and communicate through controlled APIs.

---

# 4. CORE MODULE SPECIFICATIONS

## 4.1 FAMILY VAULT

### Secure Document Management for the Entire Family

**Core promise:**

"Your family's important documents — securely stored, organized, searchable and accessible only with the right permission."

Family Vault is SAHAY's centralized document storage system.

It allows families to upload, organize, search, access and temporarily share important documents while maintaining individual ownership and permissions.

### Supported Document Categories

**Identity Documents**
- Aadhaar Card
- PAN Card
- Voter ID
- Passport
- Driving Licence
- Ration Card
- Birth Certificate
- Marriage Certificate

**Financial Documents**
- Insurance Policies
- Loan Statements
- Bank Statements
- Credit Card Statements
- Tax Documents
- Investment Statements
- Property Tax Receipts

**Health Documents**
- Prescriptions
- Lab Reports
- Hospital Discharge Summaries
- Vaccination Records
- Medical History
- Medical Insurance Documents

**Education Documents**
- School ID
- Report Cards
- Fee Receipts
- Admit Cards
- Marksheets
- Certificates

**Household Documents**
- Electricity Bills
- Water Bills
- Gas Bills
- Rent Agreements
- Property Papers
- Maintenance Receipts
- Vehicle Registration Certificates
- Vehicle Insurance
- Warranty Cards

**Other Documents**
- Emergency Contact Documents
- Legal Documents
- Custom Documents

### Main Capabilities

1. Document upload through camera, gallery and file picker.
2. PDF and image document support.
3. Link documents to individual family members.
4. Organize documents by category, person and tags.
5. Search by document type, title, issuer, date and keywords.
6. Automatically identify document expiry dates through Document Doctor.
7. Request access to another family member's document.
8. Approve or reject document access requests.
9. Share documents temporarily with hospitals, schools, agents and trusted parties.
10. Maintain document version history.
11. Maintain complete access and activity history.
12. Secure document deletion and export.

### Document Upload Workflow

```text
User selects document
        |
        v
File validation
        |
        v
Select document type
        |
        v
Link family member
        |
        v
Add title, tags and details
        |
        v
Client-side encryption
        |
        v
Upload encrypted document
        |
        v
Store metadata
        |
        v
Send processing job to Document Doctor
        |
        v
Extracted information returned
        |
        v
User verifies information
        |
        v
Document available in Family Vault
```

### Family Document Access

Family Vault uses role-based and document-level permissions.

Supported roles:

- Owner
- Adult Member
- Elder Member
- Caregiver/Helper
- Child

A family member cannot automatically access another adult member's private documents.

Access requires owner approval, previously granted permissions or an applicable guardian relationship.

Temporary access grants must have an expiry time and must be revocable.

### Security

- AES-256-GCM encryption.
- Per-document Data Encryption Keys.
- Envelope encryption using DEK and KEK.
- Private S3-compatible object storage.
- Short-lived presigned URLs.
- File integrity verification using SHA-256.
- Document-level access control.
- Consent management.
- Audit logging.

**Relationship with Document Doctor:** Family Vault stores and manages documents. Document Doctor understands their contents.

---

## 4.2 DOCUMENT DOCTOR

### AI-Powered Document and Financial Intelligence Engine

**Core promise:**

"SAHAY reads your documents and payment alerts, understands what is due, tracks it automatically and reminds you before it becomes a problem."

Document Doctor is the intelligence engine responsible for understanding uploaded documents and detecting household financial obligations.

It converts unstructured information into structured, verified household records.

### Four Main Responsibilities

1. Document understanding.
2. Bill and EMI detection.
3. Recurring obligation detection.
4. Payment-status identification.

### Supported Inputs

**Manual Document Upload**
- PDF
- JPG/JPEG
- PNG
- HEIC
- Scanned documents
- Screenshots

**Financial SMS Alerts**

With explicit user permission, the system can process relevant financial SMS events.

Examples:

- Bank debit alerts.
- UPI payment notifications.
- EMI debit notifications.
- Credit card bill alerts.
- Insurance premium notifications.
- Bill payment confirmations.
- AutoPay pre-debit notifications.

Personal SMS and OTP information must not be collected as general financial records. SMS parsing should happen on-device where supported, with only necessary structured events sent to the backend.

**Email Bill Detection**

With explicit permission, SAHAY can process selected financial emails.

Examples:

- Electricity bills.
- Gas bills.
- Water bills.
- Mobile and broadband bills.
- Insurance premium notices.
- Loan statements.
- School fee invoices.
- Subscription renewals.

**Manual Entry**

Users can manually add obligations when automatic detection is unavailable.

### Document Understanding Pipeline

```text
Document Upload
       |
       v
File Validation
       |
       v
Image / PDF Preprocessing
       |
       v
OCR / Text Extraction
       |
       v
Document Classification
       |
       v
Select Extraction Schema
       |
       v
LLM Structured Extraction
       |
       v
Rule-Based Validation
       |
       v
Confidence Scoring
       |
       v
PII Masking
       |
       v
User Verification
       |
       v
Store Structured Information
       |
       v
Create / Update Household Records
```

### Example: Electricity Bill

A user uploads an electricity bill.

Document Doctor extracts:

- Electricity provider.
- Consumer number.
- Bill period.
- Amount due.
- Due date.
- Late payment date.

After validation and user confirmation:

1. An obligation is created.
2. The obligation appears in Sahay Daily.
3. A reminder is generated.
4. The bill becomes part of the household financial timeline.

### Example: EMI Detection

A user receives:

"Your EMI of Rs.18500 for loan HL-88213 has been debited."

Document Doctor:

1. Detects a financial SMS event.
2. Extracts the EMI amount and payment date.
3. Identifies the relevant loan obligation.
4. Checks for duplicate payment events.
5. Updates the payment status when sufficient evidence exists.
6. Calculates the next expected EMI date.
7. Updates Sahay Daily.

If the EMI does not already exist, SAHAY asks the user whether to track it as a recurring obligation.

### Recurring Obligation Intelligence

Document Doctor identifies recurring patterns from:

- Electricity bills.
- Loan EMIs.
- Insurance premiums.
- Subscription payments.
- School fees.
- Other household obligations.

It can update existing obligations when new bills arrive instead of creating duplicates.

### Extraction Reliability

The LLM must:

- Return structured JSON.
- Follow predefined schemas.
- Return null for missing fields.
- Never guess missing information.
- Provide evidence from the source document.
- Provide field-level confidence scores.
- Request user verification for uncertain information.

### Relationship with Sahay Daily

Document Doctor identifies and extracts information. Sahay Daily manages the resulting obligations, reminders and payment status.

---

## 4.3 SAHAY DAILY

### One Live Timeline for Every Household Responsibility

**Core promise:**

"Sahay Daily is your family's single live timeline for bills, EMIs, renewals, health tasks and goal contributions — so nothing important is missed."

Sahay Daily combines the functionality of the previously separate Life Radar, Life Calendar and Money Guard modules.

It is the central operational dashboard of SAHAY.

### What Sahay Daily Tracks

**Financial Obligations**
- Electricity bills.
- Water bills.
- Gas bills.
- Rent.
- EMIs.
- Insurance premiums.
- School fees.
- Credit card bills.
- Subscriptions.
- Property tax.

**Health Responsibilities**
- Medicine refills.
- Vaccinations.
- Doctor visits.
- Health checkups.

**Document Responsibilities**
- Insurance expiry.
- Driving licence renewal.
- Passport expiry.
- Vehicle insurance renewal.
- Warranty expiration.

**Savings Responsibilities**
- Monthly goal contributions.
- Emergency fund contributions.
- Child education contributions.
- Elder-care contributions.

**Household Tasks**
- Important family activities.
- Assigned responsibilities.
- Recurring household tasks.

### Three Main Views

Sahay Daily has three views that use the same underlying household obligations.

#### A. Today View

Shows everything requiring attention now.

Priority categories:

- Critical.
- Due Today.
- Due Soon.
- Upcoming.
- Completed.
- Snoozed.

Example:

```text
SAHAY DAILY — SHARMA HOUSEHOLD

TODAY

CRITICAL
Father's health insurance expires soon.
Premium: ₹18,500

DUE SOON
MSEB Electricity Bill
Amount: ₹1,450
Due: 5 November

UPCOMING
Aarav's School Fee
Amount: ₹12,000
Due: 10 November

HEALTH
Kamla Devi's medicine refill
Due: 7 November

GOAL CONTRIBUTION
Aarav Future Vault
Contribution: ₹5,000

[View Full Timeline]
[Ask Sahay]
```

#### B. Calendar View

Displays household obligations by date.

Example:

```text
NOVEMBER

5 Nov  Electricity Bill       ₹1,450
7 Nov  Home Loan EMI          ₹18,500
7 Nov  Medicine Refill        Assigned to Sunita
10 Nov School Fee             ₹12,000
15 Nov Insurance Premium      ₹18,500
```

Calendar filters:

- Bills.
- EMIs.
- Insurance.
- School.
- Health.
- Goals.
- Documents.
- Household tasks.
- Family member.

Users can open an event to view details, mark it complete or paid, and snooze it.

#### C. Money View

Shows expected household cash flow.

Information includes:

- Expected monthly income.
- Expected obligations.
- Paid obligations.
- Overdue obligations.
- Planned savings contributions.
- Projected balance.
- Category-wise financial breakdown.
- Cash-flow risk warnings.

Example:

```text
NOVEMBER MONEY VIEW

Expected Income:        ₹85,000
Expected Obligations:   ₹40,450
Expected Savings:       ₹16,500

Projected Balance:      ₹28,050

Upcoming Payments:

Electricity             ₹1,450
Home Loan EMI           ₹18,500
School Fee              ₹12,000
Insurance               ₹18,500
Goal Contributions      ₹16,500
```

Financial projections must be based on available, user-provided or verified data. They are estimates, not guarantees.

### Obligation Engine

The backend obligation engine manages:

- Obligation creation.
- Due-date calculation.
- Recurrence.
- Assignment to family members.
- Priority calculation.
- Payment status.
- Reminder scheduling.
- Snoozing.
- Completion.
- Duplicate detection.
- Next-cycle prediction.

### Example Workflow

```text
Electricity Bill Uploaded
          |
          v
Document Doctor Extracts Details
          |
          v
User Verifies Information
          |
          v
Sahay Daily Creates Obligation
          |
          v
Reminder Generated
          |
          v
User Pays Bill
          |
          v
Payment Event Detected
          |
          v
Payment Status Updated
          |
          v
Next Due Date Predicted
```

### Notifications

Notifications can be generated for:

- Upcoming payments.
- Overdue obligations.
- Insurance renewals.
- Medicine refills.
- Document expiry.
- Goal contributions.
- Important household tasks.

### Important Design Principle

**Detect once, track automatically.**

The same obligation must appear consistently in Today, Calendar and Money views.

Sahay Daily does not include Scam Shield or scam-message alerts.

---

## 4.4 HEALTH SHIELD

### One Secure Health System for the Entire Family

**Core promise:**

"Every family member's health information is secure, organized and ready when it matters most."

Health Shield maintains a centralized health profile for every family member.

It has two operating modes.

### Mode 1: Everyday Health

Used for everyday health information management.

Information includes:

- Blood group.
- Height and weight.
- Chronic medical conditions.
- Past surgeries.
- Known allergies.
- Current medicines.
- Past medicines.
- Vaccination history.
- Medical reports.
- Prescriptions.
- Doctor information.
- Preferred hospital.
- Insurance details.
- Emergency contacts.

### Prescription Processing

1. User uploads a prescription.
2. Document Doctor performs OCR.
3. AI extracts patient and doctor details.
4. Medicines, dosage, frequency and duration are extracted.
5. User reviews the information.
6. Confirmed medicines are added to Health Shield.
7. Medicine-end dates are calculated where sufficient information exists.
8. Medicine-refill reminders are generated in Sahay Daily.

### Lab Report Processing

1. User uploads a lab report.
2. Document Doctor extracts report information.
3. Test date, report type and relevant values are identified.
4. User verifies extracted information.
5. Report is stored in the member's health history.
6. Authorized users can view or temporarily share the report.

### Mode 2: Emergency Mode

Emergency Mode provides immediate access to critical health information.

It displays:

1. Patient name and age.
2. Blood group.
3. Life-threatening allergies.
4. Critical medical conditions.
5. Current medicines.
6. Emergency contacts.
7. Preferred doctor or hospital.
8. Insurance information.
9. Important medical documents.
10. Optional location-sharing action.

### Emergency Workflow

```text
User Activates Emergency Mode
             |
             v
Verify Authorized Access
             |
             v
Retrieve Critical Health Information
             |
             v
Display Emergency Health Card
             |
             v
Optional Emergency Sharing
             |
             v
Time-Limited Access
             |
             v
Record Access in Audit Logs
             |
             v
Access Automatically Expires
```

### Emergency Sharing

- Emergency information can be shared with a hospital or trusted recipient.
- Sharing must be explicit.
- Access must be time-limited.
- Access must be revocable.
- Location sharing requires separate user consent.
- Sensitive actions must be audited.

### Important Medical Safety Rule

Health Shield organizes medical information. It does not diagnose diseases, prescribe medicines or replace doctors.

AI-generated health explanations must not be presented as professional medical diagnoses.

---

## 4.5 LAKSHYA GOAL VAULTS

### Family Savings and Future Planning

**Core promise:**

"Lakshya turns family dreams into clear, trackable savings goals."

Lakshya is the household's savings-goal management system.

It helps families create goals, assign contributors, track contributions, calculate savings requirements, monitor progress and understand whether goals are on track.

It is not a bank account, investment platform or payment processor.

### Supported Goal Categories

**Child Goals**
- Education.
- Higher Education.
- Study Abroad.
- Marriage.
- First Vehicle.
- Custom Child Goal.

**Family Goals**
- Emergency Fund.
- Medical Emergency Fund.
- Home Down Payment.
- Home Renovation.
- Vehicle Purchase.
- Travel.
- Festival Expenses.
- Wedding.
- Custom Family Goal.

**Elder-Care Goals**
- Elder Medical Fund.
- Elder-Care Fund.
- Retirement Support.
- Custom Elder-Care Goal.

**Protection Goals**
- Emergency Fund.
- Insurance Premium Fund.
- Document Renewal Fund.
- Custom Protection Goal.

### Goal Creation Workflow

```text
Select Goal Category
        |
        v
Enter Goal Details
        |
        v
Select Beneficiary
        |
        v
Set Target Amount
        |
        v
Set Target Date
        |
        v
Assign Contributors
        |
        v
Set Contribution Schedule
        |
        v
Calculate Savings Plan
        |
        v
Confirm Goal
        |
        v
Create Lakshya Vault
        |
        v
Generate Sahay Daily Reminders
```

### Goal Information

Every goal stores:

- Goal name.
- Goal category.
- Beneficiary.
- Target amount.
- Target date.
- Current saved amount.
- Required monthly contribution.
- Contributors.
- Contribution schedule.
- Contribution history.
- Withdrawals.
- Risk level.
- Milestones.
- Linked documents.
- Notes.

### Contribution Tracking

Supported contribution types:

1. Monthly contribution.
2. One-time contribution.
3. Festival or bonus contribution.
4. Gift contribution.
5. Manual contribution.
6. Simulated auto-save contribution.

After a contribution is recorded, SAHAY updates:

- Current savings.
- Progress percentage.
- Remaining amount.
- Contribution history.
- Next contribution date.

### Goal Calculations

Progress percentage:

```text
Progress = (Current Savings / Target Amount) × 100
```

Required monthly savings:

```text
Required Monthly Savings =
(Target Amount - Current Savings) / Remaining Months
```

Goal status is calculated using actual contributions, expected contributions and remaining time.

### Goal Status

- Active.
- On Track.
- At Risk.
- Behind.
- Paused.
- Completed.
- Withdrawn.
- Cancelled.

### Goal Risk Detection

Lakshya monitors:

- Missed contributions.
- Reduced contribution amounts.
- Progress shortfalls.
- Approaching target dates.
- Emergency withdrawals.
- Changes in contribution schedules.

When a goal falls behind, SAHAY can suggest:

- Increasing monthly contributions.
- Extending the target date.
- Reducing the target amount.
- Adding a one-time contribution.

These are planning suggestions, not investment recommendations.

### Multiple Family Contributors

Multiple family members can contribute to the same goal.

Roles include:

- Goal Owner.
- Contributor.
- Viewer.
- Beneficiary.

The goal owner can view the full contribution history, while other roles receive access according to their permissions.

### Auto-Save

MVP functionality:

- Recurring contribution schedules.
- Contribution reminders.
- Manual contribution confirmation.
- Contribution tracking.
- Progress updates.

Future functionality:

- Authorized UPI AutoPay integration through a payment partner.
- Mandate tracking.
- Pause and cancellation workflows.

**MVP restriction:** SAHAY does not automatically debit bank accounts or execute real UPI transactions.

---

## 4.6 SAHAY AI ASSISTANT

### The Conversational Intelligence of SAHAY

**Core promise:**

"Ask Sahay anything about your family's documents, bills, health, goals and deadlines. Sahay understands your household and helps you take the next right action."

Sahay AI Assistant is the conversational interface connecting the other modules.

It allows users to interact with their household information through natural language.

### Main Capabilities

1. Answer questions about family documents.
2. Summarize insurance policies and bills.
3. Explain document expiry dates.
4. Retrieve upcoming financial obligations.
5. Explain payment history.
6. Summarize health information.
7. Retrieve verified medicine and allergy information.
8. Analyze savings-goal progress.
9. Suggest actions for upcoming obligations.
10. Help users create Lakshya Goal Vaults.
11. Explain uploaded documents.
12. Translate information into supported languages.
13. Generate household action plans.
14. Answer only using information the requester is authorized to access.

### Example Interactions

**Document Query**

User:

"When does Dad's insurance expire?"

Sahay:

"Rajesh Sharma's health insurance policy expires on 15 November 2026. The premium is ₹18,500. Source: Insurance policy uploaded on 12 October."

**Financial Query**

User:

"Mujhe is month kya kya payments karne hain?"

Sahay:

"This month you have four upcoming obligations:

- Electricity bill: ₹1,450.
- Home loan EMI: ₹18,500.
- School fees: ₹12,000.
- Insurance premium: ₹18,500.

Your total expected obligations are ₹50,450."

**Health Query**

User:

"Mom ko kis medicine se allergy hai?"

Sahay:

"Kamla Devi's verified Health Shield profile lists Penicillin as an allergy."

**Goal Creation**

User:

"Aarav ki engineering education ke liye 12 lakh chahiye 2034 tak. Hum monthly 8,000 save karna chahte hain."

Sahay:

"I can create a Child Education Goal Vault for Aarav.

Target: ₹12,00,000.

Target date: April 2034.

Monthly contribution: ₹8,000.

Would you like me to create this goal?"

The goal is created only after the user confirms.

### AI Architecture: Permission-Aware RAG

The assistant uses Retrieval-Augmented Generation.

```text
User Question
      |
      v
Language Detection
      |
      v
Intent Classification
      |
      v
Authentication
      |
      v
Household and Role Verification
      |
      v
Document / Record Permission Check
      |
      v
Consent and Access Expiry Check
      |
      v
Retrieve Authorized Information
      |
      v
PII Masking
      |
      v
Context Construction
      |
      v
LLM Processing
      |
      v
Grounded Answer with Sources
      |
      v
Action Proposal
      |
      v
User Confirmation
      |
      v
Authorized Tool Execution
      |
      v
Audit Logging
```

### Connected Data Sources

| SAHAY Module | Information Available |
|---|---|
| Family Vault | Document metadata, ownership and expiry information |
| Document Doctor | OCR results, extracted fields and verified financial events |
| Sahay Daily | Obligations, due dates, reminders and payment status |
| Health Shield | Medical profiles, medicines, allergies and reports |
| Lakshya | Goals, contributors, contributions and progress |
| Household Infrastructure | Family members, roles and permissions |

### AI Security Rules

- The LLM never directly connects to PostgreSQL.
- The LLM never receives unrestricted object-storage access.
- Only authorized data is retrieved.
- Sensitive identifiers are masked.
- Answers must be grounded in available records.
- Important answers must contain source references.
- Document contents are treated as untrusted data, not instructions.
- The assistant cannot automatically share private documents.
- Sensitive actions require user confirmation.
- The assistant cannot automatically move money.
- Private household data must not be used for public model training.

### Future Capabilities

- Voice-based interactions.
- Hindi and regional language support.
- Voice input and output.
- Contextual household recommendations.
- Advanced multi-step AI workflows.

---

## 4.7 SAHAY SHIELD

### The Security and Trust Infrastructure of SAHAY

**Core promise:**

"Sahay Shield protects every family's private information with encryption, permissions, consent and a complete audit trail."

Sahay Shield is not a separate user-facing business module.

It is the underlying security architecture that protects every SAHAY module.

It manages data protection across the complete information lifecycle:

```text
Data Collection
      |
      v
Encryption
      |
      v
Secure Storage
      |
      v
Authorized Access
      |
      v
Controlled Processing
      |
      v
Secure Sharing
      |
      v
Retention and Deletion
```

### Core Security Components

1. Authentication and session security.
2. Household-level isolation.
3. Role-Based Access Control.
4. Document-Level Access Control.
5. Consent management.
6. Encryption and key management.
7. Private document storage.
8. Secure temporary sharing.
9. PII masking.
10. Audit logging.
11. Security event and anomaly monitoring.
12. Data retention and deletion.
13. Data export.
14. Breach alerting.
15. Security dashboard and activity monitoring.

### Authentication Security

- Argon2id password hashing.
- Short-lived access tokens.
- Rotating refresh tokens.
- Session revocation.
- Device-level session management.
- Rate limiting.
- OTP verification where supported.
- Optional biometric application lock.

### Household Isolation

Every API request must be scoped to the authenticated user's household.

Users must never access another household's:

- Documents.
- Health profiles.
- Financial obligations.
- Savings goals.
- Private conversations.

### Role-Based Access

Supported roles:

- Owner.
- Adult Member.
- Elder Member.
- Caregiver/Helper.
- Child.

Permissions are checked on the backend for every sensitive operation.

### Document-Level Access

Each document maintains its own permissions.

Supported access types:

- View Only.
- View and Download.
- Verify Only.
- Temporary Share.
- Permanent Family Access.

Access must be purpose-specific, time-limited where applicable, and revocable.

### Consent Management

SAHAY records purpose-specific consent for:

- Document processing.
- OCR and AI extraction.
- Financial SMS processing.
- Email bill processing.
- Health data processing.
- Emergency information sharing.
- Location sharing.
- AI Assistant processing.
- Data sharing.

Users must be able to withdraw consent.

### Encryption

- AES-256-GCM.
- Per-document DEKs.
- Envelope encryption.
- KMS/Vault-managed KEKs.
- TLS 1.3 for network communication.
- Private S3-compatible storage.
- Encrypted backups.

### Audit Logging

Sensitive actions must be recorded.

Examples:

- Document upload.
- Document view.
- Document download.
- Access request.
- Access approval.
- Access revocation.
- Health record access.
- Goal contribution.
- Goal withdrawal.
- AI document retrieval.
- Permission changes.
- Data export.
- Account deletion.

### Data Protection

- Data minimization.
- Purpose limitation.
- User-controlled sharing.
- Secure deletion.
- Data export.
- Backup retention policies.
- Breach monitoring.

**Important:** Sahay Shield protects the other six modules. It is not a scam-detection feature.

---

# 5. HOW THE SEVEN MODULES WORK TOGETHER

SAHAY is not seven disconnected applications.

Each module has a defined responsibility and shares information through controlled backend services.

### Example: Insurance Policy Workflow

```text
1. FAMILY VAULT

User uploads insurance policy.
        |
        v
2. DOCUMENT DOCTOR

Extracts provider, policy details,
premium and expiry date.
        |
        v
User verifies extracted information.
        |
        v
3. SAHAY DAILY

Creates renewal obligation.
Displays deadline and reminders.
        |
        v
4. HEALTH SHIELD

Uses relevant insurance information
for emergency health access.
        |
        v
5. LAKSHYA

Can support a dedicated insurance
premium savings goal.
        |
        v
6. SAHAY AI ASSISTANT

Answers questions about the policy,
due date and related household records.
        |
        v
7. SAHAY SHIELD

Protects the document, permissions,
processing, access and audit history.
```

### Example: Prescription Workflow

```text
Family Vault
     |
     v
Document Doctor
     |
     v
OCR + Medicine Extraction
     |
     v
User Verification
     |
     v
Health Shield
     |
     v
Medicine Profile Updated
     |
     v
Sahay Daily
     |
     v
Medicine Refill Reminder
     |
     v
Sahay AI Assistant
```

### Example: Family Education Goal

```text
User Talks to Sahay AI
         |
         v
Goal Details Extracted
         |
         v
User Confirms
         |
         v
Lakshya Creates Goal Vault
         |
         v
Contributors Assigned
         |
         v
Sahay Daily Creates Reminders
         |
         v
Contributions Tracked
         |
         v
AI Provides Goal Insights
         |
         v
Sahay Shield Protects Records
```

---

# 6. MVP SCOPE

The MVP is the first functional version of SAHAY.

It must demonstrate that all seven modules can work together without requiring real banking or payment integrations.

### MVP Feature Scope

| Module | MVP Requirements |
|---|---|
| Family Vault | Upload, organize, search, secure retrieval and basic sharing |
| Document Doctor | OCR, classification, structured extraction, expiry detection and simulated financial event processing |
| Sahay Daily | Today, Calendar, Money, obligations and reminders |
| Health Shield | Family health profiles, prescriptions, reports and Emergency Mode |
| Lakshya | Goal creation, contributors, manual contributions, progress and reminders |
| AI Assistant | Permission-aware RAG, document Q&A, household queries and confirmed actions |
| Sahay Shield | Authentication security, encryption, permissions, consent and audit logs |

### MVP Integrations

The initial MVP can use:

- PostgreSQL.
- Local MinIO object storage.
- Tesseract OCR.
- An external LLM API where needed.
- Simulated financial SMS events.
- Simulated payment confirmations.
- Local background processing.
- Mock notification delivery.

### Explicitly Out of Scope

- Scam Shield.
- Real bank account integration.
- Actual UPI payment initiation.
- Automatic real-money debits.
- Guaranteed government benefit eligibility.
- Medical diagnosis.
- Investment advice.
- Tax advisory.
- Unauthorized family access.
- Training public AI models using private family data.

---

# 7. TECHNICAL STACK

## 7.1 Frontend

| Technology | Responsibility |
|---|---|
| React | UI development |
| TypeScript | Type safety |
| Vite | Frontend development and builds |
| Tailwind CSS | Styling |
| shadcn/ui | Reusable UI components |
| React Router | Navigation |
| TanStack Query | Server-state management |
| Axios | API communication |
| Recharts | Dashboard charts |
| Lucide Icons | Interface icons |
| Web Speech API | Browser voice capabilities |

## 7.2 Backend

| Technology | Responsibility |
|---|---|
| Python 3.12 | Backend programming |
| FastAPI | REST API framework |
| SQLAlchemy 2.0 | ORM |
| PostgreSQL | Relational database |
| pgvector | Vector similarity search |
| Alembic | Database migrations |
| Pydantic v2 | Validation |
| Redis | Caching and task support |
| Celery | Background jobs |
| Pytest | Backend testing |

## 7.3 AI and Document Processing

| Technology | Responsibility |
|---|---|
| Tesseract OCR | Open-source OCR |
| Google Document AI / AWS Textract | Optional advanced OCR |
| LLM APIs | Structured extraction and conversational AI |
| Sentence Transformers | Embeddings |
| Multilingual Embeddings | Regional-language retrieval |
| pgvector | Vector storage |
| PostgreSQL Full-Text Search | Keyword retrieval |
| Presidio | PII detection and masking |
| Indic ASR/TTS | Future multilingual voice support |

## 7.4 Infrastructure and DevOps

| Technology | Responsibility |
|---|---|
| Docker | Containerization |
| Docker Compose | Local infrastructure |
| MinIO / AWS S3 | Document storage |
| AWS KMS / Vault | Key management |
| Firebase Cloud Messaging | Push notifications |
| Git | Version control |
| GitHub | Source-code hosting |
| GitHub Actions | CI/CD |
| Prometheus | Monitoring |
| Grafana | Metrics visualization |
| Sentry | Error tracking |

The stack is the target architecture. Dependencies and external services will be introduced only when required by the corresponding development phase.

---

# 8. SYSTEM ARCHITECTURE

SAHAY follows a modular client-server architecture.

```text
                   SAHAY CLIENT
                         |
                         v
              React + TypeScript + Vite
                         |
                         v
                  HTTPS / REST API
                         |
                         v
                  FASTAPI BACKEND
                         |
                         v
            AUTHENTICATION + SAHAY SHIELD
                         |
             +-----------+-----------+
             |           |           |
             v           v           v
         FAMILY      DOCUMENT     HOUSEHOLD
          VAULT       DOCTOR       SERVICES
             |           |
             |           v
             |      OCR / LLM
             |      EXTRACTION
             |           |
             +-----------+
                         |
             +-----------+-----------+
             |           |           |
             v           v           v
        SAHAY DAILY  HEALTH SHIELD  LAKSHYA
             |           |           |
             +-----------+-----------+
                         |
                         v
                 SAHAY AI ASSISTANT
                         |
                         v
             PERMISSION-AWARE RETRIEVAL
                         |
              +----------+----------+
              |                     |
              v                     v
         PostgreSQL              pgvector
              |
       +------+------+
       |             |
       v             v
    Redis          MinIO / S3
       |
       v
     Celery
  Background Jobs
```

### Architectural Principles

1. Frontend communicates with backend through versioned REST APIs.
2. Backend owns business logic and access control.
3. PostgreSQL stores structured information.
4. Object storage holds encrypted documents.
5. Redis and Celery handle background tasks.
6. AI receives only authorized and necessary context.
7. Sahay Shield enforces security across all modules.
8. Sensitive actions require explicit authorization.
9. Modules remain independently organized and testable.

---

# 9. DATABASE ARCHITECTURE

PostgreSQL is the primary relational database.

The database will be designed incrementally as modules are implemented.

### Core Infrastructure Tables

- users
- households
- household_members
- sessions
- invitations

### Family Vault Tables

- documents
- document_versions
- document_requests
- document_access_grants
- document_chunks

### Document Doctor Tables

- document_processing_jobs
- extracted_document_fields
- financial_events
- processing_results

### Sahay Daily Tables

- obligations
- obligation_events
- reminders
- notification_preferences

### Health Shield Tables

- health_profiles
- medical_conditions
- allergies
- medicines
- vaccinations
- health_reports
- emergency_contacts
- emergency_shares

### Lakshya Tables

- goal_vaults
- goal_contributors
- goal_contributions
- goal_withdrawals
- goal_milestones

### AI Assistant Tables

- ai_conversations
- ai_messages
- ai_retrieval_logs
- ai_action_requests

### Sahay Shield Tables

- consents
- audit_logs
- document_access_logs
- security_events
- data_export_requests
- deletion_requests

The exact schema, relationships, constraints and indexes will be finalized during the implementation of each module.

---

# 10. API ARCHITECTURE

SAHAY uses versioned REST APIs.

Base URL:

`/api/v1`

### Authentication and Household

```text
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me

POST   /households
GET    /households/current
POST   /households/invite
GET    /households/members
PATCH  /households/members/:id
```

### Family Vault

```text
POST   /documents/upload-url
POST   /documents/upload-complete
GET    /documents
GET    /documents/:id
PATCH  /documents/:id
DELETE /documents/:id

POST   /documents/:id/request-access
POST   /documents/:id/approve-request
POST   /documents/:id/decline-request
POST   /documents/:id/revoke-access
GET    /documents/:id/audit
```

### Document Doctor

```text
POST   /document-doctor/process
GET    /document-doctor/jobs/:id
GET    /document-doctor/results/:id
POST   /document-doctor/verify
POST   /document-doctor/financial-event
```

### Sahay Daily

```text
POST   /sahay-daily/obligations
GET    /sahay-daily/obligations
GET    /sahay-daily/today
GET    /sahay-daily/calendar
GET    /sahay-daily/money

PATCH  /sahay-daily/obligations/:id
POST   /sahay-daily/obligations/:id/mark-paid
POST   /sahay-daily/obligations/:id/snooze
GET    /sahay-daily/obligations/upcoming
```

### Health Shield

```text
POST   /health-profiles
GET    /health-profiles
GET    /health-profiles/:id
PATCH  /health-profiles/:id

POST   /health-profiles/:id/medicines
POST   /health-profiles/:id/vaccinations
GET    /health-profiles/:id/emergency-card

POST   /health/emergency-shares
POST   /health/emergency-shares/:id/revoke
```

### Lakshya

```text
POST   /lakshya/goals
GET    /lakshya/goals
GET    /lakshya/goals/:id
PATCH  /lakshya/goals/:id
DELETE /lakshya/goals/:id

POST   /lakshya/goals/:id/contributions
GET    /lakshya/goals/:id/contributions

POST   /lakshya/goals/:id/withdrawals
GET    /lakshya/goals/:id/milestones
POST   /lakshya/goals/:id/contributors
```

### Sahay AI Assistant

```text
POST   /ai/chat
GET    /ai/conversations
GET    /ai/conversations/:id
POST   /ai/actions/confirm
POST   /ai/document-insights
POST   /ai/voice-query
```

### Sahay Shield

```text
GET    /security/activity
GET    /security/audit-logs
GET    /security/sessions

POST   /security/consents
GET    /security/consents
POST   /security/consents/:id/withdraw

POST   /security/export
POST   /security/deletion-request
GET    /security/events
```

These are planned API contracts. Request schemas, response structures and authorization rules will be defined during implementation.

---

# 11. DEVELOPMENT ROADMAP

SAHAY will be developed in nine phases.

| Phase | Description |
|---|---|
| Phase 0 | Planning and environment setup |
| Phase 1 | Application foundation |
| Phase 2 | Authentication and household infrastructure |
| Phase 3 | Family Vault and Document Doctor |
| Phase 4 | Sahay Daily |
| Phase 5 | Health Shield |
| Phase 6 | Lakshya Goal Vaults |
| Phase 7 | Sahay AI Assistant |
| Phase 8 | Sahay Shield security hardening and integration |
| Phase 9 | Complete testing, deployment and final demonstration |

### Development Methodology

Every phase follows:

1. Requirement analysis.
2. Architecture design.
3. Database design.
4. Backend implementation.
5. Frontend implementation.
6. Integration.
7. Testing.
8. Documentation.
9. Git commit and verification.

A phase is complete only after its functionality has been tested.

---

# 12. PROJECT DIRECTORY STRUCTURE

The intended repository structure is:

```text
SAHAY/
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       ├── features/
│       │   ├── family-vault/
│       │   ├── document-doctor/
│       │   ├── sahay-daily/
│       │   ├── health-shield/
│       │   ├── lakshya/
│       │   ├── ai-assistant/
│       │   └── security/
│       ├── hooks/
│       ├── services/
│       ├── lib/
│       ├── types/
│       ├── App.tsx
│       └── main.tsx
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       └── router.py
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── workers/
│   │   ├── utils/
│   │   └── main.py
│   │
│   ├── alembic/
│   ├── tests/
│   └── requirements.txt
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   └── development/
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

The repository can evolve as the implementation grows. New folders must have a clear responsibility.

---

# 13. DEVELOPMENT ENVIRONMENT

### Initial Development Setup

- Operating system: Windows.
- Editor: VS Code or Cursor.
- Frontend: Vite development server.
- Backend: FastAPI with Uvicorn.
- Database: PostgreSQL through Docker Compose.
- Object storage: MinIO for local development.
- Version control: Git.
- Remote repository: GitHub.

### Environment Variables

The application uses environment variables for configuration.

Example:

```env
APP_ENV=development
APP_NAME=SAHAY
APP_VERSION=1.0.0

DATABASE_URL=
REDIS_URL=

FRONTEND_URL=
BACKEND_CORS_ORIGINS=

OPENAI_API_KEY=
GEMINI_API_KEY=

S3_ENDPOINT=
S3_BUCKET_NAME=
S3_ACCESS_KEY=
S3_SECRET_KEY=

KMS_KEY_REFERENCE=
```

Only configure integrations when they are actually required.

Never commit real credentials or API keys.

---

# 14. DEMONSTRATION HOUSEHOLD

For testing and demonstrations, SAHAY will use a fictional Sharma household.

| Member | Age | Role |
|---|---:|---|
| Rajesh | 45 | Owner |
| Sunita | 41 | Adult Member |
| Aarav | 14 | Child |
| Kamla Devi | 70 | Elder Member |

### Sample Documents

- Rajesh's health insurance policy.
- Electricity bill.
- Aarav's school fee receipt.
- Vaccination record.
- Kamla Devi's prescription.
- Vehicle insurance.

### Sample Financial Obligations

| Obligation | Amount |
|---|---:|
| Home Loan EMI | ₹18,500 |
| Electricity Bill | ₹1,450 |
| School Fees | ₹12,000 |
| Insurance Premium | ₹18,500 |

### Sample Lakshya Goals

- Aarav Education Fund.
- Household Emergency Fund.
- Elder Medical Fund.
- Vehicle Purchase Fund.

All demonstration records must use fictional data.

---

# 15. COMPLETE MVP DEMONSTRATION WORKFLOW

The final MVP demonstration will follow this sequence.

1. Create a household and register family members.
2. Open Family Vault.
3. Upload an insurance policy.
4. Show secure document storage.
5. Run Document Doctor.
6. Show OCR, document classification and structured extraction.
7. Verify extracted insurance details.
8. Show the insurance obligation in Sahay Daily.
9. Open Today view.
10. Open Calendar view.
11. Open Money view.
12. Simulate an electricity bill or EMI notification.
13. Show the payment event being processed.
14. Show the obligation being updated.
15. Open Health Shield.
16. Display a family member's health profile.
17. Upload and process a prescription.
18. Open Emergency Mode.
19. Create a Lakshya education goal.
20. Assign family contributors.
21. Add a contribution.
22. Show goal progress and reminders.
23. Ask Sahay AI about an insurance policy or upcoming bills.
24. Demonstrate permission-aware retrieval.
25. Request a document action through AI and confirm it.
26. Open Sahay Shield activity and audit logs.

### Final Pitch

"SAHAY does not just store your family's information. It understands the documents, responsibilities, health records and goals that shape your family's life — and helps you take the right action at the right time."

---

# 16. NON-FUNCTIONAL REQUIREMENTS

The intended engineering targets are:

| Requirement | Target |
|---|---|
| Standard API response | Under 500 ms |
| AI response | Under 5 seconds |
| OCR processing | Under 30 seconds |
| Availability | 99.5% |
| Supported initial languages | Hindi and English |
| Maximum file size | 10 MB |
| Concurrent users target | 1,000 |
| Backup frequency | Daily encrypted backups |
| Recovery Time Objective | Under 4 hours |
| Recovery Point Objective | Under 24 hours |
| Audit retention | At least 1 year |

These are target requirements, not claims about the current implementation. They must be validated through performance and reliability testing.

---

# 17. DEPLOYMENT STRATEGY

### Development

- Frontend: Local Vite server.
- Backend: Local FastAPI server.
- Database: Docker PostgreSQL.
- Storage: MinIO.
- Background tasks: Redis and Celery.
- Version control: GitHub.

### Production Possibilities

- Frontend: Vercel or Cloudflare.
- Backend: AWS or another cloud provider.
- Database: Managed PostgreSQL.
- Object Storage: AWS S3.
- Key Management: AWS KMS or Vault.
- Background Processing: Redis and Celery.
- Notifications: Firebase Cloud Messaging.
- Monitoring: Prometheus, Grafana and Sentry.

Final infrastructure selection will happen after the MVP works locally.

---

# 18. BUSINESS MODEL

### Free Plan

- Up to 20 documents.
- Basic reminders.
- Emergency Health Card.
- Up to 2 family members.
- One Lakshya goal vault.

### Premium Plan

- Unlimited documents.
- Unlimited family members.
- Advanced document intelligence.
- Advanced household reminders.
- Extended health and financial management.
- Multiple Lakshya vaults.
- Advanced goal forecasting.
- Security dashboard.

### Potential Partnerships

- Insurance distribution with explicit consent.
- Document assistance.
- Employer and housing-society plans.
- Healthcare partnerships.
- Government and NGO partnerships.

**Business principle: SAHAY will not sell private household data.**

---

# 19. DEVELOPMENT RULES FOR AI CODING ASSISTANTS

Any AI coding assistant working on SAHAY must follow these rules.

1. Read this README before modifying the repository.
2. Understand the existing architecture before creating new files.
3. Follow the defined technology stack unless a change is approved.
4. Work only on the currently assigned development phase.
5. Do not implement future modules prematurely.
6. Maintain modular frontend and backend architecture.
7. Use TypeScript and Pydantic validation.
8. Keep all secrets in environment variables.
9. Never commit real personal information.
10. Enforce authorization on the backend.
11. Never provide unrestricted database access to an LLM.
12. Do not fabricate working functionality.
13. Write tests for implemented features.
14. Update documentation when architecture changes.
15. Avoid unnecessary packages and abstractions.
16. Preserve existing working functionality.
17. Use synthetic data during development.
18. Ask for clarification before making major architectural changes.
19. Never remove an existing feature without explicit approval.
20. Verify functionality before declaring a phase complete.

### Permanent Scope Decisions

- SAHAY has seven core modules.
- Scam Shield has been removed permanently.
- Sahay Daily has Today, Calendar and Money views.
- Sahay Shield is an underlying security layer.
- Real bank integration is excluded from the MVP.
- Actual UPI debits are excluded from the MVP.
- AI actions require appropriate authorization and confirmation.
- Health information is not used for medical diagnosis.
- Government eligibility is indicative, not guaranteed.
- Private household data is not used for public model training.

---

# 20. SUCCESS CRITERIA

The SAHAY MVP is successful when a family can:

- Create a household.
- Add family members with appropriate roles.
- Upload and securely manage documents.
- Search and retrieve authorized documents.
- Extract and verify information using Document Doctor.
- Detect recurring financial obligations.
- Track bills and EMIs through Sahay Daily.
- View household responsibilities through Today, Calendar and Money.
- Maintain individual health records.
- Access critical health information during emergencies.
- Create and manage family savings goals.
- Assign multiple contributors.
- Track savings progress and risks.
- Ask questions through Sahay AI Assistant.
- Receive answers grounded in authorized household information.
- Execute confirmed AI-assisted actions.
- Review sensitive activity through Sahay Shield.

---

# 21. FUTURE VISION

SAHAY is designed to evolve into a comprehensive household operating system.

Potential future capabilities:

- Dedicated Android application.
- WhatsApp-based household notifications.
- Hindi and regional-language voice assistant.
- DigiLocker integration.
- Gmail integration.
- Account Aggregator integration.
- Authorized UPI AutoPay integration.
- Hospital and insurance partnerships.
- Offline-first capabilities.
- Advanced household financial forecasting.

The long-term objective is to create a trusted digital platform for Indian household management.

---

# FINAL STATEMENT

**DigiLocker stores documents. SAHAY understands a family's life around them and helps them act before it is too late.**

SAHAY brings documents, daily responsibilities, health information, savings goals and intelligent assistance into one secure household operating system.

*Project: SAHAY — The Household Life-Admin OS*  
*Primary Market: India*  
*Platform: Mobile-First Web Application / PWA*  
*Architecture: Modular, Secure and AI-Powered*  
*Product Modules: Seven*  
*Development Approach: Incremental MVP Development*