/* =========================================================
   LEADERBOARD — localStorage helpers.
   Storage key: "crime-scene-leaderboard"
   Each entry: { name, caseTitle, difficulty, score, date }
   Top 50 retained, sorted descending by score.
   ========================================================= */

const LEADERBOARD_KEY = "crime-scene-leaderboard";
const LEADERBOARD_MAX = 50;

function getLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // sanitize: keep only entries that look valid
    return parsed.filter(
      (e) =>
        e &&
        typeof e.name === "string" &&
        typeof e.caseTitle === "string" &&
        typeof e.difficulty === "string" &&
        typeof e.score === "number" &&
        typeof e.date === "string"
    );
  } catch (_e) {
    return [];
  }
}

function addLeaderboardEntry(entry) {
  const entries = getLeaderboard();
  entries.push({
    name: String(entry.name || "Anonymous").slice(0, 20),
    caseTitle: String(entry.caseTitle || ""),
    difficulty: String(entry.difficulty || ""),
    score: Number(entry.score) || 0,
    date: String(entry.date || "")
  });
  entries.sort((a, b) => b.score - a.score);
  const trimmed = entries.slice(0, LEADERBOARD_MAX);
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed));
  } catch (_e) {
    /* quota or private-mode failure: silent no-op */
  }
  return trimmed;
}

function getTopEntries(n) {
  const limit = typeof n === "number" && n > 0 ? n : 10;
  return getLeaderboard().slice(0, limit);
}
