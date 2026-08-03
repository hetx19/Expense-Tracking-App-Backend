const env = require("../config/env");

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || "error";

  if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
    return res.status(statusCode).json({
      status,
      message: err.message,
      stack: err.stack,
      ...(err.details && { details: err.details }),
    });
  }

  if (err.isOperational) {
    return res.status(statusCode).json({
      status,
      message: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  console.error("ERROR 💥", err);
  return res.status(500).json({
    status: "error",
    message: "Something went very wrong!",
  });
};

module.exports = errorHandler;
