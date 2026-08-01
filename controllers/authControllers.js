const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const env = require("../config/env");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const generateToken = (id) => {
  return jwt.sign({ id }, env.JWT_SECRET, { expiresIn: "2h" });
};

const signUpUser = asyncHandler(async (req, res) => {
  const { name, email, password, profileImageUrl } = req.body;

  if (!name || !email || !password) {
    throw new AppError("Missing Required Fields", 400);
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new AppError("User With This Email Already Exists", 400);
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    profileImageUrl,
  });

  res.status(201).json({
    id: user._id,
    user,
    token: generateToken(user._id),
  });
});

const signInUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Missing Required Fields", 400);
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError("No User Found", 400);
  }

  const isMatched = await bcrypt.compare(password, user.password);

  if (!isMatched) {
    throw new AppError("Invalid Credentials", 401);
  }

  res.status(200).json({
    id: user._id,
    user,
    token: generateToken(user._id),
  });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  if (!user) {
    throw new AppError("User Not Found", 404);
  }

  res.status(200).json(user);
});

const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("No File Uploaded", 400);
  }

  const result = await cloudinary.uploader.upload(req.file.path, {
    folder: "expense-tracker",
  });

  return res.status(200).json({ imageUrl: result.secure_url });
});

const updateUser = asyncHandler(async (req, res) => {
  const { name, email, password, profileImageUrl } = req.body;
  const user = await User.findById(req.user._id).select("-password");

  if (!user) {
    throw new AppError("User Not Found", 404);
  }

  user.name = name || user.name;
  user.profileImageUrl = profileImageUrl || user.profileImageUrl;

  if (email) {
    const checkEmail = await User.findOne({ email });
    if (checkEmail) {
      throw new AppError("User With This Email Already Exists", 400);
    } else {
      user.email = email;
    }
  }

  if (password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
  }

  const updatedUser = await user.save();

  res.status(200).json({
    message: "User Updated Successfully",
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    profileImageUrl: updatedUser.profileImageUrl,
    token: generateToken(updatedUser._id),
  });
});

const updateImage = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  if (!user) {
    throw new AppError("User Not Found", 404);
  }

  if (!req.file) {
    return res.status(200).json({ imageUrl: user.profileImageUrl });
  }

  const array = user.profileImageUrl.split("/");
  const image = array[array.length - 1];
  const imageName = image.split(".")[0];

  await cloudinary.api.delete_resources([`expense-tracker/${imageName}`], {
    type: "upload",
    resource_type: "image",
  });

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      req.file.path,
      {
        folder: "expense-tracker",
      },
      (err, result) => {
        if (err) {
          return reject(err);
        }
        res.status(200).json({ imageUrl: result.secure_url });
        resolve();
      },
    );
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new AppError("User Not Found", 404);
  }

  await Promise.all([
    Expense.deleteMany({ userId: user._id }),
    Income.deleteMany({ userId: user._id }),
  ]);

  if (user.profileImageUrl) {
    const array = user.profileImageUrl.split("/");
    const image = array[array.length - 1];
    const imageName = image.split(".")[0];

    await cloudinary.api.delete_resources([`expense-tracker/${imageName}`], {
      type: "upload",
      resource_type: "image",
    });
  }

  await user.deleteOne();

  return res.status(200).json({ message: "User Deleted Successfully" });
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
