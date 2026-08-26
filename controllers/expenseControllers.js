const expenseService = require('../services/expense.service');
const asyncHandler = require('../utils/asyncHandler');

const addExpense = asyncHandler(async (req, res) => {
  const data = await expenseService.addExpense({
    userId: req.user._id,
    ...req.body,
  });
  res.status(201).json({ success: true, data });
});

const getAllExpense = asyncHandler(async (req, res) => {
  const { limit, cursor, category, from, to, sort } = req.query;
  const { data, meta } = await expenseService.getAllExpenses(req.user._id, {
    limit,
    cursor,
    category,
    from,
    to,
    sort,
  });
  res.status(200).json({ success: true, data, meta });
});

const deleteExpense = asyncHandler(async (req, res) => {
  const deletedExpense = await expenseService.deleteExpense(
    req.params.id,
    req.user._id
  );
  res.status(200).json({
    success: true,
    data: { message: 'Expense Deleted Successfully', deletedExpense },
  });
});

const downloadExpenseExcel = asyncHandler(async (req, res) => {
  const buffer = await expenseService.generateExpenseExcel(req.user._id);
  res.setHeader(
    'Content-Disposition',
    'attachment; filename=expense-details.xlsx'
  );
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.status(200).send(buffer);
});

module.exports = {
  addExpense,
  getAllExpense,
  deleteExpense,
  downloadExpenseExcel,
};
