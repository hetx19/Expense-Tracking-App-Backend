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
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const processExitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((code) => {
        throw new Error(`process.exit: ${code}`);
      });

    const dotenvSpy = jest.spyOn(dotenv, "config").mockImplementation(() => {});

    process.env.JWT_SECRET = "invalid-short-secret";

    expect(() => {
      jest.isolateModules(() => {
        require("../config/env");
      });
    }).toThrow("process.exit: 1");

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "❌ Invalid environment configuration:",
      expect.any(Object),
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);

    consoleErrorSpy.mockRestore();
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
