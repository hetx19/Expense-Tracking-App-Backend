const dashboardService = require("../services/dashboard.service");
const expenseRepository = require("../repositories/expense.repository");
const incomeRepository = require("../repositories/income.repository");

jest.mock("../repositories/expense.repository");
jest.mock("../repositories/income.repository");

describe("Dashboard Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getDashboardData", () => {
    it("should calculate and aggregate user dashboard metrics", async () => {
      incomeRepository.getTotalAmount.mockResolvedValue(5000);
      expenseRepository.getTotalAmount.mockResolvedValue(1500);

      const incomeTransactions = [
        { amount: 3000, date: new Date("2025-07-01") },
        { amount: 2000, date: new Date("2025-06-15") },
      ];
      incomeRepository.findSinceDate.mockResolvedValue(incomeTransactions);

      const expenseTransactions = [
        { amount: 1000, date: new Date("2025-07-10") },
        { amount: 500, date: new Date("2025-07-05") },
      ];
      expenseRepository.findSinceDate.mockResolvedValue(expenseTransactions);

      const mockIncomeDoc = {
        toObject: () => ({ _id: "inc1", amount: 3000, date: new Date("2025-07-01") }),
      };
      const mockExpenseDoc = {
        toObject: () => ({ _id: "exp1", amount: 1000, date: new Date("2025-07-10") }),
      };

      incomeRepository.findRecent.mockResolvedValue([mockIncomeDoc]);
      expenseRepository.findRecent.mockResolvedValue([mockExpenseDoc]);

      const result = await dashboardService.getDashboardData("user123");

      expect(incomeRepository.getTotalAmount).toHaveBeenCalledWith("user123");
      expect(expenseRepository.getTotalAmount).toHaveBeenCalledWith("user123");
      expect(incomeRepository.findSinceDate).toHaveBeenCalledWith("user123", expect.any(Date));
      expect(expenseRepository.findSinceDate).toHaveBeenCalledWith("user123", expect.any(Date));
      expect(incomeRepository.findRecent).toHaveBeenCalledWith("user123", 5);
      expect(expenseRepository.findRecent).toHaveBeenCalledWith("user123", 5);

      expect(result.totalBalance).toBe(3500);
      expect(result.totalIncome).toBe(5000);
      expect(result.totalExpenses).toBe(1500);

      expect(result.last60DaysIncome.total).toBe(5000);
      expect(result.last60DaysIncome.transactions).toEqual(incomeTransactions);

      expect(result.last30DaysExpenses.total).toBe(1500);
      expect(result.last30DaysExpenses.transactions).toEqual(expenseTransactions);

      expect(result.recentTransactions).toHaveLength(2);
      expect(result.recentTransactions[0]._id).toBe("exp1");
      expect(result.recentTransactions[0].type).toBe("expense");
      expect(result.recentTransactions[1]._id).toBe("inc1");
      expect(result.recentTransactions[1].type).toBe("income");
    });
  });
});
