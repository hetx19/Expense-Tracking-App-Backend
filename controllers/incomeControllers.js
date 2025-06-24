const xlsx = require("xlsx");
const Income = require("../models/Income");

const addIncome = async (req, res) => {
  const userId = req.user.id;
  try {
    const { icon, source, amount, date } = req.body;

    if (!source || !amount || !date) {
      return res.status(400).json({ message: "Missing Required Fields" });
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
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const getAllIncome = async (req, res) => {
  const userId = req.user.id;
  try {
    const income = await Income.find({ userId }).sort({ date: -1 });

    res.json(income);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const deleteIncome = async (req, res) => {
  try {
    const incomeExists = await Income.findById(req.params.id);

    if (!incomeExists) {
      res.status(400).json({ message: "Income Not Found" });
    } else {
      const deletedIncome = await Income.findByIdAndDelete(req.params.id);

      res.json({ message: "Income Deleted Successfully", deletedIncome });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const downloadIncomeExcel = async (req, res) => {
  const userId = req.user.id;
  try {
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
      "attachment; filename=income-details.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.status(200).send(buffer);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = { addIncome, getAllIncome, deleteIncome, downloadIncomeExcel };
