
import mysql from 'mysql2/promise';
import {} from 'dotenv/config.js';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const dbConnection = async () => {
  const connection = await pool.getConnection();
  console.log('Base de datos MySQL conectada');
  connection.release();
};

export { pool };
export default dbConnection;
