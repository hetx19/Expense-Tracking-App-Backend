const xlsx = require("xlsx");
const Income = require("../models/Income");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const addIncome = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { icon, source, amount, date } = req.body;

  if (!source || !amount || !date) {
    throw new AppError("Missing Required Fields", 400);
  }

  const newIcome = new Income({
    userId,
    icon,
    source,
    amount,
    date: new Date(date),
  });

  await newIcome.save();

  res.status(200).json(newIcome);
});

const getAllIncome = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const income = await Income.find({ userId }).sort({ date: -1 });

  res.json(income);
});

const deleteIncome = asyncHandler(async (req, res) => {
  const deletedIncome = await Income.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!deletedIncome) {
    throw new AppError("Income Not Found", 404);
  }

  res.json({
    message: "Income Deleted Successfully",
    deletedIncome,
  });
});

const downloadIncomeExcel = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const income = await Income.find({ userId }).sort({ date: -1 });

  const data = income.map((item) => ({
    Source: item.source,
    Amount: item.amount,
    Date: item.date,
  }));

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, "Income");
  const buffer = xlsx.write(wb, { bookType: "xlsx", type: "buffer" });
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=income-details.xlsx",
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.status(200).send(buffer);
});

module.exports = { addIncome, getAllIncome, deleteIncome, downloadIncomeExcel };
