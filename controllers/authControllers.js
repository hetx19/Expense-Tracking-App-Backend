const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');

const signUpUser = asyncHandler(async (req, res) => {
  const data = await authService.signUpUser(req.body);
  res.status(201).json({ success: true, data });
});

const signInUser = asyncHandler(async (req, res) => {
  const data = await authService.signInUser(req.body);
  res.status(200).json({ success: true, data });
});

const getUser = asyncHandler(async (req, res) => {
  const data = await authService.getUser(req.user._id);
  res.status(200).json({ success: true, data });
});

const uploadImage = asyncHandler(async (req, res) => {
  const data = await authService.uploadImage(req.file);
  res.status(200).json({ success: true, data });
});

const updateUser = asyncHandler(async (req, res) => {
  const data = await authService.updateUser(req.user._id, req.body);
  res.status(200).json({ success: true, data });
});

const updateImage = asyncHandler(async (req, res) => {
  const data = await authService.updateImage(req.user._id, req.file);
  res.status(200).json({ success: true, data });
});

const deleteUser = asyncHandler(async (req, res) => {
  const data = await authService.deleteUser(req.user._id);
  res.status(200).json({ success: true, data });
});

module.exports = {
  signUpUser,
  signInUser,
  getUser,
  updateUser,
  deleteUser,
  uploadImage,
  updateImage,
};
