const mongoose = require('mongoose');
const Income = require('../models/Income');

const findByUser = async (
  userId,
  { limit = 20, cursor, all = false } = {}
) => {
  if (all) {
    const items = await Income.find({ userId }).sort({ date: -1, _id: -1 });
    return { data: items, meta: { nextCursor: null, hasMore: false } };
  }

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const query = { userId };

  if (cursor) {
    if (!mongoose.Types.ObjectId.isValid(cursor)) {
      return { data: [], meta: { nextCursor: null, hasMore: false } };
    }
    const cursorDoc = await Income.findById(cursor);
    if (!cursorDoc) {
      return { data: [], meta: { nextCursor: null, hasMore: false } };
    }
    query.$or = [
      { date: { $lt: cursorDoc.date } },
      { date: cursorDoc.date, _id: { $lt: cursorDoc._id } },
    ];
  }

  const items = await Income.find(query)
    .sort({ date: -1, _id: -1 })
    .limit(parsedLimit + 1);

  const hasMore = items.length > parsedLimit;
  const data = hasMore ? items.slice(0, parsedLimit) : items;
  const nextCursor =
    hasMore && data.length > 0 ? data[data.length - 1]._id.toString() : null;

  return {
    data,
    meta: {
      nextCursor,
      hasMore,
    },
  };
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
