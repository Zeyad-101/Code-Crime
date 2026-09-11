/* =========================================================
   SCORING — pure functions, no DOM access.
   - Evidence opened: +75 per unique type (max 300)
   - Correct root cause first try: +400; each prior wrong: -50 (floored at 0)
   - Correct fix first try: +300; each prior wrong: -50 (floored at 0)
   - Total clamped to [0, 1000]
   ========================================================= */

const SCORE = {
  EVIDENCE_PER_TYPE: 75,
  EVIDENCE_MAX: 300,
  ROOT_CORRECT: 400,
  ROOT_WRONG_PENALTY: 50,
  FIX_CORRECT: 300,
  FIX_WRONG_PENALTY: 50,
  TOTAL_MAX: 1000
};

function createScoreTracker() {
  return {
    evidenceOpened: new Set(),
    rootCauseAttempts: 0,
    fixAttempts: 0,
    rootCauseSolved: false,
    fixSolved: false
  };
}

function markEvidenceOpened(tracker, evidenceType) {
  if (!tracker || !evidenceType) return;
  tracker.evidenceOpened.add(evidenceType);
}

function recordRootCauseAttempt(tracker, isCorrect) {
  tracker.rootCauseAttempts += 1;
  if (isCorrect) tracker.rootCauseSolved = true;
  return tracker.rootCauseAttempts;
}

function recordFixAttempt(tracker, isCorrect) {
  tracker.fixAttempts += 1;
  if (isCorrect) tracker.fixSolved = true;
  return tracker.fixAttempts;
}

function calculateScore(tracker) {
  const evidencePoints = Math.min(
    tracker.evidenceOpened.size * SCORE.EVIDENCE_PER_TYPE,
    SCORE.EVIDENCE_MAX
  );

  // Root cause: +400 if correct on first attempt, else each wrong attempt = -50, floored at 0.
  let rootCausePoints = 0;
  if (tracker.rootCauseSolved) {
    const wrongAttempts = Math.max(0, tracker.rootCauseAttempts - 1);
    rootCausePoints = Math.max(
      0,
      SCORE.ROOT_CORRECT - wrongAttempts * SCORE.ROOT_WRONG_PENALTY
    );
  }

  // Fix: +300 if correct on first attempt, else each wrong attempt = -50, floored at 0.
  let fixPoints = 0;
  if (tracker.fixSolved) {
    const wrongAttempts = Math.max(0, tracker.fixAttempts - 1);
    fixPoints = Math.max(
      0,
      SCORE.FIX_CORRECT - wrongAttempts * SCORE.FIX_WRONG_PENALTY
    );
  }

  const rawTotal = evidencePoints + rootCausePoints + fixPoints;
  const total = Math.max(0, Math.min(SCORE.TOTAL_MAX, rawTotal));

  return {
    evidencePoints,
    rootCausePoints,
    fixPoints,
    total
  };
}

function getRank(total) {
  if (total >= 900) return "Senior Detective";
  if (total >= 700) return "Investigator";
  if (total >= 400) return "Rookie Detective";
  return "Beat Cop";
}
