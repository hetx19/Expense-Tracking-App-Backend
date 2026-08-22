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
