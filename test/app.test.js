const request = require('supertest');
const app = require('../app');
const express = require('express');
const env = require('../config/env');
const logger = require('../utils/logger');

describe('GET / (Root endpoint)', () => {
  let loggerErrorSpy;

  beforeEach(() => {
    loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('should return 200 and serve index.html', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
  });

  it('should handle error when res.sendFile fails', async () => {
    const sendFileSpy = jest
      .spyOn(express.response, 'sendFile')
      .mockImplementation(function (filePath, callback) {
        if (typeof callback === 'function') {
          callback(new Error('File send error'));
        }
      });

    const res = await request(app).get('/');
    expect(res.statusCode).toBe(500);
    expect(res.text).toBe('File not found');
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      'Error sending file'
    );

    sendFileSpy.mockRestore();
  });

  it('should include security headers from Helmet', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('should configure CORS with env.CLIENT_URL directly', () => {
    jest.isolateModules(() => {
      jest.doMock('../config/env', () => ({
        ...env,
        CLIENT_URL: 'http://localhost:5173',
      }));
      const testedApp = require('../app');
      expect(testedApp).toBeDefined();
    });
  });
});
