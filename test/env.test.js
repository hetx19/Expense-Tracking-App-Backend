const dotenv = require("dotenv");

describe("Environment configuration (config/env.js)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should parse valid environment variables successfully", () => {
    let env;
    jest.isolateModules(() => {
      env = require("../config/env");
    });
    expect(env).toBeDefined();
    expect(env.PORT).toBeDefined();
    expect(env.JWT_SECRET).toBeDefined();
  });

  it("should exit process when environment configuration is invalid", () => {
    let loggerErrorSpy;
    const processExitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((code) => {
        throw new Error(`process.exit: ${code}`);
      });

    const dotenvSpy = jest.spyOn(dotenv, "config").mockImplementation(() => {});

    process.env.JWT_SECRET = "invalid-short-secret";

    expect(() => {
      jest.isolateModules(() => {
        const logger = require("../utils/logger");
        loggerErrorSpy = jest
          .spyOn(logger, "error")
          .mockImplementation(() => {});
        require("../config/env");
      });
    }).toThrow("process.exit: 1");

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      { err: expect.any(Object) },
      "❌ Invalid environment configuration"
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);

    loggerErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    dotenvSpy.mockRestore();
  });

  it("should load .env file when NODE_ENV is not test", () => {
    process.env.NODE_ENV = "development";
    process.env.CLIENT_URL = "http://localhost:5173";
    process.env.MONGO_URI = "mongodb://localhost:27017/test";
    process.env.JWT_SECRET = "supersecretkeythatisatleast32characterslong!!";
    process.env.CLOUDINARY_CLOUD_NAME = "test";
    process.env.CLOUDINARY_API_KEY = "123456";
    process.env.CLOUDINARY_API_SECRET = "secret";

    const configSpy = jest.fn();
    jest.doMock("dotenv", () => ({
      config: configSpy,
    }));

    let env;
    jest.isolateModules(() => {
      env = require("../config/env");
    });

    expect(env).toBeDefined();
    expect(configSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringMatching(/\.env$/),
      }),
    );
  });
});
