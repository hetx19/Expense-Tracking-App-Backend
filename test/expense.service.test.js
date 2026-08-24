const expenseService = require("../services/expense.service");
const expenseRepository = require("../repositories/expense.repository");
const AppError = require("../utils/AppError");

jest.mock("../repositories/expense.repository");

describe("Expense Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("addExpense", () => {
    it("should create and return a new expense", async () => {
      const mockExpense = {
        _id: "expense123",
        userId: "user123",
        icon: "🍕",
        category: "Food",
        amount: 25,
        date: new Date("2025-07-20"),
      };

      expenseRepository.create.mockResolvedValue(mockExpense);

      const result = await expenseService.addExpense({
        userId: "user123",
        icon: "🍕",
        category: "Food",
        amount: 25,
        date: "2025-07-20",
      });

      expect(expenseRepository.create).toHaveBeenCalledWith({
        userId: "user123",
        icon: "🍕",
        category: "Food",
        amount: 25,
        date: new Date("2025-07-20"),
      });
      expect(result).toEqual(mockExpense);
    });
  });

  describe("getAllExpenses", () => {
    it("should return expenses for a given user", async () => {
      const mockExpenses = [
        { _id: "exp1", category: "Food", amount: 10 },
        { _id: "exp2", category: "Transport", amount: 15 },
      ];

      expenseRepository.findByUser.mockResolvedValue(mockExpenses);

      const result = await expenseService.getAllExpenses("user123");

      expect(expenseRepository.findByUser).toHaveBeenCalledWith("user123");
      expect(result).toEqual(mockExpenses);
    });
  });

  describe("deleteExpense", () => {
    it("should delete and return expense when found", async () => {
      const mockDeleted = { _id: "exp1", category: "Food", amount: 10 };
      expenseRepository.deleteOwned.mockResolvedValue(mockDeleted);

      const result = await expenseService.deleteExpense("exp1", "user123");

      expect(expenseRepository.deleteOwned).toHaveBeenCalledWith("exp1", "user123");
      expect(result).toEqual(mockDeleted);
    });

    it("should throw AppError 404 when expense to delete is not found", async () => {
      expenseRepository.deleteOwned.mockResolvedValue(null);

      await expect(
        expenseService.deleteExpense("nonexistent", "user123")
      ).rejects.toThrow(new AppError("Expense Not Found", 404));

      expect(expenseRepository.deleteOwned).toHaveBeenCalledWith(
        "nonexistent",
        "user123"
      );
    });
  });

  describe("generateExpenseExcel", () => {
    it("should generate and return Excel buffer for user expenses", async () => {
      const mockExpenses = [
        { category: "Gym", amount: 50, date: new Date("2025-07-20") },
      ];

      expenseRepository.findByUser.mockResolvedValue(mockExpenses);

      const buffer = await expenseService.generateExpenseExcel("user123");

      expect(expenseRepository.findByUser).toHaveBeenCalledWith("user123");
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
