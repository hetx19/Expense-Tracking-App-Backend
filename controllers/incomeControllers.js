const incomeService = require('../services/income.service');
const asyncHandler = require('../utils/asyncHandler');

const addIncome = asyncHandler(async (req, res) => {
  const data = await incomeService.addIncome({
    userId: req.user._id,
    ...req.body,
  });
  res.status(201).json({ success: true, data });
});

const getAllIncome = asyncHandler(async (req, res) => {
  const data = await incomeService.getAllIncome(req.user._id);
  res.status(200).json({ success: true, data });
});

const deleteIncome = asyncHandler(async (req, res) => {
  const deletedIncome = await incomeService.deleteIncome(
    req.params.id,
    req.user._id
  );
  res.status(200).json({
    success: true,
    data: { message: 'Income Deleted Successfully', deletedIncome },
  });
});

const downloadIncomeExcel = asyncHandler(async (req, res) => {
  const buffer = await incomeService.generateIncomeExcel(req.user._id);
  res.setHeader(
    'Content-Disposition',
    'attachment; filename=income-details.xlsx'
  );
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.status(200).send(buffer);
});

module.exports = {
  addIncome,
  getAllIncome,
  deleteIncome,
  downloadIncomeExcel,
};
