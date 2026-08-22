const logger = require('./utils/logger');

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'UNCAUGHT EXCEPTION! Shutting down...');
  process.exit(1);
});

const env = require('./config/env');
const app = require('./app');
const connectDb = require('./config/db');

connectDb();

const port = env.PORT;
const server = app.listen(port, () => {
  logger.info(`Server is successfully running at http://localhost:${port}`);
});

process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'UNHANDLED REJECTION! Shutting down...');
  server.close(() => {
    process.exit(1);
  });
});
