const express = require("express");
const protect = require("../middleware/auth");
const {
  addExpense,
  getAllExpense,
  deleteExpense,
  downloadExpenseExcel,
} = require("../controllers/expenseControllers");

const router = express.Router();

router.get("/", protect, getAllExpense);
router.post("/add", protect, addExpense);
router.delete("/:id", protect, deleteExpense);
router.get("/download", protect, downloadExpenseExcel);

module.exports = router;
