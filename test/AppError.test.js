const AppError = require('../utils/AppError');

describe('AppError Utility Class', () => {
  it("should set status to 'fail' for 4xx status codes", () => {
    const error = new AppError('Bad request', 400);

    expect(error.message).toBe('Bad request');
    expect(error.statusCode).toBe(400);
    expect(error.status).toBe('fail');
    expect(error.isOperational).toBe(true);
    expect(error.details).toBeNull();
  });

  it("should set status to 'error' for 5xx status codes", () => {
    const error = new AppError('Internal server error', 500);

    expect(error.statusCode).toBe(500);
    expect(error.status).toBe('error');
    expect(error.isOperational).toBe(true);
  });

  it('should attach details when provided', () => {
    const detailsObj = { field: 'email', reason: 'Invalid format' };
    const error = new AppError('Validation error', 422, detailsObj);

    expect(error.details).toEqual(detailsObj);
  });
});
