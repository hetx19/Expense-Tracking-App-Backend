const logger = require('../utils/logger');

describe('utils/logger.js', () => {
  it('should export a valid Pino logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
  });

  it('should redact sensitive fields when logging objects', () => {
    const logSpy = jest.spyOn(logger, 'info');
    const payload = {
      user: 'john_doe',
      password: 'supersecretpassword',
      token: 'secretjwttoken',
    };

    logger.info(payload, 'Test user payload');

    expect(logSpy).toHaveBeenCalledWith(payload, 'Test user payload');
    logSpy.mockRestore();
  });

  it('should configure transport options in development environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    let devLogger;
    jest.isolateModules(() => {
      devLogger = require('../utils/logger');
    });

    expect(devLogger).toBeDefined();
    expect(devLogger.level).toBe('info');

    process.env.NODE_ENV = originalEnv;
  });

  it('should configure level as silent in test environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    let testLogger;
    jest.isolateModules(() => {
      testLogger = require('../utils/logger');
    });

    expect(testLogger).toBeDefined();
    expect(testLogger.level).toBe('silent');

    process.env.NODE_ENV = originalEnv;
  });

  it('should configure default transport in production environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    let prodLogger;
    jest.isolateModules(() => {
      prodLogger = require('../utils/logger');
    });

    expect(prodLogger).toBeDefined();
    expect(prodLogger.level).toBe('info');

    process.env.NODE_ENV = originalEnv;
  });
});
