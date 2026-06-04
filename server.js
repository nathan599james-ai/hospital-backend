import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); // Parses incoming json payloads

// Pool manager handles structural concurrent connections to PostgreSQL cloud node
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for cloud hosting secure validation
});

// Database Initialization Routine
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        role TEXT NOT NULL,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT,
        ghana_card_id TEXT
      );
    `);
    
    // Seed default admin and medical officer credentials if table is empty
    const checkAccounts = await pool.query('SELECT COUNT(*) FROM accounts');
    if (parseInt(checkAccounts.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO accounts (role, username, password) VALUES
        ('Patient', 'Sarah Jenkins', 'patient123'),
        ('Doctor', 'Dr. Allison House', 'doctor123'),
        ('Nurse', 'Nurse Clara Barton', 'nurse123'),
        ('Pharmacist', 'Dr. Kenji Sato', 'pharmacist123'),
        ('Receptionist', 'Front Desk Staff', 'reception123'),
        ('Admin', 'System Administrator', 'admin123')
      `);
      console.log('Database seeded with default system credentials.');
    }
  } catch (err) {
    console.error('Database migration/seed error:', err.message);
  }
};
initDb();

// --- API ENDPOINTS ---

// 1. User Login Auth Router Verification
app.post('/api/auth/login', async (req, res) => {
  const { role, username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM accounts WHERE LOWER(username) = LOWER($1) AND password = $2 AND role = $3',
      [username, password, role]
    );

    if (result.rows.length > 0) {
      res.json({ success: true, user: result.rows[0] });
    } else {
      res.status(401).json({ error: 'Access Denied: Invalid credentials for active environment.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Account Registration Signup System Entrypoint
app.post('/api/auth/signup', async (req, res) => {
  const { role, username, password, fullName, ghanaCardId } = req.body;
  try {
    const userExists = await pool.query(
      'SELECT * FROM accounts WHERE LOWER(username) = LOWER($1) AND role = $2',
      [username, role]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: `An account with username "${username}" already exists.` });
    }

    const result = await pool.query(
      'INSERT INTO accounts (role, username, password, full_name, ghana_card_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [role, username, password, fullName, ghanaCardId]
    );
    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server executing safely on connection channel port ${PORT}`));