const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../app');
const Expense = require('../models/Expense');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri, {});

  global.testUserId = new mongoose.Types.ObjectId();
  global.otherUserId = new mongoose.Types.ObjectId();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Expense.deleteMany();
});

global.currentUserId = null;

jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = {
    _id: (global.currentUserId || global.testUserId).toString(),
  };
  next();
});

beforeEach(() => {
  global.currentUserId = global.testUserId;
});

describe('Expense API', () => {
  describe('POST /api/v1/expenses', () => {
    it('should add an expense', async () => {
      const res = await request(app).post('/api/v1/expenses').send({
        icon: '🍕',
        category: 'Food',
        amount: 20,
        date: '2025-07-20',
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe('Food');
      expect(res.body.data.amount).toBe(20);
    });

    it('should fail when required fields are missing', async () => {
      const res = await request(app).post('/api/v1/expenses').send({
        category: '',
        amount: '',
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Missing Required Fields');
    });

    it('should fail when amount is negative', async () => {
      const res = await request(app).post('/api/v1/expenses').send({
        icon: '🍕',
        category: 'Food',
        amount: -20,
        date: '2025-07-20',
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Amount must be a positive number');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'amount',
            message: 'Amount must be a positive number',
          }),
        ])
      );
    });

    it('should fail when date format is invalid', async () => {
      const res = await request(app).post('/api/v1/expenses').send({
        icon: '🍕',
        category: 'Food',
        amount: 20,
        date: 'invalid-date',
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid date format');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'date',
            message: 'Invalid date format',
          }),
        ])
      );
    });

    it('should return 500 if saving expense throws an error', async () => {
      const originalSave = Expense.prototype.save;
      Expense.prototype.save = jest
        .fn()
        .mockRejectedValue(new Error('Mock DB error'));

      const res = await request(app).post('/api/v1/expenses').send({
        icon: '💡',
        category: 'Utilities',
        amount: 60,
        date: '2025-07-20',
      });

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Mock DB error');

      Expense.prototype.save = originalSave;
    });
  });

  describe('GET /api/v1/expenses', () => {
    it('should return all expenses', async () => {
      await Expense.create([
        {
          userId: global.testUserId,
          icon: '✈️',
          category: 'Travel',
          amount: 100,
          date: new Date(),
        },
        {
          userId: global.testUserId,
          icon: '🍕',
          category: 'Food',
          amount: 50,
          date: new Date(),
        },
      ]);

      const res = await request(app).get('/api/v1/expenses');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta).toEqual({
        nextCursor: null,
        hasMore: false,
      });
    });

    it('should support cursor-based pagination with 25 records', async () => {
      const baseDate = new Date('2025-01-01T00:00:00.000Z');
      const expenses = Array.from({ length: 25 }, (_, i) => ({
        userId: global.testUserId,
        icon: '💵',
        category: `Category ${i + 1}`,
        amount: (i + 1) * 10,
        date: new Date(baseDate.getTime() + i * 1000 * 60),
      }));
      await Expense.insertMany(expenses);

      // Page 1: Request limit=20
      const res1 = await request(app).get('/api/v1/expenses?limit=20');
      expect(res1.statusCode).toBe(200);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data).toHaveLength(20);
      expect(res1.body.meta.hasMore).toBe(true);
      expect(res1.body.meta.nextCursor).toBeDefined();
      expect(typeof res1.body.meta.nextCursor).toBe('string');

      const nextCursor = res1.body.meta.nextCursor;
      expect(nextCursor).toBe(res1.body.data[19]._id);

      // Page 2: Request limit=20 with cursor
      const res2 = await request(app).get(
        `/api/v1/expenses?limit=20&cursor=${nextCursor}`
      );
      expect(res2.statusCode).toBe(200);
      expect(res2.body.success).toBe(true);
      expect(res2.body.data).toHaveLength(5);
      expect(res2.body.meta.hasMore).toBe(false);
      expect(res2.body.meta.nextCursor).toBeNull();

      // Ensure no overlapping ids and all 25 returned
      const page1Ids = res1.body.data.map((d) => d._id);
      const page2Ids = res2.body.data.map((d) => d._id);
      const allIds = [...page1Ids, ...page2Ids];
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(25);
    });

    it('should filter expenses by category', async () => {
      await Expense.create([
        {
          userId: global.testUserId,
          category: 'Food',
          amount: 20,
          date: new Date('2026-01-10'),
        },
        {
          userId: global.testUserId,
          category: 'Travel',
          amount: 50,
          date: new Date('2026-01-11'),
        },
        {
          userId: global.testUserId,
          category: 'Food',
          amount: 30,
          date: new Date('2026-01-12'),
        },
      ]);

      const res = await request(app).get('/api/v1/expenses?category=Food');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every((item) => item.category === 'Food')).toBe(
        true
      );
    });

    it('should filter expenses by date range (from and to)', async () => {
      await Expense.create([
        {
          userId: global.testUserId,
          category: 'Food',
          amount: 10,
          date: new Date('2026-01-05'),
        },
        {
          userId: global.testUserId,
          category: 'Food',
          amount: 20,
          date: new Date('2026-02-15'),
        },
        {
          userId: global.testUserId,
          category: 'Food',
          amount: 30,
          date: new Date('2026-03-20'),
        },
      ]);

      const res = await request(app).get(
        '/api/v1/expenses?from=2026-02-01&to=2026-02-28'
      );
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].amount).toBe(20);
    });

    it('should sort expenses by amount ascending and descending', async () => {
      await Expense.create([
        {
          userId: global.testUserId,
          category: 'Food',
          amount: 10,
          date: new Date('2026-01-01'),
        },
        {
          userId: global.testUserId,
          category: 'Travel',
          amount: 100,
          date: new Date('2026-01-02'),
        },
        {
          userId: global.testUserId,
          category: 'Utilities',
          amount: 50,
          date: new Date('2026-01-03'),
        },
      ]);

      // Ascending sort
      const resAsc = await request(app).get('/api/v1/expenses?sort=amount');
      expect(resAsc.statusCode).toBe(200);
      expect(resAsc.body.data.map((d) => d.amount)).toEqual([10, 50, 100]);

      // Descending sort
      const resDesc = await request(app).get('/api/v1/expenses?sort=-amount');
      expect(resDesc.statusCode).toBe(200);
      expect(resDesc.body.data.map((d) => d.amount)).toEqual([100, 50, 10]);
    });

    it('should filter and sort expenses in combination', async () => {
      await Expense.create([
        {
          userId: global.testUserId,
          category: 'Food',
          amount: 15,
          date: new Date('2026-01-10'),
        },
        {
          userId: global.testUserId,
          category: 'Food',
          amount: 45,
          date: new Date('2026-01-20'),
        },
        {
          userId: global.testUserId,
          category: 'Travel',
          amount: 90,
          date: new Date('2026-01-15'),
        },
        {
          userId: global.testUserId,
          category: 'Food',
          amount: 30,
          date: new Date('2026-02-10'),
        },
      ]);

      const res = await request(app).get(
        '/api/v1/expenses?category=Food&from=2026-01-01&to=2026-01-31&sort=-amount'
      );
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].amount).toBe(45);
      expect(res.body.data[1].amount).toBe(15);
    });

    it('should return 400 when query validation fails (invalid sort or date)', async () => {
      // Invalid sort
      const resSort = await request(app).get(
        '/api/v1/expenses?sort=invalid_sort'
      );
      expect(resSort.statusCode).toBe(400);
      expect(resSort.body.success).toBe(false);
      expect(resSort.body.error.message).toContain('Invalid sort parameter');

      // Invalid date format
      const resDate = await request(app).get('/api/v1/expenses?from=not-a-date');
      expect(resDate.statusCode).toBe(400);
      expect(resDate.body.success).toBe(false);
      expect(resDate.body.error.message).toBe('Invalid from date format');

      // from date after to date
      const resRange = await request(app).get(
        '/api/v1/expenses?from=2026-02-01&to=2026-01-01'
      );
      expect(resRange.statusCode).toBe(400);
      expect(resRange.body.success).toBe(false);
      expect(resRange.body.error.message).toBe(
        "'from' date must be before or equal to 'to' date"
      );
    });

    it('should return 500 if getting expenses throws an error', async () => {
      const originalFind = Expense.find;
      Expense.find = jest.fn(() => ({
        sort: jest.fn(() => ({
          limit: jest.fn().mockRejectedValue(new Error('Mock get error')),
        })),
      }));

      const res = await request(app).get('/api/v1/expenses');

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Mock get error');

      Expense.find = originalFind;
    });
  });

  describe('DELETE /api/v1/expenses/:id', () => {
    it('should delete an expense', async () => {
      const expense = await Expense.create({
        userId: global.testUserId,
        icon: '📚',
        category: 'Books',
        amount: 30,
        date: new Date(),
      });

      const res = await request(app).delete(`/api/v1/expenses/${expense._id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('Expense Deleted Successfully');
    });

    it('should return 404 if expense not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).delete(`/api/v1/expenses/${fakeId}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Expense Not Found');
    });

    it("should not delete another user's expense", async () => {
      const expense = await Expense.create({
        userId: global.testUserId,
        icon: '🍕',
        category: 'Food',
        amount: 20,
        date: new Date(),
      });

      global.currentUserId = global.otherUserId;

      const res = await request(app).delete(`/api/v1/expenses/${expense._id}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Expense Not Found');

      const stillExists = await Expense.findById(expense._id);
      expect(stillExists).not.toBeNull();
    });

    it('should return 500 if deleteExpense throws an error', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const originalFindOneAndDelete = Expense.findOneAndDelete;

      Expense.findOneAndDelete = jest.fn().mockImplementation(() => {
        throw new Error('Mock delete error');
      });

      const res = await request(app).delete(`/api/v1/expenses/${fakeId}`);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Mock delete error');

      Expense.findOneAndDelete = originalFindOneAndDelete;
    });
  });

  describe('GET /api/v1/expenses/download', () => {
    it('should download expense data as Excel', async () => {
      await Expense.create({
        userId: global.testUserId,
        icon: '🏋️',
        category: 'Gym',
        amount: 45,
        date: new Date(),
      });

      const res = await request(app).get('/api/v1/expenses/download');
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(res.headers['content-disposition']).toContain(
        'attachment; filename=expense-details.xlsx'
      );
    });

    it('should return 500 if Excel generation throws an error', async () => {
      const originalFind = Expense.find;
      Expense.find = jest.fn(() => ({
        sort: jest.fn().mockRejectedValue(new Error('Mock Excel error')),
      }));

      const res = await request(app).get('/api/v1/expenses/download');

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Mock Excel error');

      Expense.find = originalFind;
    });
  });
});
