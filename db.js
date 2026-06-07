import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// This forces the app to use your live Render connection string secret
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // This line is mandatory for cloud hosts like Render!
  }
});

export default pool;