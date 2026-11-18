# StudyMate AI — Security Specification (Phase 0)

## 1. Data Invariants
- Every document in `users`, `chatHistory`, `uploadedPDFs`, `summaries`, `quizzes`, `quizResults`, `flashcards`, `studyTasks`, and `savedMaterials` belongs exclusively to a single verified Firebase Auth user (`request.auth.uid`).
- A user cannot read, list, create, update, or delete another user's records.
- `users` collection does not permit `list` queries (prevents PII/email scraping).
- `userId` and `createdAt` are immutable after document creation.
- All `createdAt` / `updatedAt` / `completedAt` timestamps must match `request.time` (server timestamps).
- Users cannot self-upgrade `planTier` from `"free"` to a paid tier on create or update.
- Parent references (`summaries.pdfId` -> `uploadedPDFs`, `quizResults.quizId` -> `quizzes`) must exist and belong to `request.auth.uid` on creation.

## 2. The "Dirty Dozen" Attack Payloads
1. **Cross-User Profile Read**: Authenticated User A attempts `get(/users/userB)`. Expected: `PERMISSION_DENIED`.
2. **User Collection Scraping**: Authenticated User A attempts `list(/users)`. Expected: `PERMISSION_DENIED`.
3. **Identity Spoofing on Create**: User A creates `/studyTasks/t1` with `userId: "userB"`. Expected: `PERMISSION_DENIED`.
4. **Shadow Field Injection**: User A creates `/savedMaterials/s1` with extra field `isAdmin: true`. Expected: `PERMISSION_DENIED`.
5. **Self-Assigned Premium Upgrade**: User A updates `/users/userA` with `planTier: "premium_preview"`. Expected: `PERMISSION_DENIED`.
6. **Immutable Owner Tampering**: User A updates `/flashcards/d1` changing `userId` to `"userB"`. Expected: `PERMISSION_DENIED`.
7. **Timestamp Forgery**: User A creates `/studyTasks/t2` with client-forged `createdAt` instead of `request.time`. Expected: `PERMISSION_DENIED`.
8. **ID Poisoning**: User A attempts to create `/quizzes/<1500-char-invalid-id!@#>` violating `isValidId()`. Expected: `PERMISSION_DENIED`.
9. **Resource Exhaustion (1MB String)**: User A submits a 50,000-char `title` in `/studyTasks/t3`. Expected: `PERMISSION_DENIED`.
10. **Orphaned Summary Creation**: User A creates `/summaries/sum1` referencing a nonexistent `pdfId: "fake_pdf"`. Expected: `PERMISSION_DENIED`.
11. **Unfiltered List Query**: User A runs `list(/chatHistory)` without `where("userId", "==", userA)`. Expected: `PERMISSION_DENIED`.
12. **Unverified Email Bypass**: User with `email_verified == false` attempts to write to `/studyTasks/t4`. Expected: `PERMISSION_DENIED`.
