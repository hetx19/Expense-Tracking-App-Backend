const xlsx = require("xlsx");
const Expense = require("../models/Expense");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const addExpense = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { icon, category, amount, date } = req.body;

  const newExpense = new Expense({
    userId,
    icon,
    category,
    amount,
    date: new Date(date),
  });

  await newExpense.save();

  res.status(200).json(newExpense);
});

const getAllExpense = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const expense = await Expense.find({ userId }).sort({ date: -1 });

  res.json(expense);
});

const deleteExpense = asyncHandler(async (req, res) => {
  const deletedExpense = await Expense.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!deletedExpense) {
    throw new AppError("Expense Not Found", 404);
  }

  res.json({
    message: "Expense Deleted Successfully",
    deletedExpense,
  });
});

const downloadExpenseExcel = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const expense = await Expense.find({ userId }).sort({ date: -1 });

  const data = expense.map((item) => ({
    Category: item.category,
    Amount: item.amount,
    Date: item.date,
  }));

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, "Expense");
  const buffer = xlsx.write(wb, { bookType: "xlsx", type: "buffer" });
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
