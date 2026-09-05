# Telegram Lottery Management Platform
## Product Requirements and Technical Specification for AI Coding Agent

**Document Type:** Product + System Requirements Specification  
**Primary Interface:** Telegram Bot  
**Secondary Interface:** Web Admin Dashboard  
**Backend:** Central API + Database  
**Maximum Tickets Per Lottery Event:** 5,000  

> Important: This specification is intended for development of a lawful, licensed lottery/raffle operation. Before enabling real-money participation, the operator should confirm applicable age, lottery/gaming, payment, tax, privacy, and consumer-protection requirements. The system should support configurable age/eligibility checks and should never encourage underage participation.

---

# 1. Product Overview

Build a lottery management platform where users can:

1. Start a Telegram bot.
2. Choose their preferred language.
3. Register with their name and phone number.
4. View currently active lottery events.
5. Select a lottery event.
6. View **only currently available and unreserved lottery numbers**.
7. Reserve one available number.
8. Receive a 15-minute payment window.
9. Submit a payment screenshot.
10. Have the payment reference extracted from the screenshot.
11. Verify the transaction using the configured payment-verification service.
12. Check that:
   - the payment exists,
   - the amount is correct,
   - the receiver is correct,
   - the transaction is successful,
   - the reference has not been used before.
13. Issue the lottery ticket after successful verification.
14. Store the customer, payment, ticket, and lottery information.
15. Allow the customer to view purchased tickets from the bot.
16. Allow admins to manage lotteries, payments, users, manual sales, walk-ins, winners, broadcasts, and reports from a web dashboard.

The platform must use **one central database and backend** for both Telegram and the admin dashboard so that ticket numbers cannot be double-sold.

---

# 2. Core System Components

The platform should contain the following components:

## 2.1 Telegram Bot

Used by customers for:

- onboarding,
- language selection,
- registration,
- browsing lotteries,
- selecting numbers,
- reserving numbers,
- submitting payment proof,
- checking payment status,
- viewing tickets,
- viewing results,
- receiving announcements,
- receiving winner notifications.

## 2.2 Backend API

Responsible for:

- authentication,
- users,
- lotteries,
- ticket availability,
- reservations,
- payments,
- payment verification,
- notifications,
- admin actions,
- winner selection,
- reports,
- auditing.

## 2.3 Database

A centralized relational database should be the source of truth.

Recommended:

- PostgreSQL
- Supabase PostgreSQL is acceptable.

## 2.4 Admin Dashboard

A web application for:

- event management,
- participant management,
- ticket management,
- payment management,
- manual registrations,
- walk-in registrations,
- winner management,
- broadcasts,
- exports,
- audit logs,
- settings.

## 2.5 Payment Verification Engine

Responsible for:

- reading payment screenshots,
- extracting payment information,
- checking the payment against an authorized transaction-verification source where available,
- detecting reused references,
- returning a verification result.

## 2.6 Notification Service

Responsible for:

- bot messages,
- channel posts,
- group posts,
- payment notifications,
- event announcements,
- reminders,
- results.

## 2.7 Public Ticket Availability View

Optional but recommended.

A lightweight page that shows:

- lottery information,
- total tickets,
- sold tickets,
- remaining tickets,
- only available ticket numbers.

This page must never display participant names or phone numbers.

---

# 3. User Roles

The system should support the following participant sources.

## 3.1 Telegram User

A participant who registers and purchases through the Telegram bot.

Source value:

`BOT`

## 3.2 Manual User

A participant who contacts an admin outside the bot.

The admin enters the participant information manually.

Source value:

`MANUAL`

## 3.3 Walk-In User

A customer who physically visits the operator.

The admin registers the customer through the dashboard.

Source value:

`WALK_IN`

All three participant types must use the same central ticket inventory.

---

# 4. Admin Roles

Recommended roles:

## SUPER_ADMIN

Can:

- manage everything,
- manage admins,
- change system settings,
- reopen events,
- approve sensitive actions.

## ADMIN

Can:

- manage lotteries,
- users,
- tickets,
- payments,
- manual sales,
- winners,
- reports.

## PAYMENT_REVIEWER

Can:

- review submitted payments,
- approve or reject payments.

## SALES_OPERATOR

Can:

- create manual reservations,
- register walk-in users,
- view ticket availability.

Permissions should be configurable later.

---

# 5. Telegram User Flow

## 5.1 Start

User sends:

`/start`

Bot shows:

- welcome message,
- language selection.

Example:

- English
- Amharic

Store selected language in the user's profile.

---

# 6. Registration

Collect:

- Telegram user ID automatically,
- Telegram username automatically if available,
- full name,
- phone number,
- selected language.

Prefer Telegram's native **Share Contact** button for phone collection.

Fields:

```text
telegram_user_id
telegram_username
full_name
phone_number
language
created_at
updated_at
status
```

After registration, show the main menu.

---

# 7. Main Telegram Menu

Recommended options:

- Active Lotteries
- My Tickets
- Results
- Help
- Language
- My Profile

---

# 8. Lottery Event Model & Multiple Concurrent Events

The platform supports **multiple concurrent active lottery events** running simultaneously. Each event is completely independent and has its own:

- title (e.g., "iPhone 17 Pro Lottery", "Bajaj / Motorcycle Lottery"),
- prize item / category,
- event image / banner,
- description and terms,
- **distinct ticket price** (e.g., 500 ETB for iPhone 17 vs 2,500 ETB for Motorcycle),
- total number of tickets (up to 5,000 tickets per event),
- starting ticket number (default 1) and ending ticket number (default 5,000),
- independent ticket number inventory (ticket #29 in Event A is completely separate from ticket #29 in Event B),
- sale start date/time,
- sale end date/time,
- draw date/time,
- payment account/provider (e.g., CBE, Telebirr),
- **receiver_account_number** (e.g., "1000234567890" for CBE or "0911223344" for Telebirr),
- **receiver_name** (e.g., "Abebe Trading Enterprise" or "Dagim Tilahun"),
- winner message,
- Telegram channel & group links,
- event status (`DRAFT`, `SCHEDULED`, `OPEN`, `SALES_CLOSED`, etc.).

### Example of Concurrent Events:

```text
Event A:
  Title: iPhone 17 Pro Lottery
  Ticket Price: 500 ETB
  Numbers: 1 - 5000
  Status: OPEN

Event B:
  Title: Motorcycle / Bajaj Lottery
  Ticket Price: 2,500 ETB
  Numbers: 1 - 5000
  Status: OPEN
```

When a participant selects an event in Telegram or on the web, they are presented with that event's specific price, payment details, and available number pool.

---

# 9. Lottery Event Statuses

Use the following states:

```text
DRAFT
SCHEDULED
OPEN
SALES_CLOSED
DRAW_PENDING
WINNER_SELECTED
COMPLETED
ARCHIVED
```

Only events with status `OPEN` may accept new reservations.

---

# 10. Ticket Number States

Every ticket number should have exactly one current state.

Recommended statuses:

```text
AVAILABLE
RESERVED
PAYMENT_SUBMITTED
VERIFYING
MANUAL_REVIEW
ISSUED
EXPIRED
CANCELLED
WINNER
```

---

# 11. CRITICAL RULE: Reserved Numbers Must Disappear

This is a mandatory feature.

## Requirement

As soon as a ticket number becomes:

```text
RESERVED
```

it must immediately disappear from all customer-facing available-number lists.

Customers must see **only numbers whose current status is `AVAILABLE`**.

This applies to:

- Telegram bot,
- public availability page,
- available-number API,
- manual customer selection screen,
- walk-in selection screen.

Admins may still see reserved numbers in the admin ticket grid, but they must be clearly marked as reserved.

## Example

Before reservation:

```text
Available:
25
26
27
28
29
30
31
```

User reserves `29`.

Immediately after successful reservation:

```text
Available:
25
26
27
28
30
31
```

Number `29` must not appear as available to any other user.

If the reservation expires and there is no submitted payment, the system changes:

```text
29: RESERVED -> EXPIRED -> AVAILABLE
```

Then number `29` becomes visible again.

If payment is submitted before expiration:

```text
RESERVED -> PAYMENT_SUBMITTED
```

the number must remain hidden.

---

# 12. Concurrency Protection

This is one of the most important backend requirements.

Two customers must never reserve the same number.

Ticket reservation must be performed using a database transaction or atomic operation.

Pseudo-flow:

```text
BEGIN TRANSACTION

Check ticket status.

IF status != AVAILABLE
    reject request

ELSE
    set status = RESERVED
    create reservation
    set reservation expiration time

COMMIT
```

The operation must be atomic.

A database lock, transaction, or equivalent safe method should be used.

Do not rely only on the UI to prevent double reservations.

---

# 13. Ticket Database Constraint

Enforce:

```text
UNIQUE(event_id, ticket_number)
```

There must never be two ticket records with the same number inside the same lottery event.

---

# 14. Selecting Lottery Numbers

Do not display all 5,000 numbers in one Telegram message.

Recommended user experience:

```text
1-100
101-200
201-300
...
4901-5000
```

After selecting a range, show only available numbers.

Alternative actions:

- Search Number
- Random Available Number

Example:

User searches:

```text
29
```

If available:

```text
Number 29 is available.
[Reserve #29]
```

If unavailable:

```text
Number 29 is currently unavailable.
Please select another number.
```

Do not reveal whether it is reserved, verifying, or sold unless the product owner chooses to show that distinction.

---

# 15. Reservation System

When a customer selects a number:

1. Atomically confirm that it is still available.
2. Create reservation.
3. Set ticket state to `RESERVED`.
4. Hide it from available-number views.
5. Start a 15-minute reservation.
6. Send payment instructions.

Store:

```text
reservation_id
event_id
ticket_id
user_id
reserved_at
expires_at
status
```

---

# 16. Reservation Time Limit

Default:

```text
15 minutes
```

This should eventually be configurable by admin.

Suggested message:

```text
Ticket #29 has been reserved for you.

Ticket Price: 500 ETB
Receiver: Example Company
Payment Account: XXXXX

Please complete payment and upload the payment screenshot within 15 minutes.
```

# 17. Active Reservation Limit & Sequential Ticket Cutting ("One-by-One" Purchase Flow)

### Core Rule:
- A user **is allowed to own multiple tickets** across or within lottery events.
- However, users **cannot reserve or purchase multiple tickets at once (in bulk/cart)**.
- Ticket cutting is strictly **sequential (one ticket at a time)**.

### Sequential Cutting Workflow:
1. **Cut Ticket #1**:
   - User browses and selects Ticket #1 (e.g., `#29`).
   - Ticket #1 status becomes `RESERVED` with a 15-minute timer.
   - While Ticket #1 is `RESERVED` or in `PAYMENT_SUBMITTED`/`VERIFYING`, the user **cannot** reserve any other ticket.
2. **Pay and Verify Ticket #1**:
   - User pays the exact ticket price for that event (e.g., 500 ETB for iPhone 17).
   - User submits the payment receipt screenshot.
   - Payment is verified via the external verifier API (Veritas).
   - Once verified, Ticket #1 status becomes `ISSUED` and its reservation state is marked `COMPLETED`.
3. **Cut Ticket #2**:
   - Once Ticket #1 is successfully `ISSUED` (or if the reservation expired/was cancelled), the user's active reservation lock is released.
   - The user can return to the menu, tap "Buy Another Ticket" (in the same lottery or a different lottery), and select Ticket #2 (e.g., `#142`).
   - The user pays the required amount for Ticket #2, submits a separate receipt, and has it verified independently.

### Enforced Constraint:
```text
Maximum 1 ACTIVE reservation per user across the system at any given moment.
```

This prevents cart-locking, prevents number hoarding, and guarantees that every single ticket has its own distinct, verifiable payment transaction.

---

# 18. Reservation Expiration

A background worker should periodically detect expired reservations.

Condition:

```text
status = RESERVED
AND expires_at < current_time
AND no payment has been submitted
```

Then:

```text
reservation -> EXPIRED
ticket -> AVAILABLE
```

Once the ticket becomes `AVAILABLE`, it can appear again in availability lists.

---

# 19. Payment Submission Before Expiration

If the user uploads payment evidence before the timer ends:

```text
RESERVED -> PAYMENT_SUBMITTED
```

The number must remain locked and hidden while verification is running.

Do not release the ticket when the original 15-minute timer expires if payment was already submitted.

---

# 20. Payment Screenshot Upload

The bot should accept an image/document containing the payment receipt.

Store:

- screenshot URL/path,
- submitted timestamp,
- user ID,
- reservation ID,
- event ID,
- ticket ID.

Then start verification.

---

# 21. Receipt Information Extraction & Reference Detection

The user uploads a payment receipt screenshot via the Telegram Bot. The platform extracts the transaction details using:

1. **Direct Image Verification / Extraction via Veritas API**:
   - Endpoint: `POST https://verifyapi.leulzenebe.pro/verify-image?autoVerify=false` (or `autoVerify=true`)
   - Header: `x-api-key: $VERITAS_API_KEY`
   - Multipart payload: `file: <receipt_image>`
   - Automatically parses provider, transaction reference, amount, and timestamp.
2. **Supplemental OCR / Regex Extraction (Fallback)**:
   - If image auto-extraction needs pre-processing or local parsing, OCR extracts the transaction reference string (e.g., `FT...` for CBE, 10-digit alphanumeric for Telebirr).

Extracted fields:
```text
payment_provider        (CBE, Telebirr, Dashen, Bank of Abyssinia, CBE Birr, M-Pesa)
transaction_reference   (e.g., FT26471283912, ABC123DE45)
account_suffix          (required for certain CBE/Abyssinia legacy formats if applicable)
detected_amount
receiver_name / account
transaction_time
```

---

# 22. Payment Verification Engine (Veritas Ethiopian Verifier Integration)

The platform integrates with the **Veritas Payment Verification API** ([https://veritas.et/docs](https://veritas.et/docs)):

- **Base URL**: `https://verifyapi.leulzenebe.pro`
- **Authentication**: `x-api-key: $VERITAS_API_KEY`
- **Supported Providers**:
  - **CBE (Commercial Bank of Ethiopia)**: `POST /verify-cbe` or `POST /verify` (Reference + optional account suffix)
  - **Telebirr**: `POST /verify-telebirr` or `POST /verify` (Reference)
  - **Dashen Bank**: `POST /verify-dashen` or `POST /verify` (Reference)
  - **Bank of Abyssinia**: `POST /verify-abyssinia` or `POST /verify` (Reference + 5-digit suffix)
  - **CBE Birr**: `POST /verify-cbebirr` or `POST /verify` (Receipt number + phone number)
  - **M-Pesa**: `POST /verify-mpesa` (Reference)
  - **Universal Endpoint**: `POST /verify` (Auto-detects CBE, Telebirr, CBE Birr, Dashen, Abyssinia from reference)

### Verification Logic & Validation Steps:

1. **Reference Uniqueness Check (Local DB)**:
   - Before calling Veritas, check our local database:
     `SELECT id FROM payments WHERE provider = ? AND transaction_reference = ? AND status = 'VERIFIED'`
   - If reference is already used: **REJECT immediately** (`DUPLICATE_REFERENCE`).
2. **Call Veritas Verification**:
   - Send extracted reference to Veritas endpoint.
   - Parse response (inspect both HTTP status and response body JSON, as some providers return provider failure with HTTP 200).
3. **Strict Validation Checks (MANDATORY APPROVAL GATE)**:
   The system automatically verifies and approves a ticket to `ISSUED` **ONLY** when all four of the following criteria match simultaneously:
   
   - **Criterion 1 — Receiver Account Number Match**:
     The receiver account number (or phone number) returned by Veritas must match the `receiver_account_number` configured on that specific lottery event:
     `verified_receipt.receiver_account == lottery_event.receiver_account_number`
     *(If the receiver account number does not match, reject as `WRONG_RECEIVER_ACCOUNT`)*.
   
   - **Criterion 2 — Receiver Name Match**:
     The receiver name returned by Veritas must match the `receiver_name` configured on that specific lottery event (checked with normalized case and whitespace trimming):
     `normalize(verified_receipt.receiver_name) == normalize(lottery_event.receiver_name)`
     *(If the receiver name does not match, flag as `WRONG_RECEIVER_NAME`)*.
   
   - **Criterion 3 — Exact Amount Match**:
     The verified amount paid must equal the lottery event's ticket price:
     `verified_receipt.amount == lottery_event.ticket_price` (e.g. 500 ETB for iPhone 17 or 2,500 ETB for Motorcycle).
     *(If the amount is less, reject as `INSUFFICIENT_AMOUNT`)*.
   
   - **Criterion 4 — Reference Uniqueness**:
     The transaction reference must not have been previously recorded as verified in our local database:
     `NOT EXISTS (SELECT 1 FROM payments WHERE provider = ? AND transaction_reference = ? AND status = 'VERIFIED')`.

4. **Outcome Actions**:
   - **All 4 Match ➔ `VERIFIED` & `ISSUED`**: The payment is automatically verified, ticket status transitions to `ISSUED`, ticket ownership is created, and user is notified in Telegram. The active reservation is closed, freeing the user to cut another ticket if they wish.
   - **Receiver or Amount Mismatch ➔ `REJECTED` / `MANUAL_REVIEW`**: If the receipt was paid to a different account, different recipient name, or wrong amount, the transaction is **never automatically approved**. It is moved to `MANUAL_REVIEW` with an alert in the Admin Dashboard showing the exact mismatch, or rejected with a clear explanation to the user.
   - **Provider Error / Ambiguity ➔ `MANUAL_REVIEW`**: Ticket remains locked until staff manually inspects the receipt screenshot and verifies it.

---

# 23. Duplicate Payment Reference Prevention

A transaction reference must not be reusable.

Recommended uniqueness rule:

```text
UNIQUE(payment_provider, transaction_reference)
```

A payment transaction successfully associated with one ticket cannot be used for another ticket.

Example:

```text
Provider: CBE
Reference: FT26471283912
```

If it has already been used, reject future use.

---

# 24. Screenshot Duplicate Detection

Optional fraud-prevention layer:

Store a hash/fingerprint of uploaded screenshots.

This can help detect repeated images.

However:

- transaction verification should be considered stronger than screenshot matching,
- the reference number should remain the main duplicate identifier.

---

# 25. Payment States

Recommended payment states:

```text
SUBMITTED
EXTRACTING
VERIFYING
VERIFIED
REJECTED
MANUAL_REVIEW
ERROR
```

---

# 26. Verification Success Flow

If successful:

```text
payment -> VERIFIED
reservation -> COMPLETED
ticket -> ISSUED
```

Create a ticket ownership record.

Send confirmation to the user.

Example:

```text
Payment Verified

Lottery: iPhone 17 Pro Lottery
Ticket Number: #29
Ticket Price: 500 ETB
Transaction Reference: FT26471283912
Draw Date: September 30, 2026

Your ticket has been successfully registered.
```

---

# 27. Verification Failure Flow

Possible reasons:

```text
DUPLICATE_REFERENCE
WRONG_RECEIVER
WRONG_AMOUNT
TRANSACTION_NOT_FOUND
FAILED_TRANSACTION
UNREADABLE_RECEIPT
VERIFICATION_SERVICE_ERROR
SUSPICIOUS_TRANSACTION
```

Bot should display a user-friendly message.

Admin should see the technical reason.

---

# 28. Manual Review

If automatic verification cannot confidently decide:

```text
PAYMENT_SUBMITTED -> MANUAL_REVIEW
```

The ticket remains unavailable to all other users.

Admin can:

- approve,
- reject,
- request another receipt.

All manual approvals/rejections must be recorded in the audit log.

---

# 29. My Tickets

Telegram users should have a `My Tickets` section.

Display:

```text
Lottery Name
Ticket Number
Purchase Date
Ticket Status
Draw Date
Payment Reference
```

Example:

```text
iPhone Lottery
Ticket: #29
Status: Confirmed
Draw: September 30, 2026
```

---

# 30. Manual Sales

Admin dashboard should provide:

`Register Manual Sale`

Admin enters:

- customer name,
- phone number,
- selected event,
- selected available number,
- payment provider,
- transaction reference,
- screenshot if available,
- notes.

Source:

```text
MANUAL
```

The ticket must use the same reservation logic as Telegram.

When admin selects a number, the backend must atomically reserve it.

It must immediately disappear from:

- Telegram available numbers,
- public availability,
- walk-in availability,
- other admin sales forms.

---

# 31. Walk-In Sales

Walk-in registration should use the same logic.

Source:

```text
WALK_IN
```

Collect:

- name,
- phone number,
- event,
- ticket number,
- payment information,
- notes.

---

# 32. Link Manual Tickets to Telegram Users

Recommended feature.

If a user later registers with a phone number matching a manual/walk-in participant:

```text
manual participant phone == Telegram registered phone
```

The system may offer:

```text
We found tickets associated with this phone number.
```

After verification/confirmation, attach them to the Telegram account.

---

# 33. Telegram Channel and Group Notifications

When an event is published:

Send:

- image,
- title,
- description,
- price,
- draw date,
- availability link,
- Start Bot button/link.

When a ticket is successfully sold, optionally post:

```text
Ticket #29 has been taken.

2841 / 5000 tickets sold.
2159 tickets remaining.
```

Do not publish the customer's private name or phone number.

---

# 34. Public Availability

Recommended implementation:

Create a public page such as:

```text
/event/{eventSlug}/tickets
```

Show:

- event image,
- event description,
- ticket price,
- total tickets,
- sold count,
- remaining count,
- available numbers.

Important:

Only show:

```text
ticket.status == AVAILABLE
```

Reserved tickets must never appear as available.

---

# 35. Admin Dashboard Pages (Categorized by Lottery Event)

All core administrative operations are **strictly categorized and filtered by Lottery Event**. An active event switcher/selector at the top allows admins to toggle between events (or select "All Events" for aggregate analytics).

## Dashboard (Overview)

Show:

- list of active and recent lottery events with quick metrics,
- total registered users,
- total revenue broken down by event (e.g. iPhone 17 vs Motorcycle),
- total sold tickets, reserved tickets, pending payments across events,
- payment verification alerts & manual review queue.

## Event-Categorized Participant & Ticket Views

### Event Selector:
- Admins select which lottery event to inspect (e.g., `iPhone 17 Pro [OPEN]` or `Motorcycle [OPEN]`).
- **All participants who cut tickets for that event are displayed grouped directly under that event**.
- If a customer bought tickets in multiple events, their tickets are categorized cleanly under each corresponding event's roster.

### Ticket Grid (Per Event)

Displays all 1 to 5,000 ticket numbers for the currently selected lottery event.

Recommended status colors:

```text
AVAILABLE
RESERVED
PAYMENT_SUBMITTED
VERIFYING
MANUAL_REVIEW
ISSUED
WINNER
```

Admin clicking a ticket opens full details (customer info, payment reference, Veritas verification record, timestamp, admin notes).

## Reservations

Show:

- active reservations,
- user,
- ticket,
- remaining time,
- source,
- current state.

## Payments

Show:

- reference,
- provider,
- customer,
- amount,
- ticket,
- verification state,
- submitted time.

## Manual Sales

Form and history.

## Walk-In Sales

Form and history.

## Customers

Search by:

- name,
- phone number,
- Telegram ID,
- Telegram username.

## Winners

Manage winning ticket.

## Broadcasts

Send announcements to registered Telegram users.

## Reports

Generate:

- PDF,
- CSV,
- Excel if desired.

## Audit Logs

Record sensitive operations.

## Settings

Configure:

- bot settings,
- payment providers,
- reservation time,
- ticket limits,
- languages,
- Telegram channel,
- Telegram group,
- notification preferences.

---

# 36. Ticket Details View

When admin clicks a ticket, show:

```text
Event
Ticket Number
Status
Owner Name
Phone
Telegram Username
Participant Source
Reservation Time
Payment Status
Payment Provider
Payment Reference
Purchase Time
Admin Notes
Audit History
```

---

# 37. Closing Lottery Sales

Admin action:

`Close Ticket Sales`

When closed:

```text
event.status = SALES_CLOSED
```

Then:

- new reservations are blocked,
- new manual sales are blocked,
- new walk-in sales are blocked,
- existing verification processes may finish according to configured policy,
- final participant list can be generated.

---

# 38. Draw Snapshot

Before the draw, generate a locked snapshot of eligible tickets.

Store:

```text
snapshot_id
event_id
generated_at
total_eligible_tickets
hash
created_by
```

The snapshot should contain all eligible issued tickets.

Once locked, it should not be silently modified.

If an authorized admin changes something afterward, create a new version and record it in the audit log.

---

# 39. PDF Participant Export

Admin can export an official participant register.

Recommended columns:

```text
Ticket Number
Participant Name
Phone Number
Registration Source
Payment Provider
Transaction Reference
Purchase Date
```

Report header:

```text
Lottery Event
Prize
Ticket Price
Sales Period
Draw Date
Total Issued Tickets
Generated At
Event ID
```

---

# 40. Winner Management

After the external/live draw, admin enters the winning ticket number.

Example:

```text
29
```

System shows:

```text
Ticket #29
Owner: Abebe Kebede
Phone: +251...
Payment: Verified
Ticket Status: Issued
```

Admin must confirm.

Then:

```text
ticket -> WINNER
event -> WINNER_SELECTED
```

Store:

```text
winner_id
event_id
ticket_id
participant_id
selected_at
selected_by
announcement_text
```

---

# 41. Winner Notification

Event should support a custom winner message.

Example:

```text
Congratulations!

Your ticket #29 has been selected as the winning ticket for the iPhone Lottery.

Please contact the organizer using the information below to continue the prize-claim process.
```

Send the private notification only to the appropriate Telegram user when available.

---

# 42. Results

Bot should provide:

`Results`

Show completed events and their public winning ticket numbers.

Example:

```text
iPhone 17 Pro Lottery
Winning Ticket: #29
Draw Date: September 30, 2026
```

Do not expose private customer information publicly unless appropriate consent and legal basis exist.

---

# 43. Notification Events

Recommended notification triggers:

```text
EVENT_PUBLISHED
RESERVATION_CREATED
RESERVATION_EXPIRING
PAYMENT_RECEIVED
PAYMENT_VERIFIED
PAYMENT_REJECTED
PAYMENT_MANUAL_REVIEW
SALES_CLOSING
SALES_CLOSED
DRAW_REMINDER
WINNER_SELECTED
RESULT_PUBLISHED
```

---

# 44. Database Tables

Recommended core tables:

```text
users
admins
admin_roles
lottery_events
lottery_tickets
reservations
participants
payments
payment_verifications
ticket_ownership
winners
broadcasts
notification_logs
event_snapshots
audit_logs
system_settings
payment_accounts
```

---

# 45. Example Users Table

```text
id
telegram_user_id
telegram_username
full_name
phone_number
language
status
created_at
updated_at
```

---

# 46. Example Lottery Events Table

```text
id
title
slug
description
image_url
ticket_price
start_number
end_number
total_tickets
sales_start_at
sales_end_at
draw_at
payment_provider
receiver_account_number
receiver_name
winner_message
status
created_by
created_at
updated_at
```

---

# 47. Example Lottery Tickets Table

```text
id
event_id
ticket_number
status
current_reservation_id
owner_participant_id
created_at
updated_at
```

Required constraint:

```text
UNIQUE(event_id, ticket_number)
```

Recommended index:

```text
INDEX(event_id, status)
```

This improves available-number queries.

---

# 48. Example Reservations Table

```text
id
event_id
ticket_id
participant_id
source
status
reserved_at
expires_at
payment_submitted_at
completed_at
created_at
updated_at
```

---

# 49. Example Payments Table

```text
id
event_id
ticket_id
participant_id
reservation_id
provider
transaction_reference
expected_amount
detected_amount
receiver_name
sender_name
receipt_url
receipt_hash
status
submitted_at
verified_at
rejection_reason
created_at
updated_at
```

Recommended constraint:

```text
UNIQUE(provider, transaction_reference)
```

For incomplete OCR where the reference is not yet known, enforce uniqueness once a verified normalized reference is available.

---

# 50. Example Participants Table

This can unify BOT, MANUAL and WALK_IN users.

```text
id
user_id nullable
full_name
phone_number
source
created_by_admin_id nullable
created_at
updated_at
```

Source enum:

```text
BOT
MANUAL
WALK_IN
```

---

# 51. Audit Logs

Every sensitive action must be recorded.

Fields:

```text
id
admin_id
action
entity_type
entity_id
old_value
new_value
reason
ip_address
created_at
```

Examples:

```text
PAYMENT_MANUALLY_APPROVED
TICKET_CANCELLED
EVENT_REOPENED
WINNER_CHANGED
TICKET_REASSIGNED
MANUAL_SALE_CREATED
```

---

# 52. Sensitive Admin Actions

Require a reason for:

- manually approving rejected payment,
- cancelling an issued ticket,
- changing ticket ownership,
- reopening a closed lottery,
- changing winner,
- deleting payment evidence,
- modifying payment reference,
- changing event ticket count after sales begin.

Some actions should require SUPER_ADMIN permission.

---

# 53. Recommended Technology Stack

## Telegram Bot

Recommended:

```text
Node.js
Telegraf
```

Alternative:

```text
Python
aiogram
```

## Backend

Recommended:

```text
Node.js
NestJS
```

or:

```text
Node.js
Express
```

NestJS is preferred for a larger production system because it provides stronger project structure.

## Database

Recommended:

```text
PostgreSQL
Supabase
```

## Admin Frontend

Recommended:

```text
React
Vite
Tailwind CSS
```

## File Storage

Recommended:

```text
Supabase Storage
```

## Background Jobs

Recommended:

```text
Redis + BullMQ
```

Jobs:

- reservation expiration,
- notification delivery,
- payment verification,
- retry logic,
- scheduled announcements.

## Payment Verification Service

- **Primary Engine**: Veritas Ethiopian Payment Verification API ([https://veritas.et/docs](https://veritas.et/docs))
- **Base Endpoint**: `https://verifyapi.leulzenebe.pro`
- **Supported Ethiopian Rails**: Telebirr, Commercial Bank of Ethiopia (CBE), Dashen Bank, Bank of Abyssinia, CBE Birr, M-Pesa.
- **Image Extraction**: `POST /verify-image`
- **Reference Verification**: `POST /verify` (or provider-specific endpoints `/verify-telebirr`, `/verify-cbe`, etc.)

---

# 54. Suggested Architecture

```text
                        ┌────────────────────┐
                        │    Telegram User   │
                        └─────────┬──────────┘
                                  │
                                  ▼
                        ┌────────────────────┐
                        │    Telegram Bot    │
                        └─────────┬──────────┘
                                  │
                                  ▼
┌─────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│ Admin Dashboard │────▶│    Backend API     │────▶│ Payment Verification│
└─────────────────┘     └─────────┬──────────┘     └────────────────────┘
                                  │
                                  ▼
                        ┌────────────────────┐
                        │ PostgreSQL/Supabase│
                        └─────────┬──────────┘
                                  │
             ┌────────────────────┼─────────────────────┐
             ▼                    ▼                     ▼
      Notification Worker   Reservation Worker   Report Generator
             │
             ▼
      Telegram Group/
      Telegram Channel
```

---

# 55. Availability API Rules

Create an endpoint similar to:

```text
GET /events/:eventId/available-tickets
```

It must only return:

```text
WHERE status = 'AVAILABLE'
```

Never return reserved numbers as available.

Recommended support:

```text
?page=1
&limit=100
&rangeStart=1
&rangeEnd=100
```

---

# 56. Reserve Ticket API

Example:

```text
POST /events/:eventId/tickets/:ticketNumber/reserve
```

Server must:

1. authenticate participant,
2. check event is open,
3. check active reservation limit,
4. begin transaction,
5. lock/read ticket,
6. confirm status is AVAILABLE,
7. change status to RESERVED,
8. create reservation,
9. set expiration,
10. commit,
11. return reservation.

Never trust a client-provided `available=true` value.

---

# 57. Available Ticket Count

Always calculate based on the actual ticket state.

Example:

```text
SELECT COUNT(*)
FROM lottery_tickets
WHERE event_id = ?
AND status = 'AVAILABLE';
```

Reserved tickets are not included.

---

# 58. Telegram Number Refresh

When a user is viewing a range, another participant may reserve one of those numbers.

Therefore, when the first user clicks a number:

- the backend must re-check availability,
- if already reserved, reject gracefully.

Example:

```text
Sorry, number #29 has just become unavailable.
Please select another number.
```

Then refresh the list.

---

# 59. Caching Rules

If caching available numbers, keep cache lifetime extremely short or invalidate it immediately when ticket status changes.

Recommended:

- database is source of truth,
- invalidate availability cache on:
  - reservation,
  - expiration,
  - payment issue,
  - cancellation,
  - manual sale,
  - walk-in sale.

Do not let stale cache cause double-selling.

---

# 60. Reservation Worker

Background task should run frequently.

Pseudo-code:

```text
find reservations
where status = ACTIVE
and expires_at <= NOW()

for each:
    if payment_submitted_at is null:
        mark reservation EXPIRED
        mark ticket AVAILABLE
```

Use database-safe locking so two workers cannot release the same reservation incorrectly.

---

# 61. Payment Verification Timeout

If the verification provider is unavailable, do not immediately release the user's ticket.

Move payment to:

```text
MANUAL_REVIEW
```

or:

```text
VERIFICATION_ERROR
```

Keep the ticket hidden until staff resolves the case.

---

# 62. Event Editing Rules

Before publication:

Admin can freely edit.

After sales begin, restrict changes to:

- ticket price,
- ticket quantity,
- number range,
- payment destination,
- draw date.

Any allowed changes should create audit records.

Critical changes may require SUPER_ADMIN.

---

# 63. Security Requirements

Implement:

- secure admin authentication,
- role-based access control,
- server-side validation,
- rate limiting,
- CSRF protection where applicable,
- XSS protection,
- SQL injection protection,
- secure file upload validation,
- secrets only in environment variables,
- HTTPS,
- encrypted provider credentials,
- audit logging.

Never expose:

- payment API secrets,
- bot token,
- database service keys,
- admin credentials.

---

# 64. Privacy Requirements

Public views must not expose:

- phone numbers,
- payment references,
- Telegram IDs,
- private receipts,
- full names unless explicitly permitted and lawful.

Payment receipts should only be accessible to authorized staff.

---

# 65. Logging

Application logs should include:

- errors,
- payment-verification failures,
- reservation failures,
- notification failures,
- background job failures.

Do not log sensitive secrets.

Avoid unnecessarily logging complete payment receipt data.

---

# 66. Error Handling

Every critical process should fail safely.

Examples:

## Ticket reserve API fails

Ticket stays `AVAILABLE` unless the reservation transaction commits.

## Payment verification crashes

Ticket stays locked and case becomes reviewable.

## Telegram notification fails

Ticket remains valid; notification can retry.

## Channel post fails

Purchase remains valid; notification error is logged.

---

# 67. Admin Dashboard Search

Support fast search for:

- ticket number,
- phone number,
- participant name,
- Telegram username,
- transaction reference,
- event.

---

# 68. Reporting

Recommended reports:

- lottery participant register,
- sold tickets,
- available tickets,
- manual sales,
- walk-in sales,
- Telegram sales,
- payments,
- rejected payments,
- winner report,
- event summary.

---

# 69. Event Summary Metrics

Display:

```text
Total Tickets
Available
Reserved
Payment Submitted
Under Review
Issued
Manual
Walk-In
Bot
Revenue
Verification Failure Count
```

---

# 70. Revenue Calculations

Calculate revenue only from valid issued/verified ticket records.

Do not count:

- expired reservations,
- rejected payments,
- cancelled transactions,
- unverified manual entries.

---

# 71. Required Telegram Commands

Recommended:

```text
/start
/menu
/lotteries
/mytickets
/results
/help
/language
/profile
```

Most interactions should use inline buttons rather than forcing commands.

---

# 72. Multilingual Design

Do not hard-code user-facing text directly inside logic.

Use translation keys.

Example:

```json
{
  "ticket_reserved": "Ticket #{number} has been reserved for you.",
  "ticket_unavailable": "This number is currently unavailable.",
  "payment_verified": "Your payment has been verified."
}
```

Create language files such as:

```text
en.json
am.json
```

---

# 73. Important Edge Cases

The implementation must handle:

1. Two users clicking the same number at the same moment.
2. User uploads receipt at minute 14:59.
3. Payment verification takes more than 15 minutes.
4. User sends the same receipt twice.
5. Different users submit the same payment reference.
6. OCR extracts reference incorrectly.
7. Verification provider is temporarily offline.
8. Admin manually tries to sell a reserved bot ticket.
9. User's reservation expires while they are browsing.
10. User clicks an old Telegram button for a number no longer available.
11. Admin closes event while payment verification is active.
12. Customer has no Telegram username.
13. Customer changes Telegram username.
14. Manual customer later joins Telegram.
15. Public availability page is stale.
16. Background worker restarts.
17. Telegram API temporarily fails.
18. User uploads wrong image.
19. Ticket is cancelled after verification.
20. Admin accidentally selects wrong winner.

---

# 74. Winner Confirmation Safety

Winner marking should require:

1. enter ticket number,
2. display participant/ticket details,
3. explicit confirmation,
4. audit log,
5. optional SUPER_ADMIN confirmation.

Do not instantly change winner on first click.

---

# 75. Recommended MVP

Build the first version in this order:

## Phase 1

- Telegram onboarding
- user registration
- language
- create lottery event
- ticket generation
- availability
- reservation
- 15-minute expiration
- reserved-number hiding
- admin ticket grid

## Phase 2

- payment screenshot upload
- OCR extraction
- payment verification adapter
- duplicate-reference protection
- manual review

## Phase 3

- manual sales
- walk-in sales
- Telegram channel/group updates
- My Tickets
- public availability page

## Phase 4

- sales closing
- PDF/CSV export
- draw snapshot
- winner management
- winner notification

## Phase 5

- advanced analytics
- multi-admin permissions
- detailed audit tools
- extra languages
- provider integrations

---

# 76. Acceptance Criteria for Reserved Number Feature

This feature is considered complete only when all cases below pass.

## Test 1

Given ticket #29 is `AVAILABLE`.

When User A reserves #29.

Then:

```text
#29 becomes RESERVED
#29 disappears from User B's availability list
#29 disappears from public availability
#29 cannot be reserved by admin/manual sales
```

## Test 2

Given #29 is reserved.

When User B manually searches #29.

Then bot returns:

```text
Number #29 is currently unavailable.
```

## Test 3

Given #29 is reserved.

When reservation expires without payment.

Then:

```text
reservation -> EXPIRED
ticket -> AVAILABLE
```

And #29 reappears.

## Test 4

Given #29 is reserved.

When payment screenshot is submitted before expiration.

Then:

```text
ticket remains unavailable
```

even if the original 15-minute reservation time later passes.

## Test 5

Given User A and User B attempt to reserve #29 simultaneously.

Exactly one request succeeds.

The other receives:

```text
Ticket #29 is unavailable.
```

## Test 6

Given admin attempts a manual sale of #29 while User A holds it.

The manual reservation must fail.

---

# 77. Definition of Done

The platform is not complete unless:

- ticket numbers cannot be double-issued,
- reserved tickets immediately disappear from available lists,
- expired unpaid reservations become available again,
- submitted payments keep tickets locked,
- payment references cannot be reused,
- manual and bot sales share the same inventory,
- winner actions are auditable,
- reports can be exported,
- users can retrieve their tickets,
- admins can manage events,
- private payment/customer information is protected.

---

# 78. Final Development Principle

The system must treat ticket availability as a **server-controlled real-time state**, never as a front-end assumption.

The most important rule is:

```text
ONLY tickets with status AVAILABLE may be shown as selectable.
```

The moment a number moves to:

```text
RESERVED
PAYMENT_SUBMITTED
VERIFYING
MANUAL_REVIEW
ISSUED
WINNER
```

it must disappear from all customer-facing availability lists.

If an unpaid reservation expires or an authorized cancellation releases a ticket, it can safely return to:

```text
AVAILABLE
```

and become selectable again.

This rule must be enforced centrally in the backend and database so Telegram users, manual sales, walk-ins, the public ticket page, and the admin dashboard always operate on one consistent ticket inventory.
