const User = require('../models/User');

const findByEmail = async (email) => {
  return await User.findOne({ email });
};

const findById = async (id, select) => {
  if (select) {
    return await User.findById(id).select(select);
  }
  return await User.findById(id);
};

const create = async (userData) => {
  return await User.create(userData);
};

const save = async (userDoc) => {
  return await userDoc.save();
};

const deleteById = async (id) => {
  return await User.findByIdAndDelete(id);
};

module.exports = {
  findByEmail,
  findById,
  create,
  save,
  deleteById,
};
