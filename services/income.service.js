const incomeRepository = require('../repositories/income.repository');
const transactionService = require('./transaction.service');

const addIncome = async ({ userId, icon, source, amount, date }) => {
  return await transactionService.addTransaction(incomeRepository, {
    userId,
    icon,
    source,
    amount,
    date,
  });
};

const getAllIncome = async (userId, options) => {
  return await transactionService.getTransactionsByUser(
    incomeRepository,
    userId,
    options
  );
};

const deleteIncome = async (id, userId) => {
  return await transactionService.deleteTransaction(
    incomeRepository,
    id,
    userId,
    'Income'
  );
};

const generateIncomeExcel = async (userId) => {
  return await transactionService.generateTransactionExcel(
    incomeRepository,
    userId,
    'Income',
    (item) => ({
      Source: item.source,
      Amount: item.amount,
      Date: item.date,
    })
  );
};

const deleteAllIncomeByUser = async (userId) => {
  return await incomeRepository.deleteByUser(userId);
};

module.exports = {
  addIncome,
  getAllIncome,
  deleteIncome,
  generateIncomeExcel,
  deleteAllIncomeByUser,
};
