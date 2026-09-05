const rateLimit = require("express-rate-limit");

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: "Too many requests, please try again later.",
      code: 429,
    },
  },
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: "Too many authentication attempts, please try again later.",
      code: 429,
    },
  },
});

module.exports = {
  globalLimiter,
  authLimiter,
};
