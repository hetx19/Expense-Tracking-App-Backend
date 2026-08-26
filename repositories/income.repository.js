const mongoose = require('mongoose');
const Income = require('../models/Income');

const getSortConfig = (sortParam) => {
  switch (sortParam) {
    case 'date':
    case '+date':
    case 'date_asc':
    case 'date:asc':
    case 'asc':
      return { sortObj: { date: 1, _id: 1 }, sortField: 'date', sortOrder: 1 };
    case 'amount':
    case '+amount':
    case 'amount_asc':
    case 'amount:asc':
      return {
        sortObj: { amount: 1, _id: 1 },
        sortField: 'amount',
        sortOrder: 1,
      };
    case '-amount':
    case 'amount_desc':
    case 'amount:desc':
      return {
        sortObj: { amount: -1, _id: -1 },
        sortField: 'amount',
        sortOrder: -1,
      };
    case '-date':
    case 'date_desc':
    case 'date:desc':
    case 'desc':
    default:
      return {
        sortObj: { date: -1, _id: -1 },
        sortField: 'date',
        sortOrder: -1,
      };
  }
};

const findByUser = async (
  userId,
  {
    limit = 20,
    cursor,
    source,
    category,
    from,
    to,
    sort = '-date',
    all = false,
  } = {}
) => {
  const query = { userId };

  const sourceFilter = source || category;
  if (sourceFilter) {
    query.source = sourceFilter;
  }

  if (from || to) {
    query.date = {};
    if (from) {
      query.date.$gte = new Date(from);
    }
    if (to) {
      query.date.$lte = new Date(to);
    }
  }

  const { sortObj, sortField, sortOrder } = getSortConfig(sort);

  if (all) {
    const items = await Income.find(query).sort(sortObj);
    return { data: items, meta: { nextCursor: null, hasMore: false } };
  }

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  if (cursor) {
    if (!mongoose.Types.ObjectId.isValid(cursor)) {
      return { data: [], meta: { nextCursor: null, hasMore: false } };
    }
    const cursorDoc = await Income.findById(cursor);
    if (!cursorDoc) {
      return { data: [], meta: { nextCursor: null, hasMore: false } };
    }

    const cursorVal = cursorDoc[sortField];
    if (sortOrder === -1) {
      query.$or = [
        { [sortField]: { $lt: cursorVal } },
        { [sortField]: cursorVal, _id: { $lt: cursorDoc._id } },
      ];
    } else {
      query.$or = [
        { [sortField]: { $gt: cursorVal } },
        { [sortField]: cursorVal, _id: { $gt: cursorDoc._id } },
      ];
    }
  }

  const items = await Income.find(query)
    .sort(sortObj)
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
