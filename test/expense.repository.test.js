const expenseRepository = require("../repositories/expense.repository");
const Expense = require("../models/Expense");

jest.mock("../models/Expense");

describe("Expense Repository Unit Tests", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findByUser", () => {
    it("should find expenses by userId sorted by date descending", async () => {
      const mockSort = jest.fn().mockResolvedValue(["exp1", "exp2"]);
      Expense.find.mockReturnValue({ sort: mockSort });

      const result = await expenseRepository.findByUser("user123");

      expect(Expense.find).toHaveBeenCalledWith({ userId: "user123" });
      expect(mockSort).toHaveBeenCalledWith({ date: -1 });
      expect(result).toEqual(["exp1", "exp2"]);
    });
  });

  describe("findOwnedById", () => {
    it("should find an expense by id and userId", async () => {
      const mockExpense = { _id: "exp1", userId: "user123" };
      Expense.findOne.mockResolvedValue(mockExpense);

      const result = await expenseRepository.findOwnedById("exp1", "user123");

      expect(Expense.findOne).toHaveBeenCalledWith({
        _id: "exp1",
        userId: "user123",
      });
      expect(result).toEqual(mockExpense);
    });
  });

  describe("create", () => {
    it("should create and save an expense", async () => {
      const expenseData = { userId: "user123", amount: 100 };
      const saveMock = jest
        .fn()
        .mockResolvedValue({ _id: "exp1", ...expenseData });
      Expense.mockImplementation(() => ({
        save: saveMock,
      }));

      const result = await expenseRepository.create(expenseData);

      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual({ _id: "exp1", ...expenseData });
    });
  });

  describe("deleteOwned", () => {
    it("should find and delete an owned expense", async () => {
      const mockDeleted = { _id: "exp1", userId: "user123" };
      Expense.findOneAndDelete.mockResolvedValue(mockDeleted);

      const result = await expenseRepository.deleteOwned("exp1", "user123");

      expect(Expense.findOneAndDelete).toHaveBeenCalledWith({
        _id: "exp1",
        userId: "user123",
      });
      expect(result).toEqual(mockDeleted);
    });
  });
});
