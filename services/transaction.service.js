const xlsx = require('xlsx');
const AppError = require('../utils/AppError');

const addTransaction = async (repository, data) => {
  const { date, ...rest } = data;
  return await repository.create({
    ...rest,
    date: new Date(date),
  });
};

const getTransactionsByUser = async (repository, userId, options) => {
  return await repository.findByUser(userId, options);
};

const deleteTransaction = async (repository, id, userId, resourceName) => {
  const deletedItem = await repository.deleteOwned(id, userId);
  if (!deletedItem) {
    throw new AppError(`${resourceName} Not Found`, 404);
  }
  return deletedItem;
};

const generateTransactionExcel = async (
  repository,
  userId,
  sheetName,
  mapItem
) => {
  const result = await repository.findByUser(userId, { all: true });
  const items = Array.isArray(result) ? result : result?.data || [];
  const data = items.map(mapItem);

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, sheetName);
  return xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
};

module.exports = {
  addTransaction,
  getTransactionsByUser,
  deleteTransaction,
  generateTransactionExcel,
};
