const mongoose = require("mongoose");

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {});
    console.log("MongoDB Database Connected Successfully");
  } catch (error) {
    console.error("MongoDB Connection Error", error);
    process.exit(1);
  }
};

module.exports = connectDb;
