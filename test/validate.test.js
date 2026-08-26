const { z } = require('zod');
const validate = require('../middleware/validate');
const AppError = require('../utils/AppError');

describe('validate middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
    };
    res = {};
    next = jest.fn();
  });

  it('should call next() and populate req.body with parsed data on success', () => {
    const schema = z.object({
      name: z.string().trim(),
      age: z.number(),
    });

    req.body = { name: '  Alice  ', age: 30 };

    const middleware = validate(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'Alice', age: 30 });
  });

  it('should validate custom request target like query', () => {
    const schema = z.object({
      page: z.coerce.number().positive(),
    });

    req.query = { page: '5' };

    const middleware = validate(schema, 'query');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query).toEqual({ page: 5 });
  });

  it('should pass AppError to next() when validation fails', () => {
    const schema = z.object({
      email: z.string().email('Invalid email format'),
    });

    req.body = { email: 'not-an-email' };

    const middleware = validate(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const errorPassed = next.mock.calls[0][0];
    expect(errorPassed.statusCode).toBe(400);
    expect(errorPassed.message).toBe('Invalid email format');
    expect(errorPassed.details).toEqual([
      { field: 'email', message: 'Invalid email format' },
    ]);
  });

  it('should handle default message if issue message is missing', () => {
    const schema = {
      safeParse: () => ({
        success: false,
        error: {
          issues: [{}],
        },
      }),
    };

    const middleware = validate(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const errorPassed = next.mock.calls[0][0];
    expect(errorPassed.message).toBe('Invalid input');
  });
});

describe('List Query Schemas', () => {
  const {
    listExpenseQuerySchema,
  } = require('../controllers/expense.validation');
  const { listIncomeQuerySchema } = require('../controllers/income.validation');

  describe('listExpenseQuerySchema', () => {
    it('should successfully parse valid query params', () => {
      const validQuery = {
        limit: '15',
        cursor: '507f1f77bcf86cd799439011',
        category: '  Food  ',
        from: '2026-01-01',
        to: '2026-01-31',
        sort: '-amount',
      };

      const result = listExpenseQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        limit: 15,
        cursor: '507f1f77bcf86cd799439011',
        category: 'Food',
        from: '2026-01-01',
        to: '2026-01-31',
        sort: '-amount',
      });
    });

    it('should successfully parse empty query or empty strings', () => {
      const result = listExpenseQuerySchema.safeParse({
        limit: '',
        cursor: '',
        category: '',
        from: '',
        to: '',
        sort: '',
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should reject invalid limit, dates, sort and from > to', () => {
      expect(listExpenseQuerySchema.safeParse({ limit: '0' }).success).toBe(
        false
      );
      expect(listExpenseQuerySchema.safeParse({ limit: '150' }).success).toBe(
        false
      );
      expect(
        listExpenseQuerySchema.safeParse({ from: 'invalid' }).success
      ).toBe(false);
      expect(listExpenseQuerySchema.safeParse({ to: 'invalid' }).success).toBe(
        false
      );
      expect(
        listExpenseQuerySchema.safeParse({
          from: '2026-02-01',
          to: '2026-01-01',
        }).success
      ).toBe(false);
      expect(
        listExpenseQuerySchema.safeParse({ sort: 'unsupported' }).success
      ).toBe(false);
    });
  });

  describe('listIncomeQuerySchema', () => {
    it('should successfully parse valid income query params including source and category', () => {
      const validQuery = {
        limit: '20',
        source: '  Salary  ',
        category: 'Bonus',
        from: '2026-01-01',
        to: '2026-01-31',
        sort: 'amount',
      };

      const result = listIncomeQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
      expect(result.data.source).toBe('Salary');
      expect(result.data.category).toBe('Bonus');
      expect(result.data.sort).toBe('amount');
    });

    it('should reject invalid from > to range for income query', () => {
      const result = listIncomeQuerySchema.safeParse({
        from: '2026-05-01',
        to: '2026-04-01',
      });
      expect(result.success).toBe(false);
    });
  });
});
