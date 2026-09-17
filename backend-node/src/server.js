const app = require('./app');
const config = require('./config');
const { pool } = require('./db');

const server = app.listen(config.port, () => {
  console.log(`Auth service listening on port ${config.port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down auth service`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
