# SAHAY — Phase 3: Family Vault & Document Doctor

## Overview
Phase 3 implements the document infrastructure and intelligent extraction core for **SAHAY: The Household Life-Admin OS**, combining:
1. **Family Vault:** Centralized, encrypted family document repository with file integrity and role/document-level permission controls.
2. **Document Doctor:** AI-powered document intelligence and obligation detection engine that extracts structured fields (amounts, due dates, consumer numbers, policy numbers) and enables user-confirmed verification.

---

## Deliverables Completed

### 1. Database Architecture & Models
- **`documents`**: Household document records, file metadata, category enum (`identity`, `financial`, `health`, `education`, `household`, `other`), SHA-256 integrity hash, access level (`private`, `shared_adults`, `household`), target family member link, issuer, expiry date, tags.
- **`document_versions`**: Maintains version history and file change hashes.
- **`document_requests`**: Workflow for family members requesting access to a private document.
- **`document_access_grants`**: Time-limited revocable access grants (e.g. 30 days) approved by the document owner.
- **`document_processing_jobs`**: Job tracking for Document Doctor processing runs, OCR text, document classification, and confidence scoring.
- **`extracted_document_fields`**: Extracted field name, field value, confidence score (0.0-1.0), source evidence snippet, PII masking flag, and user confirmed value.

### 2. Document Doctor Intelligence Engine (`backend/app/services/document_doctor.py`)
- **Automated Text Extraction:** Uses `pypdf` for clean, high-speed PDF text stream extraction.
- **Document Classification:**
  - `electricity_bill`: MSEB/Mahadiscom, BESCOM, Tata Power, Adani Electricity, BSES.
  - `gas_bill` / `water_bill`: MGL, IGL, Municipal Water Boards.
  - `insurance_policy`: LIC, Star Health, HDFC ERGO, ICICI Lombard.
  - `loan_statement` / `emi`: Home loan, auto loan, personal loan statements.
  - `aadhaar_card` / `pan_card`: Indian national identity recognition with regex validation.
  - `prescription`: Clinic consultations, Doctor names, medicine schedules (OD/BD).
- **Structured Field Extraction:**
  - Biller name, consumer / account number, amount due, due date, billing cycle.
  - Policy number, sum insured, premium amount, renewal expiry date.
  - Doctor name, prescription date, medications prescribed.
- **PII Masking:** Automatic masking for Aadhaar (`XXXX-XXXX-1234`) and PAN numbers.
- **Financial SMS Event Parser:** Parses debit and EMI notification texts (e.g. `"Your EMI of Rs.18,500 for loan HL-88213 has been debited on 05-Nov-2026"`).

### 3. API Endpoints (`/api/v1`)
#### Family Vault
- `POST /api/v1/documents/upload`: Multipart upload with title, category, member, access level. Saves file with SHA-256 hash and immediately triggers Document Doctor extraction.
- `GET /api/v1/documents`: List household documents with search, category filtering, and permission enforcement.
- `GET /api/v1/documents/{id}`: Document detail with owner, target member, and permissions.
- `GET /api/v1/documents/{id}/download`: Streams original file if authorized.
- `PATCH /api/v1/documents/{id}`: Update title, category, expiry date, tags.
- `DELETE /api/v1/documents/{id}`: Delete document and files from storage.
- `POST /api/v1/documents/{id}/request-access`: Request access to private document.
- `POST /api/v1/documents/{id}/approve-request/{req_id}`: Owner approves request with 30-day grant.

#### Document Doctor
- `POST /api/v1/document-doctor/process/{id}`: Trigger processing run.
- `GET /api/v1/document-doctor/results/{id}`: Retrieve extracted fields, evidence, and confidence scores.
- `POST /api/v1/document-doctor/verify/{id}`: User confirms or edits extracted fields; marks document as verified.
- `POST /api/v1/document-doctor/financial-event`: Parses financial SMS alert text.

### 4. Frontend UI Components
- **`FamilyVaultView`:**
  - Category filter pills (`Household & Bills`, `Financial & Insurance`, `Identity & KYC`, `Health & Medical`, `Education`).
  - Target family member filter and live keyword search.
  - Document cards with category icons, verification status pills, expiry warnings, SHA-256 integrity tag, and Download / Verify / Delete actions.
- **`UploadDocumentModal`:**
  - Drag-and-drop file upload.
  - **Instant Test Sample Documents:** 1-click test presets for *MSEB Electricity Bill*, *LIC Insurance Policy*, *Aadhaar Card*, and *Clinic Prescription*.
- **`DocumentVerificationModal`:**
  - Interactive side-by-side verification screen.
  - Overall confidence score indicator (e.g. `96% Confidence`).
  - Field-by-field values with inline edit inputs and source evidence snippets.
  - PII Masking indicators.
  - "Track as Household Obligation in Sahay Daily" toggle ready for Phase 4.
- **`DocumentDoctorView`:**
  - Pipeline architecture walkthrough.
  - **Financial SMS & Alert Workbench:** Live sandbox to test bank SMS alerts and see instant structured JSON parsing.
  - Recent processed documents table with direct verification triggers.

---

## Testing & Verification
- Pytest suite: **7 out of 7 tests passed** in **4.71s** ([`backend/tests/test_vault_and_doctor.py`](file:///c:/Users/ndhee/Sahay/backend/tests/test_vault_and_doctor.py)).
- Vite production build: Verified passing with **0 errors** in **8.40s**.
