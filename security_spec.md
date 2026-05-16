# Security Specification - SmartNote AI

## Data Invariants
1. A note MUST have a valid `userId` matching the authenticated user.
2. Users can only read, update, or delete notes where `userId == request.auth.uid`.
3. Secret notes can only be accessed by the owner.
4. Timestamps MUST be server-validated.

## Permissions Matrix
| Collection | Create | Read | Update | Delete |
|------------|--------|------|--------|--------|
| /notes/{id}| Owner  | Owner| Owner  | Owner  |

## Logic Gates
- `isSignedIn()`: User must be authenticated.
- `isOwner(id)`: User ID in document matches auth UID.
- `isValidNote(data)`: Validates schema (types, sizes, required fields).

## Red Team Payloads (The Dirty Dozen)
1. **Identity Spoofing**: Attempt to create a note with someone else's `userId`. (Expect: FAIL)
2. **Resource Poisoning**: Large string for title (>100 chars). (Expect: FAIL)
3. **Ghost Field**: Adding `isAdmin: true` to a note during update. (Expect: FAIL)
4. **Auth Bypass**: Reading `/notes/someId` while logged out. (Expect: FAIL)
5. **PII Leak**: Querying for all notes regardless of UID. (Expect: FAIL)
6. **Time Spoofing**: Setting `createdAt` to a past date manually. (Expect: FAIL)
7. **Secret Hijack**: Attempting to read another user's secret note. (Expect: FAIL)
... etc.
