const xlsx = require("xlsx");
const expenseRepository = require("../repositories/expense.repository");
const AppError = require("../utils/AppError");

const addExpense = async ({ userId, icon, category, amount, date }) => {
  return await expenseRepository.create({
    userId,
    icon,
    category,
    amount,
    date: new Date(date),
  });
};

const getAllExpenses = async (userId) => {
  return await expenseRepository.findByUser(userId);
};

const deleteExpense = async (id, userId) => {
  const deletedExpense = await expenseRepository.deleteOwned(id, userId);
  if (!deletedExpense) {
    throw new AppError("Expense Not Found", 404);
  }
  return deletedExpense;
};

const generateExpenseExcel = async (userId) => {
  const expense = await expenseRepository.findByUser(userId);

  const data = expense.map((item) => ({
    Category: item.category,
    Amount: item.amount,
    Date: item.date,
  }));

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, "Expense");
  return xlsx.write(wb, { bookType: "xlsx", type: "buffer" });
};

module.exports = {
  addExpense,
  getAllExpenses,
  deleteExpense,
  generateExpenseExcel,
};
