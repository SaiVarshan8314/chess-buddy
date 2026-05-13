# Firebase Security Specification

## Data Invariants
- A User profile can only be created by the authenticated user it belongs to.
- A Game record must have a valid `userId` matching the creator.
- Users cannot modify their `fairScore` or `isBanned` status.
- Immutability: `userId`, `createdAt` fields cannot be changed after creation.

## The "Dirty Dozen" Payloads (Red Team Test Cases)

1. **Identity Spoofing**: Attempt to create a user profile with a `userId` that doesn't match `request.auth.uid`.
2. **Resource Poisoning**: Create a game with a 2MB PGN string.
3. **Privilege Escalation**: Update `fairScore` from 100 to 1000.
4. **Admin Injection**: Add an `isAdmin: true` field to a user profile.
5. **State Shortcut**: Update a game `result` without providing a FEN.
6. **Orphaned Writes**: Create a game with a `userId` that doesn't exist in the `users` collection.
7. **Identity Theft**: Update another user's profile information.
8. **Shadow Field**: Create a user with a `ghostField: "hacker"` field not in schema.
9. **Timestamp Fraud**: Set a manual `createdAt` in the future for a game.
10. **ID Poisoning**: Use a document ID containing malicious characters (e.g., `../../../`).
11. **PII Leakage**: Authenticated user attempts to list the entire `users` collection.
12. **Terminal State Break**: Modify a game record marked as `isDeletedFromRecents: true` to change its data.

## Test Runner Logic
All above payloads must return `PERMISSION_DENIED`.
