const express = require('express');
const protect = require('../middleware/auth');
const upload = require('../middleware/upload');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiters');
const {
  signUpSchema,
  signInSchema,
  updateUserSchema,
} = require('../controllers/auth.validation');
const {
  signUpUser,
  signInUser,
  getUser,
  updateUser,
  deleteUser,
  uploadImage,
  updateImage,
} = require('../controllers/authControllers');

const router = express.Router();

router.post('/signup', authLimiter, validate(signUpSchema), signUpUser);
router.post('/signin', authLimiter, validate(signInSchema), signInUser);
router.get('/getUser', protect, getUser);
router.put('/updateUser', protect, validate(updateUserSchema), updateUser);
router.delete('/deleteUser', protect, deleteUser);

router.post('/upload-image', protect, upload.single('image'), uploadImage);

router.put('/update-image', protect, upload.single('image'), updateImage);

module.exports = router;
