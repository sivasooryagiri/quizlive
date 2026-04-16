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
| `players/{id}` | public | join (validated name 2–20 chars, score=0); update is locked to the `score` field, 0–5000, with **per-write delta ≤ 30** |
| `answers/{id}` | public | server-validated — see below |
| `sessions/{id}` | public | admin only |

### Hidden correct answers
`correctAnswer` is split out of the public question doc into `/answerKeys/{questionId}`, which is locked behind the rule above. **Players cannot fetch the answer key during the question phase**, so the classic "open DevTools and read all answers" cheat is blocked.

### Server-validated answer scoring
Every write to `/answers` is validated by Firestore rules using cross-document reads. The client cannot lie about:
- **Phase** — must be `'question'` (rejects submissions before quiz starts or after timer ends).
- **Answer index** — must be `0..3` (rejects out-of-range writes).
- **Time taken** — must be within 2s of `request.time - questionStartTime` measured by Firebase's clock (rejects "always 0s" cheats).
- **isCorrect** — must equal `(submitted answer == answerKey.correctAnswer)`, where `correctAnswer` is read server-side from `/answerKeys/{id}` (rejects flipping `isCorrect: true`).
- **Score** — must be 0 for wrong, or `5..maxScoreFor(timeTaken, timer)` for correct, where `maxScoreFor` mirrors the client's `calcScore()` exactly. Rejects `score: 99999`.

Because the client can't read `correctAnswer` during the question phase, `submitAnswer()` uses a two-attempt pattern: optimistically write `isCorrect: true` with the max-for-time score; if rules reject, retry with `isCorrect: false, score: 0`. Either way the server is authoritative.

### CSV export
Session history CSV exports neutralize Excel formula injection: cells starting with `= + - @` are prefixed with `'` so they render as text instead of executing.

### HTTP headers
`vercel.json` sets `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive `Permissions-Policy`.

---

## Known Limitations

### Player score can still be drifted within ±30 per write
Firestore rules now cap each `/players/{id}.score` update so the absolute delta is ≤ 30 (= the maximum single-question score). A motivated player using DevTools cannot leap to 5000 in one write — they would have to perform ~167 sequential writes, each visible on the live host leaderboard, to fake a winning score. In a classroom this is loud enough to catch.

**Why a residual remains:** Fully closing this requires Cloud Functions (Firebase Blaze plan, paid) so score writes can be cross-checked against the validated answer documents. The free Spark plan doesn't allow that. The ±30 delta cap is the strongest defense possible with rules alone.

**If you need to close it fully:** Fork and add a Cloud Function on Blaze plan that intercepts player updates and recomputes score from validated `/answers/*` documents.

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

---

## Build credits

This release was built with [Claude Code](https://claude.com/claude-code) using **Claude Sonnet 4.6** and **Claude Opus 4.7**.
