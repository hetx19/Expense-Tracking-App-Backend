const Income = require("../models/Income");

const findByUser = async (userId) => {
  return await Income.find({ userId }).sort({ date: -1 });
};

const findOwnedById = async (id, userId) => {
  return await Income.findOne({ _id: id, userId });
};

const create = async (incomeData) => {
  const income = new Income(incomeData);
  return await income.save();
};

const deleteOwned = async (id, userId) => {
  return await Income.findOneAndDelete({ _id: id, userId });
};

module.exports = {
  findByUser,
  findOwnedById,
  create,
  deleteOwned,
};
