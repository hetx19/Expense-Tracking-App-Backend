process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

const env = require("./config/env");
const app = require("./app");
const connectDb = require("./config/db");

connectDb();

const port = env.PORT;
const server = app.listen(port, () => {
  console.log(`Server is successfully listing at http://localhost:${port}`);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
