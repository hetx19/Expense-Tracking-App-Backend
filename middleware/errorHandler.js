const env = require("../config/env");
const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || "error";
  const reqId = req ? req.id : undefined;

  if (statusCode >= 500) {
    logger.error(
      {
        err,
        reqId,
        url: req ? req.originalUrl : undefined,
        method: req ? req.method : undefined,
      },
      err.message || "Unhandled application error"
    );
  }

  if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
    return res.status(statusCode).json({
      status,
      message: err.message,
      stack: err.stack,
      ...(err.details && { details: err.details }),
      ...(reqId && { requestId: reqId }),
    });
  }

  if (err.isOperational) {
    return res.status(statusCode).json({
      status,
      message: err.message,
      ...(err.details && { details: err.details }),
      ...(reqId && { requestId: reqId }),
    });
  }

  return res.status(500).json({
    status: "error",
    message: "Something went very wrong!",
    ...(reqId && { requestId: reqId }),
  });
};

module.exports = errorHandler;
