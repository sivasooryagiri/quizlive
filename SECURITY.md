# Security

QuizLive's threat model is **low-stakes interactive use** — classrooms, school trivia, workshops, conferences, town halls, community quiz nights. It is **not** designed for high-stakes scoring (cash prizes, certifications, ranked competition).

If you need high-stakes integrity, see [Known Limitations](#known-limitations).

---

## Reporting a vulnerability

Email: **dtg@soluto.in**

Please include:
- Steps to reproduce
- Impact (what an attacker gains)
- Whether you've shared it publicly

I'll respond within a few days. Please give me a reasonable window to fix before public disclosure.

---

## What's protected

### Admin access
- Admin login uses **Firebase Authentication** (`signInWithEmailAndPassword`).
- Password is never stored in the codebase, environment, or Firestore. It lives only in the Firebase Auth user store, which uses bcrypt-style hashing and built-in brute-force / rate-limit protection.
- Each fork sets its own admin password in the Firebase Console — there is no default password baked into the build.

### Firestore rules
The `firestore.rules` file enforces server-side checks that the client cannot bypass:

| Collection | Read | Write |
|---|---|---|
| `meta/gameState` | public | admin only (bootstrap locked to initial-state values) |
| `questions/{id}` | public | admin only — `correctAnswer` field is **rejected** here |
| `answerKeys/{id}` | admin always; public **only** after the question phase ends and only for current-or-past questions | admin only |
| `players/{id}` | public | join only (validated name 2–20 chars, score=0); **no update allowed** — scores are computed from `/answers`, never written to player docs |
| `answers/{id}` | public | server-validated — see below |
| `sessions/{id}` | public | admin only |

### Hidden correct answers
`correctAnswer` is split out of the public question doc into `/answerKeys/{questionId}`, which is locked behind the rule above. **Players cannot fetch the answer key during the question phase**, so the classic "open DevTools and read all answers" cheat is blocked.

### Server-validated answer scoring
Every write to `/answers` is validated by Firestore rules. The client cannot lie about:
- **Phase** — must be `'question'` (rejects submissions before quiz starts or after timer ends).
- **Answer index** — must be `0..3` (rejects out-of-range writes).
- **Document ID** — must be exactly `{questionId}_{playerId}`, and the `playerId` field inside must match. This pins *who* a write can affect — an attacker can't forge an answer doc under someone else's player ID.
- **isCorrect / score fields** — the rule **forbids** both fields entirely. Writes containing either are rejected outright.

Answer docs contain only `{questionId, playerId, answer, timeTaken, timer}`. Correctness and score are computed at read time by joining with `/answerKeys` (which only become readable after the question phase ends). This is a blind write — the server never reveals whether an answer is right or wrong at write time, so the rule cannot be probed.

> **Why no client-vs-server clock check?** An earlier rule rejected writes whose `timeTaken` disagreed with `request.time - questionStartTime` by more than 2s. It added friction without preventing the attack (a motivated client can always claim `timeTaken: 0` and get the one-question max of 30 pts), and it false-rejected legit players on flaky cell networks. Dropping it matches Kahoot/Slido behavior.

### CSV export
Session history CSV exports neutralize Excel formula injection: cells starting with `= + - @` are prefixed with `'` so they render as text instead of executing.

### HTTP headers
`vercel.json` sets `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive `Permissions-Policy`.

---

## Known Limitations

### No spam / rate limiting on player joins
A script can create thousands of player documents. Rules cap name length and require `score: 0` on create, but there's no rate limit. Firebase has its own per-IP write quotas as a backstop.

### Trust the host network
Local-network deployments (deploy-local.md) trust everyone on the LAN. Don't run a public-prize quiz over a coffee shop Wi-Fi.

---

## What you (the operator) must do

1. **Deploy `firestore.rules`** — the file in this repo does nothing until you publish it: `firebase deploy --only firestore:rules` or paste into Firebase Console → Firestore → Rules → Publish.
2. **Create the admin Auth user** — Firebase Console → Authentication → Add user → email `admin@quizlive.internal` + a strong password.
3. **Don't commit `.env`** — `.gitignore` blocks it; double-check before pushing.
4. **Pin the join URL** — admin panel → Game Settings → set `Player Join URL` to your production domain so the QR code points at the right place.

## Verifying the rules

A test suite is included at `test-security.mjs`. It runs against the local Firestore emulator — no real project or credentials needed:

```bash
# Terminal 1 — start the emulator
npx firebase-tools emulators:start --only firestore --project quizlive-test

# Terminal 2 — run the tests
node test-security.mjs
```

All 18 attack scenarios should show ✅.

---

## Build credits

This release was built with [Claude Code](https://claude.com/claude-code) using **Claude Sonnet 4.6** and **Claude Opus 4.7**.
