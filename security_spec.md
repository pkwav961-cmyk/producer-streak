# Security Specification for Producer Streak

## Data Invariants
1. **User Ownership**: Only the authenticated user can modify their own profile, stats, and activity.
2. **Session Integrity**: Studio sessions are private to the creator. `userId` must always match `request.auth.uid`.
3. **Friendship Security**: Only users in the `users` array of a friendship document can read or update the friendship status.
4. **Chat Privacy**: only participants listed in the `chats/{chatId}` document can read messages or the chat metadata.
5. **Goal Persistence**: Goals are private to the creator.
6. **Challenge Progress**: Users can only modify their own `UserChallenge` records.

## The "Dirty Dozen" Payloads (Blocked Actions)
1. **Profile Hijack**: `setDoc(/users/target_uid, { displayName: 'Hacker', level: 999 })`
2. **Shadow Field Injection**: `updateDoc(/users/my_uid, { isStaff: true, xp: 999999 })`
3. **Session Spoofing**: `addDoc(/sessions, { userId: 'victim_uid', durationMinutes: 1000 })`
4. **Relationship Scraping**: `getDoc(/friendships/not_my_friendship_id)`
5. **Message Eavesdropping**: `query(collection(db, 'chats/victim_chat/messages'))`
6. **Goal Modification**: `updateDoc(/goals/victim_goal, { targetValue: 1 })`
7. **Identity Spoofing in Follows**: `addDoc(/follows, { followerId: 'expert_producer', followingId: 'my_uid' })`
8. **Invalid State Transition**: `updateDoc(/sessions/my_session, { status: 'completed' })` (without setting endTime)
9. **Timestamp Manipulation**: `addDoc(/sessions, { startTime: '2020-01-01', createdAt: '2020-01-01' })` (blocking client-side timestamps)
10. **Global Challenge Hijack**: `updateDoc(/challenges/global_daily, { rewardXP: 1000000 })`
11. **User Challenge Verification**: `updateDoc(/userChallenges/my_uc, { completed: true })` (without hitting targetValue in logic)
12. **PII Leak**: `read(/users/victim_uid)` should not expose private info if isolated.

## The Test Runner (Plan)
We will verify that:
- Reads on sensitive collections (sessions, goals, chats) return `PERMISSION_DENIED` for unauthorized users.
- Writes with invalid types or unexpected fields return `PERMISSION_DENIED`.
- Writes by unverified users (if enforced) return `PERMISSION_DENIED`.

## Conflict Report & Patch Delta
- **Initial Rules**: The current rules use `canAccess` which is too simple and has a ternary that fails insecurely (`isSignedIn() ? own : true`).
- **Fix**: Implement strictly defined `isValid[Entity]` helpers and action-based updates with `affectedKeys().hasOnly()`.
