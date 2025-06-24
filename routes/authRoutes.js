const express = require("express");
const protect = require("../middleware/auth");
const cloudinary = require("../config/cloudinary");
const upload = require("../middleware/upload");
const {
  signUpUser,
  signInUser,
  getUser,
} = require("../controllers/authControllers");

const router = express.Router();

router.post("/signup", signUpUser);
router.post("/signin", signInUser);
router.get("/getUser", protect, getUser);

router.post("/upload-image", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No File Uploaded" });
  }

  cloudinary.uploader.upload(
    req.file.path,
    { folder: "expense-tracker" },
    (err, result) => {
      if (err) {
        console.error(err);
      } else {
        return res.status(200).json({ imageUrl: result.secure_url });
      }
    }
  );
});

module.exports = router;
