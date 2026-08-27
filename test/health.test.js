const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');

describe('Health Endpoints', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('GET /health (Liveness Probe)', () => {
    it('should return 200 with status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /health/ready (Readiness Probe)', () => {
    it('should return 200 with status ready when DB connection is active', async () => {
      const res = await request(app).get('/health/ready');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        status: 'ready',
        db: true,
      });
    });

    it('should return 503 with status not ready when DB connection is deliberately severed', async () => {
      await mongoose.disconnect();

      const res = await request(app).get('/health/ready');
      expect(res.statusCode).toBe(503);
      expect(res.body).toEqual({
        status: 'not ready',
        db: false,
      });

      // Reconnect for clean state
      await mongoose.connect(mongoServer.getUri());
    });
  });
});
