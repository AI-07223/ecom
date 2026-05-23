## ADDED Requirements

### Requirement: Email-based signup with phone as identity

The system SHALL provide a `/signup` form that collects `email`, `phone` (Indian, normalized to E.164), `name` (optional), `password`, and `passwordConfirm`. On submit the server SHALL validate all fields, reject duplicate email OR duplicate phone, bcrypt-hash the password (cost 10), create a `users` row, set a 30-day JWT session cookie, and redirect to `/`.

#### Scenario: New user signs up
- **WHEN** a visitor submits the signup form with a unique email, a valid +91 phone, a name, and an 8+ character password
- **THEN** a `users` row is created with `role = 'customer'` (or `'admin'` if the phone matches `ADMIN_PHONE`)
- **AND** the JWT session cookie `hb_session` is set
- **AND** any anonymous cart bound to the `hb_cart` cookie is associated with the new user in the same transaction

#### Scenario: Duplicate email
- **WHEN** the email is already registered
- **THEN** the response is HTTP 409 with message "This email is already registered. Try signing in."

#### Scenario: Duplicate phone
- **WHEN** the phone is already registered
- **THEN** the response is HTTP 409 with message "This phone is already registered. Try signing in."

#### Scenario: Invalid phone
- **WHEN** the phone doesn't normalize to a valid +91 mobile (10 digits starting 6-9)
- **THEN** the response is HTTP 400 with a phone-specific error

#### Scenario: Weak password
- **WHEN** the password is shorter than 8 characters
- **THEN** the response is HTTP 400 with message "Password must be at least 8 characters"

### Requirement: Login by email OR phone

The `/login` form SHALL have one "Email or phone" field plus a password field. The server SHALL sniff the format: input containing `@` is treated as email; otherwise as phone (normalized through the same E.164 helper). On match + bcrypt-verify, the JWT cookie SHALL be set.

#### Scenario: Login via email
- **WHEN** a user submits `alice@example.com` + correct password
- **THEN** the session cookie is set and `getCurrentUser()` returns the user

#### Scenario: Login via phone
- **WHEN** the same user submits `9876543210` (or `+91 9876543210`) + their password
- **THEN** the same session cookie is set

#### Scenario: Wrong password
- **WHEN** the password doesn't match
- **THEN** the response is HTTP 401 with a neutral "Email or password is wrong" (does not distinguish "user doesn't exist" from "wrong password")

#### Scenario: Login accepts Bearer for native clients
- **WHEN** the request body includes `requestToken: true`
- **THEN** the response body includes the raw JWT alongside the cookie set (for the Expo APK)

### Requirement: Password reset via Resend with console fallback

The `/reset-request` form SHALL accept an email address. The server SHALL look up the user; if found, generate a 32-byte random token, store its bcrypt hash in `password_reset_tokens` with a 1-hour expiry, then deliver the reset URL via Resend (if `RESEND_API_KEY` is set) OR `console.log` (if not). The response to the form SHALL be a neutral "If that email exists, we sent a link" regardless of whether the email matched (to resist account enumeration).

#### Scenario: Reset request for existing email, Resend configured
- **GIVEN** `RESEND_API_KEY` is set and the email matches a user
- **WHEN** the form is submitted
- **THEN** an email is sent via Resend with a link to `/reset/<token>`
- **AND** the form shows the neutral message

#### Scenario: Reset request for existing email, no Resend
- **GIVEN** `RESEND_API_KEY` is NOT set
- **WHEN** the form is submitted with an email that exists
- **THEN** the reset URL is logged to the container console with prefix `[reset-fallback]`
- **AND** the form shows the same neutral message

#### Scenario: Reset request for unknown email
- **WHEN** the form is submitted with an email that doesn't exist
- **THEN** no token is created, no email is sent, the form still shows the neutral message

#### Scenario: Token expiry
- **WHEN** a user opens a reset URL more than 1 hour after request
- **THEN** the page shows "This link has expired" and offers to start over

#### Scenario: Single-use token
- **WHEN** a token is consumed (password successfully reset)
- **THEN** the token's `consumedAt` is set
- **AND** opening the same URL again shows "This link has been used"

### Requirement: Password reset confirmation

The `/reset/<token>` page SHALL accept a new password (min 8 chars) + confirm. On submit, the server SHALL look up the token (by bcrypt-comparing against stored hashes), verify it's unexpired and unconsumed, update `users.passwordHash`, mark the token consumed, and set a new JWT session cookie.

#### Scenario: Successful reset
- **WHEN** a user submits a valid token URL with a new 8+ char password
- **THEN** their `passwordHash` updates, the token is consumed, the user is logged in via fresh JWT

### Requirement: Logout

`POST /api/auth/logout` SHALL clear the session cookie and return HTTP 200.

#### Scenario: Logout clears cookie
- **WHEN** an authenticated user POSTs to /api/auth/logout
- **THEN** the `hb_session` cookie is removed
- **AND** subsequent requests with no cookie return null from `getCurrentUser()`

### Requirement: Admin role auto-grant via ADMIN_PHONE

When a user signs up OR updates their phone, if the normalized phone matches the `ADMIN_PHONE` env var, the user's `role` SHALL be set to `'admin'` in the same transaction.

#### Scenario: Admin phone signs up
- **GIVEN** `ADMIN_PHONE = +919999999999`
- **WHEN** a new user signs up with phone `+919999999999`
- **THEN** their `users.role` is `'admin'`

### Requirement: Rider role granted on /admin/riders creation

When the admin creates a rider via `/admin/riders` and that phone later signs up (or already has a user record), the user's `role` SHALL be set to `'rider'`. The rider creation flow MAY create a provisional user with a default temporary password the admin shares with the rider via WhatsApp.

#### Scenario: Admin creates rider before rider signs up
- **WHEN** the admin enters phone `+919876543210` and name `Suresh` in `/admin/riders`
- **THEN** a `users` row with role `rider` is created with a system-generated 8-char password
- **AND** a `riders` row is created linked to that user
- **AND** the admin sees the temporary password ONCE on the next page to share with the rider

#### Scenario: Rider already a customer when admin promotes
- **WHEN** the admin adds a phone that already has a customer-role user
- **THEN** the user's role is updated to `'rider'`
- **AND** the existing password is preserved

### Requirement: Bearer-or-cookie session resolution

`getCurrentUser()` SHALL accept either an `Authorization: Bearer <jwt>` header OR an `hb_session` cookie, in that priority. This allows the Expo APK (which stores its token in SecureStore) and the web app (which uses cookies) to share the same authentication code path.

#### Scenario: Web client with cookie
- **WHEN** a request arrives with the `hb_session` cookie and no Authorization header
- **THEN** the cookie's JWT is verified and the user is returned

#### Scenario: Native client with Bearer
- **WHEN** a request arrives with an Authorization Bearer header (regardless of cookie)
- **THEN** the Bearer JWT is verified preferentially

### Requirement: Bcrypt cost 10, JWT TTL 30 days

The system SHALL use `bcrypt.hash(password, 10)` for hashing and `bcrypt.compare(plain, hash)` for verification. JWT signing SHALL use HS256 with the `JWT_SECRET` env var; tokens SHALL expire 30 days after issue.

#### Scenario: Cost factor verified
- **WHEN** any password is hashed
- **THEN** the resulting hash starts with `$2a$10$` or `$2b$10$`
