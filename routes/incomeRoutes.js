const express = require("express");
const protect = require("../middleware/auth");
const {
  addIncome,
  getAllIncome,
  deleteIncome,
  downloadIncomeExcel,
} = require("../controllers/incomeControllers");

const router = express.Router();

router.get("/", protect, getAllIncome);
router.post("/add", protect, addIncome);
router.delete("/:id", protect, deleteIncome);
router.get("/download", protect, downloadIncomeExcel);

module.exports = router;
