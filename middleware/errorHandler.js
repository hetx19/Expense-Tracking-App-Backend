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
      err.message || "Unhandled application error",
    );
  }

  if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
    return res.status(statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: statusCode,
        status,
        ...(err.details && { details: err.details }),
        stack: err.stack,
      },
      ...(reqId && { requestId: reqId }),
    });
  }

  if (err.isOperational) {
    return res.status(statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: statusCode,
        status,
        ...(err.details && { details: err.details }),
      },
      ...(reqId && { requestId: reqId }),
    });
  }

  return res.status(500).json({
    success: false,
    error: {
      message: "Something went very wrong!",
      code: 500,
      status: "error",
    },
    ...(reqId && { requestId: reqId }),
  });
};

module.exports = errorHandler;
