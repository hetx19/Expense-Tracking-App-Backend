// ✅ MOCK THE AUTH MIDDLEWARE FIRST
jest.mock("../middleware/auth", () => (req, res, next) => {
  req.user = { id: "60f6f6f6f6f6f6f6f6f6f6f6" }; // Fake user ObjectId
  next();
});

const request = require("supertest");
const app = require("../app");

jest.mock("../models/Income");
jest.mock("../models/Expense");

const Income = require("../models/Income");
const Expense = require("../models/Expense");

describe("GET /api/dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return dashboard data successfully", async () => {
    const now = new Date();

    const incomeTransactions = [
      {
        amount: 1000,
        date: now,
        toObject: () => ({ amount: 1000, date: now }),
      },
    ];
    const expenseTransactions = [
      { amount: 500, date: now, toObject: () => ({ amount: 500, date: now }) },
    ];

    Income.aggregate.mockResolvedValue([{ total: 3000 }]);
    Expense.aggregate.mockResolvedValue([{ total: 1500 }]);

    Income.find.mockImplementation((query) => {
      if (query.date) {
        return { sort: () => Promise.resolve(incomeTransactions) };
      }
      return {
        sort: () => ({
          limit: () =>
            Promise.resolve(
              incomeTransactions.map((t) => ({
                ...t,
                toObject: () => ({ amount: t.amount, date: t.date }),
              }))
            ),
        }),
      };
    });

    Expense.find.mockImplementation((query) => {
      if (query.date) {
        return { sort: () => Promise.resolve(expenseTransactions) };
      }
      return {
        sort: () => ({
          limit: () =>
            Promise.resolve(
              expenseTransactions.map((t) => ({
                ...t,
                toObject: () => ({ amount: t.amount, date: t.date }),
              }))
            ),
        }),
      };
    });

    const response = await request(app).get("/api/dashboard");

    expect(response.status).toBe(200);
    expect(response.body.totalBalance).toBe(1500);
    expect(response.body.totalIncome).toBe(3000);
    expect(response.body.totalExpenses).toBe(1500);
    expect(response.body.last60DaysIncome.total).toBe(1000);
    expect(response.body.last30DaysExpenses.total).toBe(500);
    expect(Array.isArray(response.body.recentTransactions)).toBe(true);
  });

  it("should handle server error gracefully", async () => {
    Income.aggregate.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/api/dashboard");

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "Server Error");
    expect(response.body).toHaveProperty("error");
  });
});
