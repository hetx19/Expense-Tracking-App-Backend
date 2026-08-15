const incomeRepository = require("../repositories/income.repository");
const Income = require("../models/Income");

jest.mock("../models/Income");

describe("Income Repository Unit Tests", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findByUser", () => {
    it("should find income by userId sorted by date descending", async () => {
      const mockSort = jest.fn().mockResolvedValue(["inc1", "inc2"]);
      Income.find.mockReturnValue({ sort: mockSort });

      const result = await incomeRepository.findByUser("user123");

      expect(Income.find).toHaveBeenCalledWith({ userId: "user123" });
      expect(mockSort).toHaveBeenCalledWith({ date: -1 });
      expect(result).toEqual(["inc1", "inc2"]);
    });
  });

  describe("findOwnedById", () => {
    it("should find an income by id and userId", async () => {
      const mockIncome = { _id: "inc1", userId: "user123" };
      Income.findOne.mockResolvedValue(mockIncome);

      const result = await incomeRepository.findOwnedById("inc1", "user123");

      expect(Income.findOne).toHaveBeenCalledWith({
        _id: "inc1",
        userId: "user123",
      });
      expect(result).toEqual(mockIncome);
    });
  });

  describe("create", () => {
    it("should create and save an income", async () => {
      const incomeData = { userId: "user123", amount: 100 };
      const saveMock = jest
        .fn()
        .mockResolvedValue({ _id: "inc1", ...incomeData });
      Income.mockImplementation(() => ({
        save: saveMock,
      }));

      const result = await incomeRepository.create(incomeData);

      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual({ _id: "inc1", ...incomeData });
    });
  });

  describe("deleteOwned", () => {
    it("should find and delete an owned income", async () => {
      const mockDeleted = { _id: "inc1", userId: "user123" };
      Income.findOneAndDelete.mockResolvedValue(mockDeleted);

      const result = await incomeRepository.deleteOwned("inc1", "user123");

      expect(Income.findOneAndDelete).toHaveBeenCalledWith({
        _id: "inc1",
        userId: "user123",
      });
      expect(result).toEqual(mockDeleted);
    });
  });
});
