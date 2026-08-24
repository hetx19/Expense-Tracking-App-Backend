jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = { _id: '60f6f6f6f6f6f6f6f6f6f6f6' };
  next();
});

const request = require('supertest');
const app = require('../app');

jest.mock('../models/Income');
jest.mock('../models/Expense');

const Income = require('../models/Income');
const Expense = require('../models/Expense');

describe('GET /api/v1/dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return dashboard data successfully', async () => {
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

    const response = await request(app).get('/api/v1/dashboard');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.totalBalance).toBe(1500);
    expect(response.body.data.totalIncome).toBe(3000);
    expect(response.body.data.totalExpenses).toBe(1500);
    expect(response.body.data.last60DaysIncome.total).toBe(1000);
    expect(response.body.data.last30DaysExpenses.total).toBe(500);
    expect(Array.isArray(response.body.data.recentTransactions)).toBe(true);
  });

  it('should handle server error gracefully', async () => {
    Income.aggregate.mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/api/v1/dashboard');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toHaveProperty('message', 'Database error');
  });

  it('should return zero totals when user has no transactions', async () => {
    Income.aggregate.mockResolvedValue([]);
    Expense.aggregate.mockResolvedValue([]);

    Income.find.mockImplementation((query) => {
      if (query.date) {
        return { sort: () => Promise.resolve([]) };
      }
      return {
        sort: () => ({
          limit: () => Promise.resolve([]),
        }),
      };
    });

    Expense.find.mockImplementation((query) => {
      if (query.date) {
        return { sort: () => Promise.resolve([]) };
      }
      return {
        sort: () => ({
          limit: () => Promise.resolve([]),
        }),
      };
    });

    const response = await request(app).get('/api/v1/dashboard');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.totalBalance).toBe(0);
    expect(response.body.data.totalIncome).toBe(0);
    expect(response.body.data.totalExpenses).toBe(0);
    expect(response.body.data.last60DaysIncome.total).toBe(0);
    expect(response.body.data.last30DaysExpenses.total).toBe(0);
    expect(response.body.data.recentTransactions).toEqual([]);
  });
});
