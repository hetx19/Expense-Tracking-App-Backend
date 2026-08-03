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
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const processExitSpy = jest.spyOn(process, "exit").mockImplementation(() => {});
    const dotenvSpy = jest.spyOn(dotenv, "config").mockImplementation(() => {});

    process.env.JWT_SECRET = "invalid-short-secret";

    jest.isolateModules(() => {
      require("../config/env");
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "❌ Invalid environment configuration:",
      expect.any(Object)
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);

    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    dotenvSpy.mockRestore();
  });

  it("should load .env file when NODE_ENV is not test", () => {
    process.env.NODE_ENV = "development";
    let env;
    jest.isolateModules(() => {
      env = require("../config/env");
    });
    expect(env).toBeDefined();
  });
});
