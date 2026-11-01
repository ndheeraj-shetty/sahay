# Phase 7: Sahay AI Assistant Implementation

## 1. Overview
Phase 7 introduces the conversational intelligence core for SAHAY — The Household Life-Admin OS. The Sahay AI Assistant provides grounded, permission-aware context retrieval across all household modules, answers family queries with verified citations, and supports structured action proposals that require user confirmation before executing.

## 2. Key Architecture & Features

### 2.1 Permission-Aware Context Retrieval (RAG)
- **Role-Enforced Ingestion:**
  - Owner / Adult: Ingests documents with `HOUSEHOLD`, `SHARED_ADULTS`, and own `PRIVATE` documents.
  - Caregiver / Elder / Child: Ingests documents with `HOUSEHOLD`, and own `PRIVATE` documents only. Never leaks another member's private documents or sensitive adult papers.
- **Cross-Module Context Aggregation:**
  - **Family Vault**: Document metadata, classifications, and user-confirmed OCR fields.
  - **Sahay Daily**: Upcoming and pending bills, due dates, amounts, and statuses.
  - **Health Shield**: Blood groups, active conditions, allergies, and scheduled medications.
  - **Lakshya Goals**: Active savings goals, target vs. current amounts, and run-rate statuses.

### 2.2 Verified Source Citations
- Every AI response inspects retrieved records and generates structured `AICitation` badges:
  - Document citations (`source_type: "document"`, document title and OCR field summaries).
  - Bill citations (`source_type: "obligation"`, amount, due date, status).
  - Health citations (`source_type: "health"`, blood group, allergies, medications).
  - Savings citations (`source_type: "goal"`, saved vs. target amount, status).

### 2.3 Confirmed Actions Architecture
- The AI Assistant **never** mutates database state without explicit user consent.
- Action intents detected:
  - `create_obligation`: Extracts bill title, amount, due date, and category.
  - `mark_paid`: Detects paid bill statements and maps to existing pending obligations.
  - `add_goal_contribution`: Formats savings deposits to targeted Lakshya vaults.
  - `add_allergy`: Records allergy alerts to member health profiles.
  - `add_medicine`: Adds active medication regimens.
- Action proposals are stored in `ai_action_requests` with status `pending`.
- Confirmation endpoint (`POST /api/v1/ai/actions/confirm`) executes the database mutation only when `confirmed=True`, updating the action status to `executed`.

## 3. Database Models & Schema
- `AIConversation`: Household & user-scoped conversation threads.
- `AIMessage`: Messages with role (`user` | `assistant`), markdown content, and serialized citations.
- `AIActionRequest`: Proposed mutation payload, confirmation prompt, and execution lifecycle status.
- `AIRetrievalLog`: Ingestion audit log for security, transparency, and query tracing.

## 4. API Endpoints
- `POST /api/v1/ai/chat` — Context retrieval, citation extraction, grounded response generation, and optional action proposal.
- `GET /api/v1/ai/conversations` — Lists past conversations for user.
- `GET /api/v1/ai/conversations/{id}` — Full trajectory retrieval with citations and action states.
- `DELETE /api/v1/ai/conversations/{id}` — Conversation deletion.
- `POST /api/v1/ai/actions/confirm` — Confirms and executes or dismisses proposed actions.

## 5. UI Implementation
- `SahayAIAssistantView.tsx`:
  - Conversation history sidebar with new chat and delete controls.
  - Responsive conversation stream with verified source citation pills.
  - Highlighted Action Proposal Cards with one-click "Confirm & Execute" and "Dismiss" buttons.
  - Indian household quick prompt chips for upcoming bills, family health, and savings goals.
- Integrated into `AppLayout` and routes under `/assistant`.

## 6. Verification
- 4 comprehensive backend tests passing in `backend/tests/test_ai_assistant.py`:
  - `test_ai_chat_and_citations`
  - `test_ai_action_proposal_and_confirmation`
  - `test_ai_action_rejection`
  - `test_conversations_listing_and_deletion`
- 19/19 total backend tests passing across Phases 1–7.
- Frontend production build verified (`tsc -b && vite build` clean).
