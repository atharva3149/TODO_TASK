const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: config.db.connectionLimit,
  queueLimit: 0,
  timezone: 'Z',
  dateStrings: true,
});

async function checkDatabaseConnection() {
  await pool.query('SELECT 1');
}

module.exports = {
  pool,
  checkDatabaseConnection,
};
