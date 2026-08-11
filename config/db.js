const mongoose = require("mongoose");
const env = require("./env");
const logger = require("../utils/logger");

const connectDb = async () => {
  try {
    await mongoose.connect(env.MONGO_URI, {});
    logger.info("MongoDB Database Connected Successfully");
  } catch (error) {
    logger.error({ err: error }, "MongoDB Connection Error");
    process.exit(1);
  }
};

module.exports = connectDb;
