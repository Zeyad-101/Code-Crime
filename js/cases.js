/* =========================================================
   CASES — three production incidents for the player to solve.
   Content authored in the plan; copied verbatim.
   ========================================================= */
const CASES = [
  {
    id: "midnight-crash",
    difficulty: "rookie",
    title: "The Midnight Crash",
    briefing: "Every night at 00:00, the app starts returning 500 errors for about two minutes. Support tickets pile up every morning. Find out why.",
    stats: { usersAffected: 1240, errorRate: "100% (during window)", status: "INVESTIGATING" },
    evidence: {
      log: [
        "23:59:58  INFO  Starting daily cleanup job",
        "23:59:59  INFO  Fetching expired sessions (14 found)",
        "00:00:00  INFO  Deleting session sess_88213",
        "00:00:00  ERROR TypeError: Cannot read properties of undefined (reading 'id')",
        "00:00:00  ERROR Cleanup job crashed. Retrying in 60s."
      ],
      stackTrace: [
        "at deleteSession (cleanup.js:20)",
        "at cleanupExpiredSessions (cleanup.js:14)",
        "at runNightlyJob (scheduler.js:31)"
      ],
      commit: {
        author: "Ahmed",
        message: "refactor: simplify session cleanup",
        when: "yesterday",
        diff: [
          "- function getUser(id) {",
          "-   return db.users.find(u => u.id === id);",
          "- }",
          "+ function getUser() {",
          "+   return db.users.find(u => u.id === currentUserId);",
          "+ }"
        ]
      },
      code: {
        filename: "cleanup.js",
        lines: [
          { id: "L18", text: "function deleteSession(sessionId) {" },
          { id: "L19", text: "  const session = sessions.get(sessionId);" },
          { id: "L20", text: "  const user = getUser(session.userId);" },
          { id: "L21", text: "  db.sessions.delete(sessionId);" },
          { id: "L22", text: "  console.log(`Deleted session for ${user.id}`);" },
          { id: "L23", text: "}" }
        ]
      }
    },
    rootCauseOptions: [
      { id: "a", text: "A race condition between two nightly cleanup jobs" },
      { id: "b", text: "getUser() was refactored to rely on a global currentUserId instead of a passed-in id, which is undefined during the nightly cron job" },
      { id: "c", text: "The database connection pool ran out of connections at midnight" },
      { id: "d", text: "Session records are missing a userId field after a schema migration" }
    ],
    correctRootCauseId: "b",
    correctLineId: "L20",
    fixPrompt: "Ahmed's refactor made getUser() ignore its argument and read a global instead. Rewrite the function signature so it accepts an id back.",
    correctFix: "function getUser(id) {",
    acceptableFixes: [
      "function getUser(id) {",
      "function getUser(id){",
      "function getUser(userId) {",
      "function getUser(userId){",
      "function getUser(uid) {"
    ],
    explanation: "Ahmed's refactor changed getUser() to read a global currentUserId instead of accepting an argument. That works during a normal logged-in request, but the nightly cleanup job has no logged-in user, so currentUserId is undefined and getUser() returns undefined. Line 20 still passes session.userId like the old signature — it's silently ignored — and the crash happens two lines later when .id is read off undefined."
  },
  {
    id: "ghost-orders",
    difficulty: "investigator",
    title: "Ghost Orders",
    briefing: "Customers on slow connections are getting charged twice for a single order. It's intermittent and only support tickets are catching it.",
    stats: { usersAffected: 340, errorRate: "4% of checkouts", status: "INVESTIGATING" },
    evidence: {
      log: [
        "14:02:11  INFO  POST /checkout user=8841",
        "14:02:11  INFO  POST /checkout user=8841",
        "14:02:12  INFO  Order created: ord_5521 user=8841 amount=49.99",
        "14:02:13  INFO  Order created: ord_5522 user=8841 amount=49.99",
        "14:02:13  WARN  Payment charged twice for user=8841"
      ],
      stackTrace: [
        "at handleCheckoutClick (checkout.js:44)",
        "at HTMLButtonElement.onclick"
      ],
      commit: {
        author: "Sara",
        message: "feat: add loading spinner to checkout button",
        when: "last week",
        diff: [
          "  function handleCheckoutClick() {",
          "+   button.classList.add('loading');",
          "    submitOrder();",
          "+   button.classList.remove('loading');",
          "  }"
        ]
      },
      code: {
        filename: "checkout.js",
        lines: [
          { id: "L40", text: "const button = document.getElementById('checkout-btn');" },
          { id: "L41", text: "button.addEventListener('click', handleCheckoutClick);" },
          { id: "L43", text: "function handleCheckoutClick() {" },
          { id: "L44", text: "  button.classList.add('loading');" },
          { id: "L45", text: "  submitOrder();" },
          { id: "L46", text: "  button.classList.remove('loading');" },
          { id: "L47", text: "}" }
        ]
      }
    },
    rootCauseOptions: [
      { id: "a", text: "The payment provider double-processes webhooks" },
      { id: "b", text: "submitOrder() is missing an idempotency key on retried requests" },
      { id: "c", text: "The checkout button is never disabled while a request is in flight, so a second click before the first request resolves fires a duplicate submission" },
      { id: "d", text: "A duplicate event listener gets bound on every render" }
    ],
    correctRootCauseId: "c",
    correctLineId: "L44",
    fixPrompt: "Sara only added a CSS class — that doesn't stop the second click. Write the single line that should run before submitOrder() to block the click.",
    correctFix: "button.disabled = true;",
    acceptableFixes: [
      "button.disabled = true;",
      "button.disabled = true",
      "button.disabled=true;",
      "button.disabled=true",
      "button.setAttribute('disabled', '');",
      'button.setAttribute("disabled", "");',
      "button.setAttribute('disabled', '')",
      'button.setAttribute("disabled", "")'
    ],
    explanation: "Sara's spinner change only toggles a CSS class — it never disables the button or sets a guard flag. submitOrder() is async, so on a slow connection there's a window where the button looks 'loading' but is still fully clickable. A second click in that window fires handleCheckoutClick again, submitting — and charging — a second order. Fix: set button.disabled = true (or an in-flight guard) before calling submitOrder(), and only clear it once the request settles."
  },
  {
    id: "vanishing-cache",
    difficulty: "senior",
    title: "The Vanishing Cache",
    briefing: "Users update their profile, and other viewers keep seeing the old version for minutes at a time. It's not an error — the data is just stale — which is why it took so long to notice.",
    stats: { usersAffected: 18000, errorRate: "N/A (silent staleness)", status: "INVESTIGATING" },
    evidence: {
      log: [
        "09:14:02  INFO  PUT /profile/8841 -> updated name to \"Alex R.\"",
        "09:14:02  INFO  cache.delete(profile:8841)",
        "09:14:02  INFO  GET /profile/8841 (concurrent) -> cache miss, read DB (pre-write): \"Alex\"",
        "09:14:02  INFO  cache.set(profile:8841, \"Alex\", ttl=300)",
        "09:14:05  INFO  GET /profile/8841 -> served from cache: \"Alex\" (stale)",
        "09:18:59  INFO  GET /profile/8841 -> served from cache: \"Alex\" (stale)",
        "09:19:02  INFO  cache expired for profile:8841",
        "09:19:03  INFO  GET /profile/8841 -> served from DB: \"Alex R.\" (fresh)"
      ],
      stackTrace: [
        "at getProfile (profile-service.js:34)",
        "at cache.get (cache.js:7)",
        "at updateProfile (profile-service.js:28)"
      ],
      commit: {
        author: "Mona",
        message: "perf: cache profile reads to cut DB load",
        when: "two weeks ago",
        diff: [
          "  function updateProfile(id, data) {",
          "+   cache.delete(`profile:${id}`);",
          "    db.profiles.update(id, data);",
          "  }",
          "",
          "  function getProfile(id) {",
          "+   const cached = cache.get(`profile:${id}`);",
          "+   if (cached) return cached;",
          "    const fresh = db.profiles.get(id);",
          "+   cache.set(`profile:${id}`, fresh, { ttl: 300 });",
          "    return fresh;",
          "  }"
        ]
      },
      code: {
        filename: "profile-service.js",
        lines: [
          { id: "L28", text: "function updateProfile(id, data) {" },
          { id: "L29", text: "  cache.delete(`profile:${id}`);" },
          { id: "L30", text: "  db.profiles.update(id, data);" },
          { id: "L31", text: "  return { success: true };" },
          { id: "L32", text: "}" },
          { id: "L34", text: "function getProfile(id) {" },
          { id: "L35", text: "  const cached = cache.get(`profile:${id}`);" },
          { id: "L36", text: "  if (cached) return cached;" },
          { id: "L37", text: "  const fresh = db.profiles.get(id);" },
          { id: "L38", text: "  cache.set(`profile:${id}`, fresh, { ttl: 300 });" },
          { id: "L39", text: "  return fresh;" },
          { id: "L40", text: "}" }
        ]
      }
    },
    rootCauseOptions: [
      { id: "a", text: "The 300-second cache TTL is too long for a profile service" },
      { id: "b", text: "cache.delete() runs before the database write commits, so a concurrent read can re-cache the pre-update value" },
      { id: "c", text: "Two app servers are running separate, unsynchronized caches" },
      { id: "d", text: "The cache key format doesn't match between reads and writes" }
    ],
    correctRootCauseId: "b",
    correctLineId: "L29",
    fixPrompt: "Mona's cache.delete() is in the wrong place — it runs before the write. Write the cache call that needs to move AFTER db.profiles.update().",
    correctFix: "cache.delete(`profile:${id}`);",
    acceptableFixes: [
      "cache.delete(`profile:${id}`);",
      "cache.delete(`profile:${id}`)",
      "cache.delete('profile:${id}');",
      "cache.delete('profile:${id}')",
      'cache.delete("profile:${id}");',
      'cache.delete("profile:${id}")',
      "cache.delete(profile:${id});",
      "cache.delete(profile:${id})"
    ],
    explanation: "Mona's fix does invalidate the cache — but it deletes the old entry before the database write actually commits, not after. If a GET request for that profile lands in the tiny window between the delete and the write finishing, it finds no cached value, reads the still-old row straight from the database, and re-populates the cache with that stale value for a full 5-minute TTL. The fix is to delete the cache key after the write commits, not before."
  }
];
