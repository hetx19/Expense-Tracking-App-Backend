const express = require('express');
const protect = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  addIncomeSchema,
  listIncomeQuerySchema,
} = require('../controllers/income.validation');
const {
  addIncome,
  getAllIncome,
  deleteIncome,
  downloadIncomeExcel,
} = require('../controllers/incomeControllers');

const router = express.Router();

router.get(
  '/',
  protect,
  validate(listIncomeQuerySchema, 'query'),
  getAllIncome
);
router.post('/', protect, validate(addIncomeSchema), addIncome);
router.delete('/:id', protect, deleteIncome);
router.get('/download', protect, downloadIncomeExcel);

module.exports = router;
