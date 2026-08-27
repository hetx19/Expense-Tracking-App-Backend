const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/user.repository");
const expenseService = require("./expense.service");
const incomeService = require("./income.service");
const cloudinary = require("../config/cloudinary");
const env = require("../config/env");
const AppError = require("../utils/AppError");

const DUMMY_HASH =
  "$2b$10$e8I6E.dC2.8mJ3dK.6kQee60k1/G3uJ3X0V5N7/m4l2G3K1.X7p2W";

const generateToken = (id) => {
  return jwt.sign({ id }, env.JWT_SECRET, { expiresIn: "2h" });
};

const signUpUser = async ({ name, email, password, profileImageUrl }) => {
  const existingUser = await userRepository.findByEmail(email);

  if (existingUser) {
    throw new AppError("User With This Email Already Exists", 400);
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await userRepository.create({
    name,
    email,
    password: hashedPassword,
    profileImageUrl,
  });

  return {
    id: user._id,
    user,
    token: generateToken(user._id),
  };
};

const signInUser = async ({ email, password }) => {
  const user = await userRepository.findByEmail(email);

  const hashToCompare = user ? user.password : DUMMY_HASH;
  const isMatched = await bcrypt.compare(password, hashToCompare);

  if (!user || !isMatched) {
    throw new AppError("Invalid email or password", 401);
  }

  return {
    id: user._id,
    user,
    token: generateToken(user._id),
  };
};

const getUser = async (userId) => {
  const user = await userRepository.findById(userId, "-password");

  if (!user) {
    throw new AppError("User Not Found", 404);
  }

  return user;
};

const uploadImage = async (file) => {
  if (!file) {
    throw new AppError("No File Uploaded", 400);
  }

  const result = await cloudinary.uploader.upload(file.path, {
    folder: "expense-tracker",
  });

  return { imageUrl: result.secure_url };
};

const updateUser = async (
  userId,
  { name, email, password, profileImageUrl },
) => {
  const user = await userRepository.findById(userId, "-password");

  if (!user) {
    throw new AppError("User Not Found", 404);
  }

  user.name = name || user.name;
  user.profileImageUrl = profileImageUrl || user.profileImageUrl;

  if (email) {
    const checkEmail = await userRepository.findByEmail(email);
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

  const updatedUser = await userRepository.save(user);

  return {
    message: "User Updated Successfully",
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    profileImageUrl: updatedUser.profileImageUrl,
    token: generateToken(updatedUser._id),
  };
};

const updateImage = async (userId, file) => {
  const user = await userRepository.findById(userId, "-password");

  if (!user) {
    throw new AppError("User Not Found", 404);
  }

  if (!file) {
    return { imageUrl: user.profileImageUrl };
  }

  if (user.profileImageUrl) {
    const array = user.profileImageUrl.split("/");
    const image = array[array.length - 1];
    const imageName = image.split(".")[0];

    await cloudinary.api.delete_resources([`expense-tracker/${imageName}`], {
      type: "upload",
      resource_type: "image",
    });
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      file.path,
      {
        folder: "expense-tracker",
      },
      (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve({ imageUrl: result.secure_url });
      },
    );
  });
};

const deleteUser = async (userId) => {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new AppError("User Not Found", 404);
  }

  await Promise.all([
    expenseService.deleteAllExpensesByUser(userId),
    incomeService.deleteAllIncomeByUser(userId),
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

  await userRepository.deleteById(userId);

  return { message: "User Deleted Successfully" };
};

module.exports = {
  signUpUser,
  signInUser,
  getUser,
  uploadImage,
  updateUser,
  updateImage,
  deleteUser,
};
