-- Players table: lightweight accounts
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  auth_token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  games_played INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_players_auth_token ON players(auth_token);

-- Games table: persistent game records
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  invite_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, in_progress, completed, cancelled
  created_by TEXT NOT NULL REFERENCES players(id),
  team1_score INTEGER NOT NULL DEFAULT 0,
  team2_score INTEGER NOT NULL DEFAULT 0,
  winning_team INTEGER, -- 1 or 2, NULL if not finished
  config_points_to_win INTEGER NOT NULL DEFAULT 10,
  config_stick_the_dealer INTEGER NOT NULL DEFAULT 0,
  config_no_trump_alone INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT
);

CREATE INDEX idx_games_invite_code ON games(invite_code);
CREATE INDEX idx_games_status ON games(status);

-- Game players: who is in each game and their seat
CREATE TABLE IF NOT EXISTS game_players (
  game_id TEXT NOT NULL REFERENCES games(id),
  seat INTEGER NOT NULL CHECK(seat BETWEEN 0 AND 3), -- 0=south, 1=west, 2=north, 3=east; 0&2=team1, 1&3=team2
  player_id TEXT REFERENCES players(id), -- NULL for bots
  is_bot INTEGER NOT NULL DEFAULT 0,
  bot_difficulty TEXT DEFAULT 'medium', -- easy, medium, hard
  PRIMARY KEY (game_id, seat)
);

CREATE INDEX idx_game_players_player ON game_players(player_id);

-- Completed hands history for stats
CREATE TABLE IF NOT EXISTS game_hands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL REFERENCES games(id),
  hand_number INTEGER NOT NULL,
  dealer_seat INTEGER NOT NULL,
  trump_suit TEXT NOT NULL,
  called_by_seat INTEGER NOT NULL,
  went_alone INTEGER NOT NULL DEFAULT 0,
  tricks_team1 INTEGER NOT NULL DEFAULT 0,
  tricks_team2 INTEGER NOT NULL DEFAULT 0,
  points_awarded INTEGER NOT NULL,
  points_to_team INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_game_hands_game ON game_hands(game_id);
