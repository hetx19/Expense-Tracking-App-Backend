const Expense = require("../models/Expense");

const findByUser = async (userId) => {
  return await Expense.find({ userId }).sort({ date: -1 });
};

const findOwnedById = async (id, userId) => {
  return await Expense.findOne({ _id: id, userId });
};

const create = async (expenseData) => {
  const expense = new Expense(expenseData);
  return await expense.save();
};

const deleteOwned = async (id, userId) => {
  return await Expense.findOneAndDelete({ _id: id, userId });
};

module.exports = {
  findByUser,
  findOwnedById,
  create,
  deleteOwned,
};
