const multer = require("multer");

const storage = multer.diskStorage({});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error("Only .jpeg .jpg and .png formats are allowed");
    error.code = "INVALID_FILE_TYPE";
    cb(error, false);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
