const expenseService = require("../services/expense.service");
const asyncHandler = require("../utils/asyncHandler");

const addExpense = asyncHandler(async (req, res) => {
  const newExpense = await expenseService.addExpense({
    userId: req.user._id,
    ...req.body,
  });
  res.status(200).json(newExpense);
});

const getAllExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.getAllExpenses(req.user._id);
  res.json(expense);
});

const deleteExpense = asyncHandler(async (req, res) => {
  const deletedExpense = await expenseService.deleteExpense(
    req.params.id,
    req.user._id,
  );
  res.json({
    message: "Expense Deleted Successfully",
    deletedExpense,
  });
});

const downloadExpenseExcel = asyncHandler(async (req, res) => {
  const buffer = await expenseService.generateExpenseExcel(req.user._id);
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=expense-details.xlsx",
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.status(200).send(buffer);
});

module.exports = {
  addExpense,
  getAllExpense,
  deleteExpense,
  downloadExpenseExcel,
};
