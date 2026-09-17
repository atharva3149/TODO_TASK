const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const { checkDatabaseConnection } = require('./db');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin }));
app.use(express.json({ limit: '32kb' }));

app.get('/health', async (req, res, next) => {
  try {
    await checkDatabaseConnection();
    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    return next(error);
  }
});

app.use('/auth', authRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Request body must be valid JSON' });
  }
  // Log server-side details, but never expose stack traces or SQL to clients.
  console.error(error);
  return res.status(500).json({ error: 'An unexpected server error occurred' });
});

module.exports = app;
