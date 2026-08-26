const { z } = require('zod');

const addIncomeSchema = z.object({
  icon: z.string().optional().nullable(),
  source: z
    .string('Missing Required Fields')
    .trim()
    .min(1, 'Missing Required Fields'),
  amount: z.coerce
    .number({ invalid_type_error: 'Missing Required Fields' })
    .positive('Amount must be a positive number')
    .finite('Amount must be finite'),
  date: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : val),
    z
      .union([z.string(), z.number(), z.date()], 'Missing Required Fields')
      .refine((val) => !isNaN(new Date(val).getTime()), 'Invalid date format')
  ),
});

const listIncomeQuerySchema = z
  .object({
    limit: z.preprocess(
      (val) => (val === '' || val === undefined ? undefined : val),
      z.coerce
        .number({ invalid_type_error: 'Limit must be a number' })
        .int('Limit must be an integer')
        .min(1, 'Limit must be at least 1')
        .max(100, 'Limit cannot exceed 100')
        .optional()
    ),
    cursor: z.preprocess(
      (val) => (val === '' || val === undefined ? undefined : val),
      z.string().trim().optional()
    ),
    source: z.preprocess(
      (val) => (val === '' || val === undefined ? undefined : val),
      z.string().trim().optional()
    ),
    category: z.preprocess(
      (val) => (val === '' || val === undefined ? undefined : val),
      z.string().trim().optional()
    ),
    from: z.preprocess(
      (val) => (val === '' || val === undefined ? undefined : val),
      z
        .string()
        .refine(
          (val) => !isNaN(new Date(val).getTime()),
          'Invalid from date format'
        )
        .optional()
    ),
    to: z.preprocess(
      (val) => (val === '' || val === undefined ? undefined : val),
      z
        .string()
        .refine(
          (val) => !isNaN(new Date(val).getTime()),
          'Invalid to date format'
        )
        .optional()
    ),
    sort: z.preprocess(
      (val) => (val === '' || val === undefined ? undefined : val),
      z
        .string()
        .refine(
          (val) =>
            [
              '-date',
              'date',
              '+date',
              'date_desc',
              'date_asc',
              'date:desc',
              'date:asc',
              '-amount',
              'amount',
              '+amount',
              'amount_desc',
              'amount_asc',
              'amount:desc',
              'amount:asc',
            ].includes(val),
          {
            message:
              'Invalid sort parameter. Supported values: date, -date, amount, -amount',
          }
        )
        .optional()
    ),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return new Date(data.from).getTime() <= new Date(data.to).getTime();
      }
      return true;
    },
    {
      message: "'from' date must be before or equal to 'to' date",
      path: ['from'],
    }
  );

module.exports = {
  addIncomeSchema,
  listIncomeQuerySchema,
};
