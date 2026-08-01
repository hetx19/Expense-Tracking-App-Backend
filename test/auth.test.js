jest.mock("../config/cloudinary", () => ({
  uploader: { upload: jest.fn() },
  api: { delete_resources: jest.fn() },
}));

const env = require("../config/env");

const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const app = require("../app");
const User = require("../models/User");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const cloudinary = require("../config/cloudinary");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

jest.setTimeout(30000);

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Promise.all([
    User.deleteMany(),
    Expense.deleteMany(),
    Income.deleteMany(),
  ]);
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

const buildSignupPayload = (overrides = {}) => ({
  name: "John Doe",
  email: `john_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
  password: "password123",
  profileImageUrl: "http://example.com/profile.jpg",
  ...overrides,
});

const createUserAndToken = async (overrides = {}) => {
  const user = await User.create({
    name: "Test User",
    email: `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
    password: "hashedPassword",
    profileImageUrl: "http://example.com/profile.jpg",
    ...overrides,
  });

  const token = jwt.sign({ id: user._id }, env.JWT_SECRET, {
    expiresIn: "2h",
  });

  return { user, token };
};

const signToken = (id, options = { expiresIn: "2h" }) =>
  jwt.sign({ id }, env.JWT_SECRET, options);

describe("POST /api/auth/signup", () => {
  it("returns 400 if required fields are missing", async () => {
    const res = await request(app).post("/api/auth/signup").send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Missing Required Fields");
  });

  it("creates a new user and returns a token", async () => {
    const payload = buildSignupPayload();

    const res = await request(app).post("/api/auth/signup").send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe(payload.email);
  });

  it("rejects duplicate registration for the same email", async () => {
    const payload = buildSignupPayload();

    await request(app).post("/api/auth/signup").send(payload);
    const res = await request(app).post("/api/auth/signup").send(payload);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("User With This Email Already Exists");
  });

  it("returns 500 if an unexpected error occurs", async () => {
    jest.spyOn(User, "create").mockImplementationOnce(() => {
      throw new Error("Simulated signup error");
    });

    const res = await request(app)
      .post("/api/auth/signup")
      .send(buildSignupPayload());

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Simulated signup error");
  });
});

describe("POST /api/auth/signin", () => {
  const credentials = {
    email: "signin-user@example.com",
    password: "password123",
  };

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash(credentials.password, 10);
    await User.create({
      name: "Sign-in User",
      email: credentials.email,
      password: hashedPassword,
      profileImageUrl: "http://example.com/profile.jpg",
    });
  });

  it("returns 400 if required fields are missing", async () => {
    const res = await request(app).post("/api/auth/signin").send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Missing Required Fields");
  });

  it("returns 400 if no user exists for the given email", async () => {
    const res = await request(app)
      .post("/api/auth/signin")
      .send({ email: "nouser@example.com", password: "whatever123" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("No User Found");
  });

  it("returns 401 for an incorrect password", async () => {
    const res = await request(app)
      .post("/api/auth/signin")
      .send({ email: credentials.email, password: "wrongpassword" });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Invalid Credentials");
  });

  it("returns 200 and a token for valid credentials", async () => {
    const res = await request(app).post("/api/auth/signin").send(credentials);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe(credentials.email);
  });

  it("returns 500 if an unexpected error occurs", async () => {
    jest.spyOn(User, "findOne").mockImplementationOnce(() => {
      throw new Error("Simulated signin error");
    });

    const res = await request(app).post("/api/auth/signin").send(credentials);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Simulated signin error");
  });
});

describe("Middleware: protect (token validation)", () => {
  it("returns 401 if no token is provided", async () => {
    const res = await request(app).get("/api/auth/getUser");

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Not authorized, no token");
  });

  it("returns 401 for a malformed token", async () => {
    const res = await request(app)
      .get("/api/auth/getUser")
      .set("Authorization", "Bearer not-a-real-token");

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Not authorized, token failed");
  });

  it("returns 401 for an expired token", async () => {
    const { user } = await createUserAndToken();
    const expiredToken = signToken(user._id, { expiresIn: -10 });

    const res = await request(app)
      .get("/api/auth/getUser")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Not authorized, token failed");
  });
});

describe("GET /api/auth/getUser", () => {
  it("returns the authenticated user's data without the password field", async () => {
    const { user, token } = await createUserAndToken();

    const res = await request(app)
      .get("/api/auth/getUser")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body._id).toBe(user._id.toString());
    expect(res.body.email).toBe(user.email);
    expect(res.body.password).toBeUndefined();
  });

  it("returns 404 if the token's user id is well-formed but no longer exists", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const token = signToken(fakeId);

    const res = await request(app)
      .get("/api/auth/getUser")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("User Not Found");
  });

  it("returns 500 if the token's id claim is not a valid ObjectId (documents existing behavior)", async () => {
    const token = signToken("not-a-valid-object-id");

    const res = await request(app)
      .get("/api/auth/getUser")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toContain("Cast to ObjectId failed");
  });

  it("returns 500 if an unexpected database error occurs", async () => {
    const { token } = await createUserAndToken();

    jest.spyOn(User, "findById").mockImplementationOnce(() => {
      throw new Error("Simulated DB error");
    });

    const res = await request(app)
      .get("/api/auth/getUser")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Simulated DB error");
  });
});

describe("PUT /api/auth/updateUser", () => {
  it("returns 401 if no token is provided", async () => {
    const res = await request(app)
      .put("/api/auth/updateUser")
      .send({ name: "No Token" });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Not authorized, no token");
  });

  it("returns 401 for an invalid token", async () => {
    const res = await request(app)
      .put("/api/auth/updateUser")
      .set("Authorization", "Bearer invalidtoken")
      .send({ name: "Bad Token" });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Not authorized, token failed");
  });

  it("updates name and profileImageUrl", async () => {
    const { token } = await createUserAndToken({ name: "Original Name" });

    const res = await request(app)
      .put("/api/auth/updateUser")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Updated Name",
        profileImageUrl: "http://updated.com/image.jpg",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("User Updated Successfully");
    expect(res.body.name).toBe("Updated Name");
    expect(res.body.profileImageUrl).toBe("http://updated.com/image.jpg");
  });

  it("updates the email if it is unique", async () => {
    const { token } = await createUserAndToken();
    const newEmail = `new_${Date.now()}@example.com`;

    const res = await request(app)
      .put("/api/auth/updateUser")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: newEmail });

    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe(newEmail);
  });

  it("rejects updating to an email that is already taken", async () => {
    await User.create({
      name: "Another User",
      email: "taken@example.com",
      password: "test123",
    });
    const { token } = await createUserAndToken();

    const res = await request(app)
      .put("/api/auth/updateUser")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "taken@example.com" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("User With This Email Already Exists");
  });

  it("updates the password securely", async () => {
    const { user, token } = await createUserAndToken();

    const res = await request(app)
      .put("/api/auth/updateUser")
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "newSecurePassword" });

    expect(res.statusCode).toBe(200);

    const updatedUser = await User.findById(user._id);
    await expect(
      bcrypt.compare("newSecurePassword", updatedUser.password),
    ).resolves.toBe(true);
  });

  it("returns 404 if the user no longer exists", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const token = signToken(fakeId);

    const res = await request(app)
      .put("/api/auth/updateUser")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Doesn't Matter" });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("User Not Found");
  });

  it("returns 500 if an unexpected database error occurs", async () => {
    const { token } = await createUserAndToken();

    jest.spyOn(User, "findById").mockImplementationOnce(() => {
      throw new Error("Simulated update error");
    });

    const res = await request(app)
      .put("/api/auth/updateUser")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Test" });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Simulated update error");
  });
});

describe("DELETE /api/auth/deleteUser", () => {
  it("returns 401 if no token is provided", async () => {
    const res = await request(app).delete("/api/auth/deleteUser");

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Not authorized, no token");
  });

  it("returns 401 for an invalid token", async () => {
    const res = await request(app)
      .delete("/api/auth/deleteUser")
      .set("Authorization", "Bearer invalidtoken");

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Not authorized, token failed");
  });

  it("returns 404 if the user no longer exists", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const token = signToken(fakeId);

    const res = await request(app)
      .delete("/api/auth/deleteUser")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("User Not Found");
  });

  it("returns 500 if an unexpected database error occurs", async () => {
    const { token } = await createUserAndToken();

    jest.spyOn(User, "findById").mockImplementationOnce(() => {
      throw new Error("Simulated delete error");
    });

    const res = await request(app)
      .delete("/api/auth/deleteUser")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Simulated delete error");
  });

  it("deletes the user and cascades to their expenses, incomes, and Cloudinary image", async () => {
    const { user, token } = await createUserAndToken();
    await Expense.create({ userId: user._id, category: "Food", amount: 25 });
    await Income.create({ userId: user._id, source: "Salary", amount: 1000 });
    cloudinary.api.delete_resources.mockResolvedValueOnce({});

    const res = await request(app)
      .delete("/api/auth/deleteUser")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("User Deleted Successfully");

    expect(await User.findById(user._id)).toBeNull();
    expect(await Expense.countDocuments({ userId: user._id })).toBe(0);
    expect(await Income.countDocuments({ userId: user._id })).toBe(0);

    expect(cloudinary.api.delete_resources).toHaveBeenCalledWith(
      ["expense-tracker/profile"],
      { type: "upload", resource_type: "image" },
    );
  });

  it("deletes a user with no profile image without calling Cloudinary", async () => {
    const { user, token } = await createUserAndToken({ profileImageUrl: null });

    const res = await request(app)
      .delete("/api/auth/deleteUser")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(await User.findById(user._id)).toBeNull();
    expect(cloudinary.api.delete_resources).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/upload-image (auth boundary)", () => {
  it("returns 401 if no token is provided", async () => {
    const res = await request(app).post("/api/auth/upload-image");

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Not authorized, no token");
  });

  it("returns 401 for an invalid token", async () => {
    const res = await request(app)
      .post("/api/auth/upload-image")
      .set("Authorization", "Bearer invalidtoken");

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Not authorized, token failed");
  });
});

describe("PUT /api/auth/update-image (auth boundary)", () => {
  it("returns 401 if no token is provided", async () => {
    const res = await request(app).put("/api/auth/update-image");

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Not authorized, no token");
  });

  it("returns 401 for an invalid token", async () => {
    const res = await request(app)
      .put("/api/auth/update-image")
      .set("Authorization", "Bearer invalidtoken");

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Not authorized, token failed");
  });
});
