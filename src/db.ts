import { Database } from "bun:sqlite";

// Initialize database
export const db = new Database("split-bill.db", { create: true });

// Create users table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create sessions table for authentication
db.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Create groups table
db.run(`
  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    public_id TEXT UNIQUE,
    open_to_invites INTEGER DEFAULT 0,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Create group_members table
db.run(`
  CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(group_id, user_id)
  )
`);

// Create expenses table
db.run(`
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    paid_by INTEGER NOT NULL,
    category TEXT,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Create expense_splits table (how expense is divided)
db.run(`
  CREATE TABLE IF NOT EXISTS expense_splits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Create settlements table (payments between members)
db.run(`
  CREATE TABLE IF NOT EXISTS settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    from_user INTEGER NOT NULL,
    to_user INTEGER NOT NULL,
    amount REAL NOT NULL,
    settled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    expense_id INTEGER,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (from_user) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
  )
`);

// Add expense_id column to existing settlements table if it doesn't exist
try {
  db.run(`ALTER TABLE settlements ADD COLUMN expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE`);
} catch (e) {
  // Column already exists, ignore error
}

// Add public_id and open_to_invites columns to existing groups table if they don't exist
// Note: SQLite doesn't support UNIQUE constraint in ALTER TABLE ADD COLUMN
// We'll add the column first, then create a unique index if needed
try {
  db.run(`ALTER TABLE groups ADD COLUMN public_id TEXT`);
  // Create unique index for public_id if it doesn't exist
  try {
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_public_id ON groups(public_id) WHERE public_id IS NOT NULL`);
  } catch (e) {
    // Index might already exist, ignore
  }
} catch (e: any) {
  // Column already exists, ignore error
  if (!e?.message?.includes('duplicate column name')) {
    console.warn("Warning adding public_id column:", e);
  }
}

try {
  db.run(`ALTER TABLE groups ADD COLUMN open_to_invites INTEGER DEFAULT 0`);
} catch (e: any) {
  // Column already exists, ignore error
  if (!e?.message?.includes('duplicate column name')) {
    console.warn("Warning adding open_to_invites column:", e);
  }
}

// Create expense_changes table (audit log for expense edits)
db.run(`
  CREATE TABLE IF NOT EXISTS expense_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id INTEGER NOT NULL,
    changed_by INTEGER NOT NULL,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE
  )
`);

console.log("Database initialized successfully");

