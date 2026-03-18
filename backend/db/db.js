const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'gravio.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Create tables
db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      school TEXT,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      teacher TEXT,
      FOREIGN KEY (student_id) REFERENCES students (id)
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      due_date TEXT,
      score REAL,
      max_score REAL,
      is_late BOOLEAN DEFAULT 0,
      FOREIGN KEY (course_id) REFERENCES courses (id)
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      percentage REAL NOT NULL,
      letter_grade TEXT NOT NULL,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses (id)
    )
  `);

    // Create category weights for math UI breakdown matching the screenshot
    db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      weight REAL NOT NULL,
      percentage REAL,
      FOREIGN KEY (course_id) REFERENCES courses (id)
    )
  `);
});

module.exports = db;
