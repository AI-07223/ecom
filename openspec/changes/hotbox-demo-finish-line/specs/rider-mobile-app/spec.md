## ADDED Requirements

### Requirement: Sequenced finish-line execution

The system SHALL implement all `rider-mobile-app` requirements declared in `openspec/changes/hotbox-food-delivery/specs/rider-mobile-app/spec.md` (Expo project scaffold, OTP login, assigned-order screen, foreground location service with persistent notification, battery-saver guidance on first install, admin APK distribution page with QR code, public install guide page, APK versioning and update check, APK storage and replacement workflow). No new requirements are added — this change adds the implementation behind those requirements.

#### Scenario: All `rider-mobile-app` requirements pass acceptance criteria
- **WHEN** Phase 5 (real-device smoke test) completes successfully
- **THEN** every scenario under `hotbox-food-delivery/specs/rider-mobile-app/spec.md` is observable on a real Android device (Xiaomi or Samsung)
- **AND** the APK installs from the QR code scanned at `/admin/rider-app`
- **AND** the foreground service survives screen lock through a full delivery
- **AND** the APK appears in the customer's live track view as the moving dot

### Requirement: Phase-gated rollout

Each of the six phases SHALL complete its acceptance check before the next phase begins. The acceptance check for a given phase is the last verifiable bullet in its `tasks.md` section.

#### Scenario: Phase 1 gates Phase 2
- **GIVEN** Phase 1 is not yet complete (live smoke test of the existing loop has not passed)
- **WHEN** the operator attempts to start Phase 2 polish work
- **THEN** the operator pauses and finishes Phase 1 first

#### Scenario: Phase 5 gates Phase 6
- **GIVEN** Phase 5 (real-device smoke test) has surfaced any bug
- **WHEN** the operator attempts to archive in Phase 6
- **THEN** the bug is fixed and re-tested before archive
