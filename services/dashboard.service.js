const expenseRepository = require('../repositories/expense.repository');
const incomeRepository = require('../repositories/income.repository');

const getDashboardData = async (userId) => {
  const totalIncome = await incomeRepository.getTotalAmount(userId);
  const totalExpenses = await expenseRepository.getTotalAmount(userId);

  const last60DaysDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const last60DaysIncomeTransactions = await incomeRepository.findSinceDate(
    userId,
    last60DaysDate
  );
  const incomeLast60Days = last60DaysIncomeTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0
  );

  const last30DaysDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const last30DaysExpenseTransactions = await expenseRepository.findSinceDate(
    userId,
    last30DaysDate
  );
  const expenseLast30Days = last30DaysExpenseTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0
  );

  const recentIncomes = await incomeRepository.findRecent(userId, 5);
  const recentExpenses = await expenseRepository.findRecent(userId, 5);

  const recentTransactions = [
    ...recentIncomes.map((transaction) => ({
      ...transaction.toObject(),
      type: 'income',
    })),
    ...recentExpenses.map((transaction) => ({
      ...transaction.toObject(),
      type: 'expense',
    })),
  ].sort((a, b) => b.date - a.date);

  return {
    totalBalance: totalIncome - totalExpenses,
    totalIncome,
    totalExpenses,
    last30DaysExpenses: {
      total: expenseLast30Days,
      transactions: last30DaysExpenseTransactions,
    },
    last60DaysIncome: {
      total: incomeLast60Days,
      transactions: last60DaysIncomeTransactions,
    },
    recentTransactions,
  };
};

module.exports = {
  getDashboardData,
};
