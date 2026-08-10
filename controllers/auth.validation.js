const { z } = require("zod");

const signUpSchema = z.object({
  name: z
    .string("Missing Required Fields")
    .trim()
    .min(1, "Missing Required Fields"),
  email: z
    .string("Missing Required Fields")
    .trim()
    .min(1, "Missing Required Fields")
    .email("Invalid email format"),
  password: z
    .string("Missing Required Fields")
    .min(1, "Missing Required Fields"),
  profileImageUrl: z.string().nullable().optional(),
});

const signInSchema = z.object({
  email: z
    .string("Missing Required Fields")
    .trim()
    .min(1, "Missing Required Fields")
    .email("Invalid email format"),
  password: z
    .string("Missing Required Fields")
    .min(1, "Missing Required Fields"),
});

const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").optional(),
  email: z.string().trim().email("Invalid email format").optional(),
  password: z.string().min(1, "Password cannot be empty").optional(),
  profileImageUrl: z.string().nullable().optional(),
});

module.exports = {
  signUpSchema,
  signInSchema,
  updateUserSchema,
};
