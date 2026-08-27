const incomeService = require("../services/income.service");
const asyncHandler = require("../utils/asyncHandler");

const addIncome = asyncHandler(async (req, res) => {
  const newIncome = await incomeService.addIncome({
    userId: req.user._id,
    ...req.body,
  });
  res.status(200).json(newIncome);
});

const getAllIncome = asyncHandler(async (req, res) => {
  const income = await incomeService.getAllIncome(req.user._id);
  res.json(income);
});

const deleteIncome = asyncHandler(async (req, res) => {
  const deletedIncome = await incomeService.deleteIncome(
    req.params.id,
    req.user._id,
  );
  res.json({ message: "Income Deleted Successfully", deletedIncome });
});

const downloadIncomeExcel = asyncHandler(async (req, res) => {
  const buffer = await incomeService.generateIncomeExcel(req.user._id);
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

module.exports = {
  addIncome,
  getAllIncome,
  deleteIncome,
  downloadIncomeExcel,
};
