const { z } = require("zod");

const addExpenseSchema = z.object({
  icon: z.string().optional().nullable(),
  category: z
    .string("Missing Required Fields")
    .trim()
    .min(1, "Missing Required Fields"),
  amount: z.coerce
    .number({ invalid_type_error: "Missing Required Fields" })
    .positive("Amount must be a positive number")
    .finite("Amount must be finite"),
  date: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : val),
    z
      .union([z.string(), z.number(), z.date()], "Missing Required Fields")
      .refine(
        (val) => !isNaN(new Date(val).getTime()),
        "Invalid date format"
      )
  ),
});

module.exports = {
  addExpenseSchema,
};
