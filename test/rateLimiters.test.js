const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const { authLimiter } = require('../middleware/rateLimiters');

describe('Rate Limiters Middleware', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany();
    if (authLimiter.resetKey) {
      authLimiter.resetKey('::ffff:127.0.0.1');
      authLimiter.resetKey('127.0.0.1');
    }
  });

  it('should return 429 when POST /api/v1/auth/signin exceeds the 5 request threshold', async () => {
    const payload = {
      email: 'ratelimit@example.com',
      password: 'password123',
    };

    // Send 5 requests (up to limit)
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/v1/auth/signin').send(payload);
    }

    // 6th request should be blocked with 429
    const res = await request(app).post('/api/v1/auth/signin').send(payload);

    expect(res.statusCode).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/Too many authentication attempts/i);
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('should return 429 when POST /api/v1/auth/signup exceeds the 5 request threshold', async () => {
    const payload = {
      name: 'Rate Limit User',
      email: 'ratelimitsignup@example.com',
      password: 'password123',
    };

    // Send 5 requests
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/v1/auth/signup').send(payload);
    }

    // 6th request should hit limit
    const res = await request(app).post('/api/v1/auth/signup').send(payload);

    expect(res.statusCode).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/Too many authentication attempts/i);
  });
});
