const mongoose = require("mongoose");
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

const deleteByUser = async (userId) => {
  return await Expense.deleteMany({ userId });
};

const getTotalAmount = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(String(userId));
  const result = await Expense.aggregate([
    { $match: { userId: userObjectId } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return result[0]?.total || 0;
};

const findSinceDate = async (userId, startDate) => {
  return await Expense.find({
    userId,
    date: { $gte: startDate },
  }).sort({ date: -1 });
};

const findRecent = async (userId, limit) => {
  return await Expense.find({ userId }).sort({ date: -1 }).limit(limit);
};

module.exports = {
  findByUser,
  findOwnedById,
  create,
  deleteOwned,
  deleteByUser,
  getTotalAmount,
  findSinceDate,
  findRecent,
};
