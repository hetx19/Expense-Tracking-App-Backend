const express = require('express');
const protect = require('../middleware/auth');
const upload = require('../middleware/upload');
const validate = require('../middleware/validate');
const { updateUserSchema } = require('../controllers/auth.validation');
const {
  getUser,
  updateUser,
  deleteUser,
  updateImage,
} = require('../controllers/authControllers');

const router = express.Router();

router.get('/me', protect, getUser);
router.put('/me', protect, validate(updateUserSchema), updateUser);
router.delete('/me', protect, deleteUser);
router.put('/me/image', protect, upload.single('image'), updateImage);

module.exports = router;
