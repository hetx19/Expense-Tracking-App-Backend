const errorHandler = require("../middleware/errorHandler");
const env = require("../config/env");
const logger = require("../utils/logger");

describe("errorHandler Middleware", () => {
  let req;
  let res;
  let next;
  let loggerErrorSpy;
  let originalNodeEnv;

  beforeEach(() => {
    req = { id: "test-req-id-123", originalUrl: "/api/test", method: "GET" };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    loggerErrorSpy = jest.spyOn(logger, "error").mockImplementation(() => {});
    originalNodeEnv = env.NODE_ENV;
  });

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
    loggerErrorSpy.mockRestore();
  });

  it("should return detailed error response in test/development environment", () => {
    env.NODE_ENV = "test";
    const error = new Error("Test error message");
    error.statusCode = 400;
    error.status = "fail";
    error.details = { field: "email" };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "fail",
      message: "Test error message",
      stack: expect.any(String),
      details: { field: "email" },
      requestId: "test-req-id-123",
    });
  });

  it("should handle operational error in production environment with details", () => {
    env.NODE_ENV = "production";
    const error = new Error("Operational issue");
    error.statusCode = 422;
    error.status = "fail";
    error.isOperational = true;
    error.details = { issue: "Invalid payload" };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      status: "fail",
      message: "Operational issue",
      details: { issue: "Invalid payload" },
      requestId: "test-req-id-123",
    });
    expect(res.json.mock.calls[0][0].stack).toBeUndefined();
  });

  it("should handle operational error in production environment without details", () => {
    env.NODE_ENV = "production";
    const error = new Error("Operational issue without details");
    error.statusCode = 404;
    error.status = "fail";
    error.isOperational = true;

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: "fail",
      message: "Operational issue without details",
      requestId: "test-req-id-123",
    });
  });

  it("should handle non-operational internal error in production environment", () => {
    env.NODE_ENV = "production";
    const error = new Error("Unhandled crash");

    errorHandler(error, req, res, next);

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      {
        err: error,
        reqId: "test-req-id-123",
        url: "/api/test",
        method: "GET",
      },
      "Unhandled crash"
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Something went very wrong!",
      requestId: "test-req-id-123",
    });
  });

  it("should handle 4xx error that is not operational in production environment", () => {
    env.NODE_ENV = "production";
    const error = new Error("Non-operational 400 error");
    error.statusCode = 400;
    error.isOperational = false;

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Something went very wrong!",
      requestId: "test-req-id-123",
    });
  });

  it("should handle missing req object gracefully", () => {
    env.NODE_ENV = "production";
    const error = new Error("No req error");

    errorHandler(error, undefined, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Something went very wrong!",
    });
  });

  it("should use default status 500 and status string 'error' if not provided", () => {
    env.NODE_ENV = "test";
    const error = new Error("Generic error");

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        message: "Generic error",
      })
    );
  });
});
