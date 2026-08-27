const express = require('express');
const protect = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  addExpenseSchema,
  listExpenseQuerySchema,
} = require('../controllers/expense.validation');
const {
  addExpense,
  getAllExpense,
  deleteExpense,
  downloadExpenseExcel,
} = require('../controllers/expenseControllers');

const router = express.Router();

router.get(
  '/',
  protect,
  validate(listExpenseQuerySchema, 'query'),
  getAllExpense
);
router.post('/', protect, validate(addExpenseSchema), addExpense);
router.delete('/:id', protect, deleteExpense);
router.get('/download', protect, downloadExpenseExcel);

module.exports = router;
