import mysql from 'mysql2';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const db = mysql.createConnection({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port:     process.env.DB_PORT
});

db.connect(err => {
  if (err) {
    console.error('❌ DB Connection Failed:', err.message);
  } else {
    console.log('✅ MySQL Connected Successfully!');
  }
});

export default db;
