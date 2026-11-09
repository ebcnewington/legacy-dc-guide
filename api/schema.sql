-- D1 schema for anonymous trivia ratings and aggregate scores.
CREATE TABLE IF NOT EXISTS games(
  session_id TEXT PRIMARY KEY,
  visitor_hash TEXT NOT NULL,
  correct INTEGER NOT NULL CHECK(correct BETWEEN 0 AND 120),
  answered INTEGER NOT NULL CHECK(answered BETWEEN 1 AND 120),
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_games_visitor ON games(visitor_hash);
CREATE TABLE IF NOT EXISTS ratings(
  question_id TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(question_id,visitor_hash)
);
CREATE INDEX IF NOT EXISTS idx_ratings_question ON ratings(question_id);
CREATE TABLE IF NOT EXISTS rate_limits(
  bucket_hash TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL
);
