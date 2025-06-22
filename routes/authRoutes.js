const express = require("express");
const protect = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
  signUpUser,
  signInUser,
  getUser,
  updateUser,
} = require("../controllers/authControllers");

const router = express.Router();

router.post("/signup", signUpUser);
router.post("/signin", signInUser);
router.get("/getUser", protect, getUser);

router.post("/upload-image", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No File Uploaded" });
  }

  const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${
    req.file.filename
  }`;
  res.status(200).json({ imageUrl });
});

module.exports = router;
