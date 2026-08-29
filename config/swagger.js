const { z } = require('zod');
const {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} = require('@asteasolutions/zod-to-openapi');
const yaml = require('yaml');
const fs = require('fs');
const path = require('path');

extendZodWithOpenApi(z);

const {
  signUpSchema,
  signInSchema,
  updateUserSchema,
} = require('../controllers/auth.validation');
const {
  addIncomeSchema,
  listIncomeQuerySchema,
} = require('../controllers/income.validation');
const {
  addExpenseSchema,
  listExpenseQuerySchema,
} = require('../controllers/expense.validation');

const registry = new OpenAPIRegistry();

// Security Scheme
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description:
    'JWT authorization header using the Bearer scheme. Example: "Bearer {token}"',
});

// Register Input Schemas derived from Zod validation schemas
registry.register('SignUpInput', signUpSchema);
registry.register('SignInInput', signInSchema);
registry.register('UpdateUserInput', updateUserSchema);
registry.register('AddIncomeInput', addIncomeSchema);
registry.register('AddExpenseInput', addExpenseSchema);
registry.register('ListIncomeQuery', listIncomeQuerySchema);
registry.register('ListExpenseQuery', listExpenseQuerySchema);

// Response & Entity Schemas
const UserSchema = z
  .object({
    _id: z.string().openapi({ example: '66d0c7f1a2b3c4d5e6f7a8b9' }),
    name: z.string().openapi({ example: 'John Doe' }),
    email: z.string().email().openapi({ example: 'john@example.com' }),
    profileImageUrl: z.string().nullable().optional().openapi({
      example: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    }),
    createdAt: z
      .string()
      .optional()
      .openapi({ example: '2026-08-27T10:00:00.000Z' }),
    updatedAt: z
      .string()
      .optional()
      .openapi({ example: '2026-08-27T10:00:00.000Z' }),
  })
  .openapi('User');

const IncomeSchema = z
  .object({
    _id: z.string().openapi({ example: '66d0c7f1a2b3c4d5e6f7a8c1' }),
    userId: z.string().openapi({ example: '66d0c7f1a2b3c4d5e6f7a8b9' }),
    icon: z.string().nullable().optional().openapi({ example: 'salary-icon' }),
    source: z.string().openapi({ example: 'Salary' }),
    amount: z.number().openapi({ example: 5000 }),
    date: z.string().openapi({ example: '2026-08-27T00:00:00.000Z' }),
    createdAt: z
      .string()
      .optional()
      .openapi({ example: '2026-08-27T10:00:00.000Z' }),
    updatedAt: z
      .string()
      .optional()
      .openapi({ example: '2026-08-27T10:00:00.000Z' }),
  })
  .openapi('Income');

const ExpenseSchema = z
  .object({
    _id: z.string().openapi({ example: '66d0c7f1a2b3c4d5e6f7a8d2' }),
    userId: z.string().openapi({ example: '66d0c7f1a2b3c4d5e6f7a8b9' }),
    icon: z
      .string()
      .nullable()
      .optional()
      .openapi({ example: 'groceries-icon' }),
    category: z.string().openapi({ example: 'Groceries' }),
    amount: z.number().openapi({ example: 120.5 }),
    date: z.string().openapi({ example: '2026-08-27T00:00:00.000Z' }),
    createdAt: z
      .string()
      .optional()
      .openapi({ example: '2026-08-27T10:00:00.000Z' }),
    updatedAt: z
      .string()
      .optional()
      .openapi({ example: '2026-08-27T10:00:00.000Z' }),
  })
  .openapi('Expense');

const PaginationMetaSchema = z
  .object({
    nextCursor: z
      .string()
      .nullable()
      .optional()
      .openapi({ example: '66d0c7f1a2b3c4d5e6f7a8c1' }),
    hasMore: z.boolean().openapi({ example: false }),
    limit: z.number().openapi({ example: 10 }),
  })
  .openapi('PaginationMeta');

const ErrorEnvelopeSchema = z
  .object({
    status: z.enum(['fail', 'error']).openapi({ example: 'fail' }),
    message: z
      .string()
      .openapi({ example: 'Invalid request data or operation failed' }),
    details: z.any().optional(),
  })
  .openapi('ErrorEnvelope');

const SuccessMessageEnvelopeSchema = z
  .object({
    status: z.literal('success').openapi({ example: 'success' }),
    message: z
      .string()
      .openapi({ example: 'Operation completed successfully' }),
  })
  .openapi('SuccessMessageEnvelope');

registry.register('User', UserSchema);
registry.register('Income', IncomeSchema);
registry.register('Expense', ExpenseSchema);
registry.register('PaginationMeta', PaginationMetaSchema);
registry.register('ErrorEnvelope', ErrorEnvelopeSchema);
registry.register('SuccessMessageEnvelope', SuccessMessageEnvelopeSchema);

// Register Path Definitions
// --- Health ---
registry.registerPath({
  method: 'get',
  path: '/health',
  tags: ['Health'],
  summary: 'Liveness health check',
  description:
    'Checks if the HTTP server process is running and accepting requests.',
  responses: {
    200: {
      description: 'Server is healthy',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('ok').openapi({ example: 'ok' }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/health/ready',
  tags: ['Health'],
  summary: 'Readiness health check',
  description:
    'Checks if the server and its database connection (MongoDB) are ready to handle traffic.',
  responses: {
    200: {
      description: 'Database is connected and ready',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('ready').openapi({ example: 'ready' }),
            db: z.literal(true).openapi({ example: true }),
          }),
        },
      },
    },
    503: {
      description: 'Database is not connected',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('not ready').openapi({ example: 'not ready' }),
            db: z.literal(false).openapi({ example: false }),
          }),
        },
      },
    },
  },
});

// --- Auth ---
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/signup',
  tags: ['Auth'],
  summary: 'Register a new user account',
  request: {
    body: {
      content: {
        'application/json': {
          schema: signUpSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'User registered successfully',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('success'),
            data: z.object({
              user: UserSchema,
              token: z.string().openapi({ example: 'jwt.token.string' }),
            }),
          }),
        },
      },
    },
    400: {
      description: 'Validation failed or missing required fields',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
    409: {
      description: 'User with this email already exists',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/signin',
  tags: ['Auth'],
  summary: 'Sign in to an existing account',
  request: {
    body: {
      content: {
        'application/json': {
          schema: signInSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Signed in successfully',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('success'),
            data: z.object({
              user: UserSchema,
              token: z.string().openapi({ example: 'jwt.token.string' }),
            }),
          }),
        },
      },
    },
    400: {
      description: 'Missing email or password',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
    401: {
      description: 'Invalid credentials',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/upload-image',
  tags: ['Auth'],
  summary: 'Upload profile image during registration',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            image: z.string().openapi({
              type: 'string',
              format: 'binary',
              description: 'Image file (jpeg/png)',
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Image uploaded successfully',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('success'),
            data: z.object({
              imageUrl: z.string().openapi({
                example:
                  'https://res.cloudinary.com/demo/image/upload/profile.jpg',
              }),
            }),
          }),
        },
      },
    },
    400: {
      description: 'No image provided or invalid file format',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
    401: {
      description: 'Unauthorized - invalid or missing token',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
  },
});

// --- Users ---
registry.registerPath({
  method: 'get',
  path: '/api/v1/users/me',
  tags: ['Users'],
  summary: 'Get current user profile',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Profile retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('success'),
            data: z.object({
              user: UserSchema,
            }),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/v1/users/me',
  tags: ['Users'],
  summary: 'Update current user profile',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: updateUserSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Profile updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('success'),
            data: z.object({
              user: UserSchema,
            }),
          }),
        },
      },
    },
    400: {
      description: 'Validation failed',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
    409: {
      description: 'Email already taken',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/users/me',
  tags: ['Users'],
  summary: 'Delete current user account and all associated transactions',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Account deleted successfully',
      content: {
        'application/json': {
          schema: SuccessMessageEnvelopeSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/v1/users/me/image',
  tags: ['Users'],
  summary: 'Update current user profile image',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            image: z.string().openapi({
              type: 'string',
              format: 'binary',
              description: 'New profile image file',
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Profile image updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('success'),
            data: z.object({
              imageUrl: z.string().openapi({
                example:
                  'https://res.cloudinary.com/demo/image/upload/new-pic.jpg',
              }),
            }),
          }),
        },
      },
    },
    400: {
      description: 'No image uploaded',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
  },
});

// --- Incomes ---
registry.registerPath({
  method: 'get',
  path: '/api/v1/incomes',
  tags: ['Incomes'],
  summary: 'List income records for the authenticated user',
  security: [{ bearerAuth: [] }],
  request: {
    query: listIncomeQuerySchema,
  },
  responses: {
    200: {
      description: 'List of incomes with pagination metadata',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('success'),
            data: z.array(IncomeSchema),
            pagination: PaginationMetaSchema,
          }),
        },
      },
    },
    400: {
      description: 'Invalid query filters or pagination parameters',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/incomes',
  tags: ['Incomes'],
  summary: 'Create a new income record',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: addIncomeSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Income record created successfully',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('success'),
            data: z.object({
              income: IncomeSchema,
            }),
          }),
        },
      },
    },
    400: {
      description: 'Missing or invalid fields',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/incomes/{id}',
  tags: ['Incomes'],
  summary: 'Delete an income record by ID',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({
        description: 'Income record ID',
        example: '66d0c7f1a2b3c4d5e6f7a8c1',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Income deleted successfully',
      content: {
        'application/json': {
          schema: SuccessMessageEnvelopeSchema,
        },
      },
    },
    400: {
      description: 'Invalid ID format',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
    404: {
      description: 'Income not found or not owned by user',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/incomes/download',
  tags: ['Incomes'],
  summary: 'Download income records as an Excel spreadsheet (.xlsx)',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Excel file containing income transactions',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
  },
});

// --- Expenses ---
registry.registerPath({
  method: 'get',
  path: '/api/v1/expenses',
  tags: ['Expenses'],
  summary: 'List expense records for the authenticated user',
  security: [{ bearerAuth: [] }],
  request: {
    query: listExpenseQuerySchema,
  },
  responses: {
    200: {
      description: 'List of expenses with pagination metadata',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('success'),
            data: z.array(ExpenseSchema),
            pagination: PaginationMetaSchema,
          }),
        },
      },
    },
    400: {
      description: 'Invalid query filters or pagination parameters',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/expenses',
  tags: ['Expenses'],
  summary: 'Create a new expense record',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: addExpenseSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Expense record created successfully',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('success'),
            data: z.object({
              expense: ExpenseSchema,
            }),
          }),
        },
      },
    },
    400: {
      description: 'Missing or invalid fields',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/expenses/{id}',
  tags: ['Expenses'],
  summary: 'Delete an expense record by ID',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({
        description: 'Expense record ID',
        example: '66d0c7f1a2b3c4d5e6f7a8d2',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Expense deleted successfully',
      content: {
        'application/json': {
          schema: SuccessMessageEnvelopeSchema,
        },
      },
    },
    400: {
      description: 'Invalid ID format',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
    404: {
      description: 'Expense not found or not owned by user',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/expenses/download',
  tags: ['Expenses'],
  summary: 'Download expense records as an Excel spreadsheet (.xlsx)',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Excel file containing expense transactions',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
  },
});

// --- Dashboard ---
registry.registerPath({
  method: 'get',
  path: '/api/v1/dashboard',
  tags: ['Dashboard'],
  summary: 'Get dashboard summary data for authenticated user',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Dashboard aggregated metrics and recent activity',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('success'),
            data: z.object({
              totalBalance: z.number().openapi({ example: 4879.5 }),
              totalIncome: z.number().openapi({ example: 5000 }),
              totalExpenses: z.number().openapi({ example: 120.5 }),
              last30DaysExpenses: z.object({
                total: z.number().openapi({ example: 120.5 }),
                transactions: z.array(ExpenseSchema),
              }),
              last60DaysIncome: z.object({
                total: z.number().openapi({ example: 5000 }),
                transactions: z.array(IncomeSchema),
              }),
              recentTransactions: z.array(
                z.union([
                  ExpenseSchema.extend({
                    type: z.literal('expense').openapi({ example: 'expense' }),
                  }),
                  IncomeSchema.extend({
                    type: z.literal('income').openapi({ example: 'income' }),
                  }),
                ])
              ),
            }),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
  },
});

const generator = new OpenApiGeneratorV3(registry.definitions);

const swaggerSpec = generator.generateDocument({
  openapi: '3.0.0',
  info: {
    title: 'Expense Tracker API',
    version: '1.0.0',
    description:
      'REST API documentation for Expense Tracker Backend application. Provides endpoints for user authentication, profile management, expense and income tracking, Excel export, and analytics dashboard.',
    contact: {
      name: 'API Support',
    },
  },
  servers: [
    {
      url: '/',
      description: 'Current environment server',
    },
    {
      url: 'http://localhost:5001',
      description: 'Local development server',
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'System health checks (liveness and readiness)',
    },
    {
      name: 'Auth',
      description: 'User registration, login, and registration avatar upload',
    },
    {
      name: 'Users',
      description: 'Current user profile operations and avatar updates',
    },
    {
      name: 'Incomes',
      description: 'Income transaction tracking and Excel export',
    },
    {
      name: 'Expenses',
      description: 'Expense transaction tracking and Excel export',
    },
    {
      name: 'Dashboard',
      description: 'Aggregated financial metrics and recent transactions',
    },
  ],
});

/**
 * Generates and saves the openapi.yaml spec to the docs directory.
 */
function generateYamlSpec(
  outputPath = path.join(__dirname, '../docs/openapi.yaml')
) {
  const yamlContent = yaml.stringify(swaggerSpec);
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  fs.writeFileSync(outputPath, yamlContent, 'utf-8');
  return outputPath;
}

module.exports = {
  swaggerSpec,
  generateYamlSpec,
  registry,
};
