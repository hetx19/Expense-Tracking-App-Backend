const incomeService = require("../services/income.service");
const incomeRepository = require("../repositories/income.repository");
const AppError = require("../utils/AppError");

jest.mock("../repositories/income.repository");

describe("Income Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("addIncome", () => {
    it("should create and return a new income", async () => {
      const mockIncome = {
        _id: "income123",
        userId: "user123",
        icon: "💼",
        source: "Salary",
        amount: 5000,
        date: new Date("2025-07-20"),
      };

      incomeRepository.create.mockResolvedValue(mockIncome);

      const result = await incomeService.addIncome({
        userId: "user123",
        icon: "💼",
        source: "Salary",
        amount: 5000,
        date: "2025-07-20",
      });

      expect(incomeRepository.create).toHaveBeenCalledWith({
        userId: "user123",
        icon: "💼",
        source: "Salary",
        amount: 5000,
        date: new Date("2025-07-20"),
      });
      expect(result).toEqual(mockIncome);
    });
  });

  describe("getAllIncome", () => {
    it("should return income for a given user", async () => {
      const mockIncomes = [
        { _id: "inc1", source: "Salary", amount: 5000 },
        { _id: "inc2", source: "Freelance", amount: 1200 },
      ];

      incomeRepository.findByUser.mockResolvedValue(mockIncomes);

      const result = await incomeService.getAllIncome("user123");

      expect(incomeRepository.findByUser).toHaveBeenCalledWith("user123");
      expect(result).toEqual(mockIncomes);
    });
  });

  describe("deleteIncome", () => {
    it("should delete and return income when found", async () => {
      const mockDeleted = { _id: "inc1", source: "Salary", amount: 5000 };
      incomeRepository.deleteOwned.mockResolvedValue(mockDeleted);

      const result = await incomeService.deleteIncome("inc1", "user123");

      expect(incomeRepository.deleteOwned).toHaveBeenCalledWith("inc1", "user123");
      expect(result).toEqual(mockDeleted);
    });

    it("should throw AppError 404 when income to delete is not found", async () => {
      incomeRepository.deleteOwned.mockResolvedValue(null);

      await expect(
        incomeService.deleteIncome("nonexistent", "user123")
      ).rejects.toThrow(new AppError("Income Not Found", 404));

      expect(incomeRepository.deleteOwned).toHaveBeenCalledWith(
        "nonexistent",
        "user123"
      );
    });
  });

  describe("generateIncomeExcel", () => {
    it("should generate and return Excel buffer for user income", async () => {
      const mockIncomes = [
        { source: "Salary", amount: 5000, date: new Date("2025-07-20") },
      ];

      incomeRepository.findByUser.mockResolvedValue(mockIncomes);

      const buffer = await incomeService.generateIncomeExcel("user123");

      expect(incomeRepository.findByUser).toHaveBeenCalledWith("user123");
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
