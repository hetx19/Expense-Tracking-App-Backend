const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../app');
const { swaggerSpec, generateYamlSpec } = require('../config/swagger');

describe('OpenAPI Spec & Swagger UI Documentation', () => {
  it('should return 200 and serve Swagger UI at /api/docs/', async () => {
    const res = await request(app).get('/api/docs/');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('Swagger UI');
  });

  it('should redirect /api/docs to /api/docs/ or return 200/301/302', async () => {
    const res = await request(app).get('/api/docs');
    expect([200, 301, 302]).toContain(res.statusCode);
  });

  it('should serve OpenAPI JSON specification at /api/docs.json', async () => {
    const res = await request(app).get('/api/docs.json');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.openapi).toBe('3.0.0');
    expect(res.body.info.title).toBe('Expense Tracker API');
    expect(res.body.info.version).toBe('1.0.0');
  });

  it('should define bearerAuth security scheme', () => {
    expect(swaggerSpec.components.securitySchemes.bearerAuth).toBeDefined();
    expect(swaggerSpec.components.securitySchemes.bearerAuth.scheme).toBe(
      'bearer'
    );
    expect(swaggerSpec.components.securitySchemes.bearerAuth.type).toBe('http');
  });

  it('should include all required route paths in the OpenAPI spec', () => {
    const expectedPaths = [
      '/health',
      '/health/ready',
      '/api/v1/auth/signup',
      '/api/v1/auth/signin',
      '/api/v1/auth/upload-image',
      '/api/v1/users/me',
      '/api/v1/users/me/image',
      '/api/v1/incomes',
      '/api/v1/incomes/{id}',
      '/api/v1/incomes/download',
      '/api/v1/expenses',
      '/api/v1/expenses/{id}',
      '/api/v1/expenses/download',
      '/api/v1/dashboard',
    ];

    expectedPaths.forEach((routePath) => {
      expect(swaggerSpec.paths[routePath]).toBeDefined();
    });
  });

  it('should register Zod input schemas in components', () => {
    const expectedSchemas = [
      'SignUpInput',
      'SignInInput',
      'UpdateUserInput',
      'AddIncomeInput',
      'AddExpenseInput',
      'ListIncomeQuery',
      'ListExpenseQuery',
      'User',
      'Income',
      'Expense',
      'PaginationMeta',
      'ErrorEnvelope',
      'SuccessMessageEnvelope',
    ];

    expectedSchemas.forEach((schemaName) => {
      expect(swaggerSpec.components.schemas[schemaName]).toBeDefined();
    });
  });

  it('should generate YAML spec file with generateYamlSpec()', () => {
    const tempYamlPath = path.join(__dirname, 'fixtures/temp-openapi.yaml');
    const returnedPath = generateYamlSpec(tempYamlPath);
    expect(returnedPath).toBe(tempYamlPath);
    expect(fs.existsSync(tempYamlPath)).toBe(true);

    const content = fs.readFileSync(tempYamlPath, 'utf-8');
    expect(content).toContain('openapi: 3.0.0');
    expect(content).toContain('Expense Tracker API');

    // Clean up temporary file
    fs.unlinkSync(tempYamlPath);
  });
});
