const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const pinoHttp = require("pino-http");
const crypto = require("crypto");
const logger = require("./utils/logger");
const { globalLimiter } = require("./middleware/rateLimiters");

// Routes
const authRoutes = require("./routes/authRoutes");
const incomeRoutes = require("./routes/incomeRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

// Configuring Enviroment Variables
const env = require("./config/env");

const app = express();

app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.headers["x-request-id"] || crypto.randomUUID(),
  }),
);
app.use(helmet());
app.use(globalLimiter);
app.use(express.json());
app.use(
  cors({
    origin: env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Route
app.use("/api/auth", authRoutes);
app.use("/api/income", incomeRoutes);
app.use("/api/expense", expenseRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"), (error) => {
    if (error) {
      logger.error({ err: error }, "Error sending file");
      res.status(500).send("File not found");
    }
  });
});

const errorHandler = require("./middleware/errorHandler");

app.use(errorHandler);

module.exports = app;
