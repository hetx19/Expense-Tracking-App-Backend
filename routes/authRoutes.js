const express = require('express');
const protect = require('../middleware/auth');
const upload = require('../middleware/upload');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiters');
const {
  signUpSchema,
  signInSchema,
} = require('../controllers/auth.validation');
const {
  signUpUser,
  signInUser,
  uploadImage,
} = require('../controllers/authControllers');

const router = express.Router();

router.post('/signup', authLimiter, validate(signUpSchema), signUpUser);
router.post('/signin', authLimiter, validate(signInSchema), signInUser);
router.post('/upload-image', protect, upload.single('image'), uploadImage);

module.exports = router;
