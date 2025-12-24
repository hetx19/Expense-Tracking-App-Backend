const express = require("express");
const protect = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
  signUpUser,
  signInUser,
  getUser,
  updateUser,
  uploadImage,
  updateImage,
} = require("../controllers/authControllers");

const router = express.Router();

router.post("/signup", signUpUser);
router.post("/signin", signInUser);
router.get("/getUser", protect, getUser);
router.put("/updateUser", protect, updateUser);

router.post("/upload-image", upload.single("image"), uploadImage);

router.put("/update-image", protect, upload.single("image"), updateImage);

module.exports = router;
