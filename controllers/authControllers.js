const authService = require("../services/auth.service");
const asyncHandler = require("../utils/asyncHandler");

const signUpUser = asyncHandler(async (req, res) => {
  const result = await authService.signUpUser(req.body);
  res.status(201).json(result);
});

const signInUser = asyncHandler(async (req, res) => {
  const result = await authService.signInUser(req.body);
  res.status(200).json(result);
});

const getUser = asyncHandler(async (req, res) => {
  const user = await authService.getUser(req.user._id);
  res.status(200).json(user);
});

const uploadImage = asyncHandler(async (req, res) => {
  const result = await authService.uploadImage(req.file);
  res.status(200).json(result);
});

const updateUser = asyncHandler(async (req, res) => {
  const result = await authService.updateUser(req.user._id, req.body);
  res.status(200).json(result);
});

const updateImage = asyncHandler(async (req, res) => {
  const result = await authService.updateImage(req.user._id, req.file);
  res.status(200).json(result);
});

const deleteUser = asyncHandler(async (req, res) => {
  const result = await authService.deleteUser(req.user._id);
  res.status(200).json(result);
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
