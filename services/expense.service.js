const expenseRepository = require("../repositories/expense.repository");
const transactionService = require("./transaction.service");

const addExpense = async ({ userId, icon, category, amount, date }) => {
  return await transactionService.addTransaction(expenseRepository, {
    userId,
    icon,
    category,
    amount,
    date,
  });
};

const getAllExpenses = async (userId) => {
  return await transactionService.getTransactionsByUser(
    expenseRepository,
    userId,
  );
};

const deleteExpense = async (id, userId) => {
  return await transactionService.deleteTransaction(
    expenseRepository,
    id,
    userId,
    "Expense",
  );
};

const generateExpenseExcel = async (userId) => {
  return await transactionService.generateTransactionExcel(
    expenseRepository,
    userId,
    "Expense",
    (item) => ({
      Category: item.category,
      Amount: item.amount,
      Date: item.date,
    }),
  );
};

module.exports = {
  addExpense,
  getAllExpenses,
  deleteExpense,
  generateExpenseExcel,
};
