const jwt = require("jsonwebtoken");
const env = require("../config/env");

const protect = (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: "Not authorized, no token", code: 401 },
      });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = { _id: decoded.id };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: { message: "Not authorized, token failed", code: 401 },
    });
  }
};

module.exports = protect;
