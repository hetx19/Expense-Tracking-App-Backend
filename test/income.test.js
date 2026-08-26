const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../app');
const Income = require('../models/Income');

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
  await Income.deleteMany();
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

describe('Income API', () => {
  describe('POST /api/v1/incomes', () => {
    it('should add an income', async () => {
      const res = await request(app).post('/api/v1/incomes').send({
        icon: '💰',
        source: 'Freelance',
        amount: 2000,
        date: '2025-07-20',
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.source).toBe('Freelance');
      expect(res.body.data.amount).toBe(2000);
    });

    it('should fail when required fields are missing', async () => {
      const res = await request(app).post('/api/v1/incomes').send({
        source: '',
        amount: '',
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Missing Required Fields');
    });

    it('should fail when amount is negative', async () => {
      const res = await request(app).post('/api/v1/incomes').send({
        icon: '💰',
        source: 'Freelance',
        amount: -100,
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
      const res = await request(app).post('/api/v1/incomes').send({
        icon: '💰',
        source: 'Freelance',
        amount: 2000,
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

    it('should return 500 if saving income throws an error', async () => {
      const originalSave = Income.prototype.save;
      Income.prototype.save = jest
        .fn()
        .mockRejectedValue(new Error('Mock DB error'));

      const res = await request(app).post('/api/v1/incomes').send({
        icon: '💰',
        source: 'Freelance',
        amount: 2000,
        date: '2025-07-20',
      });

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Mock DB error');

      Income.prototype.save = originalSave;
    });
  });

  describe('GET /api/v1/incomes', () => {
    it('should return all incomes', async () => {
      await Income.create([
        {
          userId: global.testUserId,
          icon: '💰',
          source: 'Freelance',
          amount: 2000,
          date: new Date(),
        },
        {
          userId: global.testUserId,
          icon: '💼',
          source: 'Job',
          amount: 3000,
          date: new Date(),
        },
      ]);

      const res = await request(app).get('/api/v1/incomes');
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
      const incomes = Array.from({ length: 25 }, (_, i) => ({
        userId: global.testUserId,
        icon: '💼',
        source: `Source ${i + 1}`,
        amount: (i + 1) * 100,
        date: new Date(baseDate.getTime() + i * 1000 * 60),
      }));
      await Income.insertMany(incomes);

      // Page 1: Request limit=20
      const res1 = await request(app).get('/api/v1/incomes?limit=20');
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
        `/api/v1/incomes?limit=20&cursor=${nextCursor}`
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

    it('should filter income by source', async () => {
      await Income.create([
        {
          userId: global.testUserId,
          source: 'Salary',
          amount: 5000,
          date: new Date('2026-01-10'),
        },
        {
          userId: global.testUserId,
          source: 'Freelance',
          amount: 1000,
          date: new Date('2026-01-11'),
        },
        {
          userId: global.testUserId,
          source: 'Salary',
          amount: 5500,
          date: new Date('2026-01-12'),
        },
      ]);

      const res = await request(app).get('/api/v1/incomes?source=Salary');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every((item) => item.source === 'Salary')).toBe(true);
    });

    it('should filter income by date range (from and to)', async () => {
      await Income.create([
        {
          userId: global.testUserId,
          source: 'Salary',
          amount: 2000,
          date: new Date('2026-01-05'),
        },
        {
          userId: global.testUserId,
          source: 'Freelance',
          amount: 1500,
          date: new Date('2026-02-15'),
        },
        {
          userId: global.testUserId,
          source: 'Investments',
          amount: 800,
          date: new Date('2026-03-20'),
        },
      ]);

      const res = await request(app).get(
        '/api/v1/incomes?from=2026-02-01&to=2026-02-28'
      );
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].amount).toBe(1500);
    });

    it('should sort income by amount ascending and descending', async () => {
      await Income.create([
        {
          userId: global.testUserId,
          source: 'Dividends',
          amount: 100,
          date: new Date('2026-01-01'),
        },
        {
          userId: global.testUserId,
          source: 'Salary',
          amount: 5000,
          date: new Date('2026-01-02'),
        },
        {
          userId: global.testUserId,
          source: 'Freelance',
          amount: 1200,
          date: new Date('2026-01-03'),
        },
      ]);

      // Ascending sort
      const resAsc = await request(app).get('/api/v1/incomes?sort=amount');
      expect(resAsc.statusCode).toBe(200);
      expect(resAsc.body.data.map((d) => d.amount)).toEqual([100, 1200, 5000]);

      // Descending sort
      const resDesc = await request(app).get('/api/v1/incomes?sort=-amount');
      expect(resDesc.statusCode).toBe(200);
      expect(resDesc.body.data.map((d) => d.amount)).toEqual([5000, 1200, 100]);
    });

    it('should filter and sort income in combination', async () => {
      await Income.create([
        {
          userId: global.testUserId,
          source: 'Freelance',
          amount: 400,
          date: new Date('2026-01-10'),
        },
        {
          userId: global.testUserId,
          source: 'Freelance',
          amount: 900,
          date: new Date('2026-01-20'),
        },
        {
          userId: global.testUserId,
          source: 'Salary',
          amount: 5000,
          date: new Date('2026-01-15'),
        },
        {
          userId: global.testUserId,
          source: 'Freelance',
          amount: 600,
          date: new Date('2026-02-10'),
        },
      ]);

      const res = await request(app).get(
        '/api/v1/incomes?source=Freelance&from=2026-01-01&to=2026-01-31&sort=-amount'
      );
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].amount).toBe(900);
      expect(res.body.data[1].amount).toBe(400);
    });

    it('should return 400 when query validation fails (invalid sort or date)', async () => {
      // Invalid sort
      const resSort = await request(app).get(
        '/api/v1/incomes?sort=invalid_sort'
      );
      expect(resSort.statusCode).toBe(400);
      expect(resSort.body.success).toBe(false);
      expect(resSort.body.error.message).toContain('Invalid sort parameter');

      // Invalid date format
      const resDate = await request(app).get('/api/v1/incomes?from=not-a-date');
      expect(resDate.statusCode).toBe(400);
      expect(resDate.body.success).toBe(false);
      expect(resDate.body.error.message).toBe('Invalid from date format');

      // from date after to date
      const resRange = await request(app).get(
        '/api/v1/incomes?from=2026-02-01&to=2026-01-01'
      );
      expect(resRange.statusCode).toBe(400);
      expect(resRange.body.success).toBe(false);
      expect(resRange.body.error.message).toBe(
        "'from' date must be before or equal to 'to' date"
      );
    });

    it('should return 500 if getting incomes throws an error', async () => {
      const originalFind = Income.find;
      Income.find = jest.fn(() => ({
        sort: jest.fn(() => ({
          limit: jest.fn().mockRejectedValue(new Error('Mock get error')),
        })),
      }));

      const res = await request(app).get('/api/v1/incomes');

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Mock get error');

      Income.find = originalFind;
    });
  });

  describe('DELETE /api/v1/incomes/:id', () => {
    it('should delete an income', async () => {
      const income = await Income.create({
        userId: global.testUserId,
        icon: '💰',
        amount: 1500,
        source: 'Investment',
        date: new Date(),
      });

      const res = await request(app).delete(`/api/v1/incomes/${income._id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('Income Deleted Successfully');
    });

    it('should return 404 if income not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).delete(`/api/v1/incomes/${fakeId}`);
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Income Not Found');
    });

    it("should not delete another user's income", async () => {
      const income = await Income.create({
        userId: global.testUserId,
        icon: '💰',
        source: 'Freelance',
        amount: 2000,
        date: new Date(),
      });

      global.currentUserId = global.otherUserId;

      const res = await request(app).delete(`/api/v1/incomes/${income._id}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Income Not Found');

      const stillExists = await Income.findById(income._id);
      expect(stillExists).not.toBeNull();
    });

    it('should return 500 if deleteIncome throws an error', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const originalFindOneAndDelete = Income.findOneAndDelete;

      Income.findOneAndDelete = jest.fn().mockImplementation(() => {
        throw new Error('Mock delete error');
      });

      const res = await request(app).delete(`/api/v1/incomes/${fakeId}`);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Mock delete error');

      Income.findOneAndDelete = originalFindOneAndDelete;
    });
  });

  describe('GET /api/v1/incomes/download', () => {
    it('should download income data as Excel', async () => {
      await Income.create({
        userId: global.testUserId,
        icon: '💰',
        source: 'Freelance',
        amount: 2000,
        date: new Date(),
      });

      const res = await request(app).get('/api/v1/incomes/download');
      expect(res.statusCode).toBe(200);
      expect(res.header['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(res.header['content-disposition']).toContain(
        'attachment; filename=income-details.xlsx'
      );
    });

    it('should return 500 if Excel generation throws an error', async () => {
      const originalFind = Income.find;
      Income.find = jest.fn(() => ({
        sort: jest.fn().mockRejectedValue(new Error('Mock Excel error')),
      }));

      const res = await request(app).get('/api/v1/incomes/download');

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Mock Excel error');

      Income.find = originalFind;
    });
  });
});
