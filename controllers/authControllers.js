const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const Expense = require("../models/Expense");
const Income = require("../models/Income");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "2h" });
};

const signUpUser = async (req, res) => {
  const { name, email, password, profileImageUrl } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Missing Required Fields" });
  }

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User With This Email Already Exists" });
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
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const signInUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing Required Fields" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "No User Found" });
    }

    const isMatched = await bcrypt.compare(password, user.password);

    if (!isMatched) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    res.status(200).json({
      id: user._id,
      user,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No File Uploaded" });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "expense-tracker",
    });

    return res.status(200).json({ imageUrl: result.secure_url });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { name, email, password, profileImageUrl } = req.body;
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
    }

    user.name = name || user.name;
    user.profileImageUrl = profileImageUrl || user.profileImageUrl;

    if (email) {
      const checkEmail = await User.findOne({ email });
      if (checkEmail) {
        return res
          .status(400)
          .json({ message: "User With This Email Already Exists" });
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
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const updateImage = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
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

    await cloudinary.uploader.upload(
      req.file.path,
      {
        folder: "expense-tracker",
      },
      (err, result) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Server Error", error: err.message });
        } else {
          return res.status(200).json({ imageUrl: result.secure_url });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  signUpUser,
  signInUser,
  getUser,
  updateUser,
  deleteUser,
  uploadImage,
  updateImage,
};
