// config/db.js
const mysql = require("mysql2/promise");
require("dotenv").config();

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool
  .getConnection()
  .then((connection) => {
    console.log("✅ Connected to MySQL Database Pool Successfully!");
    connection.release();
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MySQL Database Pool:", err);
    process.exit(1);
  });

module.exports = pool;
