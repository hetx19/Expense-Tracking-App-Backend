const mongoose = require('mongoose');
const Income = require('../models/Income');

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

const deleteByUser = async (userId) => {
  return await Income.deleteMany({ userId });
};

const getTotalAmount = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(String(userId));
  const result = await Income.aggregate([
    { $match: { userId: userObjectId } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result[0]?.total || 0;
};

const findSinceDate = async (userId, startDate) => {
  return await Income.find({
    userId,
    date: { $gte: startDate },
  }).sort({ date: -1 });
};

const findRecent = async (userId, limit) => {
  return await Income.find({ userId }).sort({ date: -1 }).limit(limit);
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
