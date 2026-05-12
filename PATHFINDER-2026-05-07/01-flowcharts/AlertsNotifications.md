# Alerts & Notifications Flowchart

## Feature: Alerts & Notifications (Email Dispatch System)
**Entry Point:** `Backend_Cloud/functions/index.js:522` (onAlertCreated)

Email dispatch for session anomalies, maintenance, validation with retry logic.

**External Dependencies:**
- Firestore `alerts` collection
- Nodemailer SMTP (Gmail/custom SMTP)
- Firebase Secrets (EMAIL_HOST, EMAIL_USER, EMAIL_PASS)
- Sessions, Operators, Machines collections

**Key Flows:**
1. **Alert Creation** — Firestore onDocumentCreated → Retrieve alert data → Check operatorEmail → sendValidationEmail()
2. **Email Generation** — Build HTML template with validation URL → Configure SMTP → Send via Nodemailer
3. **Resend Endpoint** — POST /resendAlertEmail → Verify alertId → Check status=PENDING → Resend with same template
4. **Retry Logic** — Failed sends update alert status to FAILED, manual resend available

**Email Types:**
- Validation alerts (anomalous sessions) — includes validation token + URL
- Session alerts (AUTO_CLOSE, LONG_SESSION) — triggered by cron jobs
- Maintenance alerts — triggered when maintenance interval reached

**Alert Status Transitions:**
- PENDING → SENT (email dispatched successfully)
- PENDING → FAILED (email send error)
- Resend increments emailResendCount, updates lastEmailResendAt

**Constraints:**
- No operatorEmail = skip (log warning)
- Dev mode if no SMTP config (log email instead of sending)
- Validation URL includes token for session approval/rejection
- Email sent timestamp captured (emailSentAt)

**Scheduled Triggers:**
- Long sessions (every 10 min) — creates LONG_SESSION alerts if >5h
- Auto-close (every 5 min) — creates AUTO_CLOSE alerts when closing stuck sessions
