const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const required = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
];

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

const refreshExpiryDays = Number.parseInt(process.env.JWT_REFRESH_EXPIRY_DAYS || '30', 10);
if (!Number.isInteger(refreshExpiryDays) || refreshExpiryDays <= 0) {
  throw new Error('JWT_REFRESH_EXPIRY_DAYS must be a positive integer');
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number.parseInt(process.env.PORT || '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiry: process.env.JWT_EXPIRY || '1h',
  refreshExpiryDays,
  db: {
    host: process.env.DB_HOST,
    port: Number.parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: Number.parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  },
};
