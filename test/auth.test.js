const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const app = require("../app");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "testsecretkey";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany();
  jest.restoreAllMocks();
});

const mockUserData = {
  name: "John Doe",
  email: `john_${Date.now()}_${Math.random()}@example.com`,
  password: "password123",
  profileImageUrl: "http://example.com/profile.jpg",
};

const createUserAndToken = async () => {
  const user = await User.create({
    name: "Test User",
    email: "test@example.com",
    password: "hashedPassword",
    profileImageUrl: "http://example.com/profile.jpg",
  });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "2h",
  });

  return { user, token };
};

describe("POST /api/auth/signup", () => {
  it("should return 400 if required fields are missing", async () => {
    const res = await request(app).post("/api/auth/signup").send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Missing Required Fields");
  });

  it("should create a new user and return token", async () => {
    const res = await request(app).post("/api/auth/signup").send(mockUserData);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe(mockUserData.email);
  });

  it("should not allow duplicate user registration", async () => {
    await request(app).post("/api/auth/signup").send(mockUserData);

    const res = await request(app).post("/api/auth/signup").send(mockUserData);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("User With This Email Already Exists");
  });

  it("should return 500 if an error occurs during signup", async () => {
    jest.spyOn(User, "create").mockImplementation(() => {
      throw new Error("Simulated signup error");
    });

    const res = await request(app).post("/api/auth/signup").send(mockUserData);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Server Error");
    expect(res.body.error).toBe("Simulated signup error");

    User.create.mockRestore();
  });
});

describe("POST /api/auth/signin", () => {
  beforeEach(async () => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(mockUserData.password, salt);
    await User.create({ ...mockUserData, password: hashedPassword });
  });

  it("should return 400 if required fields are missing", async () => {
    const res = await request(app).post("/api/auth/signin").send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Missing Required Fields");
  });

  it("should return 400 if user does not exist", async () => {
    const res = await request(app)
      .post("/api/auth/signin")
      .send({ email: "nouser@example.com", password: "password123" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("No User Found");
  });

  it("should return 401 for invalid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/signin")
      .send({ email: mockUserData.email, password: "wrongpassword" });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Invalid Credentials");
  });

  it("should return 200 and a token for valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/signin")
      .send({ email: mockUserData.email, password: mockUserData.password });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe(mockUserData.email);
  });

  it("should return 500 if an error occurs during signin", async () => {
    jest.spyOn(User, "findOne").mockImplementation(() => {
      throw new Error("Simulated signin error");
    });

    const res = await request(app).post("/api/auth/signin").send({
      email: mockUserData.email,
      password: mockUserData.password,
    });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Server Error");
    expect(res.body.error).toBe("Simulated signin error");

    User.findOne.mockRestore();
  });
});

describe("Middleware: protect", () => {
  it("should return 401 if no token provided", async () => {
    const res = await request(app).get("/api/auth/getUser");
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Not authorized, no token");
  });

  it("should return 401 for invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/getUser")
      .set("Authorization", "Bearer invalidtoken");

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Not authorized, token failed");
  });

  it("should return 404 if user not found", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const token = jwt.sign({ id: fakeId }, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });

    const res = await request(app)
      .get("/api/auth/getUser")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("User Not Found");
  });
});

describe("GET /api/auth/getUser", () => {
  it("should return user data when authorized", async () => {
    const { user, token } = await createUserAndToken();

    const res = await request(app)
      .get("/api/auth/getUser")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body._id).toBe(user._id.toString());
    expect(res.body.email).toBe(user.email);
    expect(res.body.password).toBeUndefined();
  });

  it("should return 500 if an error occurs during fetch", async () => {
    const { token } = await createUserAndToken();

    jest.spyOn(User, "findById").mockImplementationOnce(() => {
      throw new Error("Simulated DB error");
    });

    const res = await request(app)
      .get("/api/auth/getUser")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Server Error");
    expect(res.body.error).toBe("Simulated DB error");
  });
});

describe("PUT /api/auth/updateUser", () => {
  let token, user;

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash("originalPassword", 10);
    user = await User.create({
      name: "Original Name",
      email: "original@example.com",
      password: hashedPassword,
      profileImageUrl: "http://original.com/profile.jpg",
    });

    token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });
  });

  it("should update name and profileImageUrl successfully", async () => {
    const res = await request(app)
      .put("/api/auth/updateUser")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Updated Name",
        profileImageUrl: "http://updated.com/image.jpg",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe("Updated Name");
    expect(res.body.profileImageUrl).toBe("http://updated.com/image.jpg");
  });

  it("should update email if it is unique", async () => {
    const newEmail = `new_${Date.now()}@example.com`;

    const res = await request(app)
      .put("/api/auth/updateUser")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: newEmail });

    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe(newEmail);
  });

  it("should not allow updating to an existing email", async () => {
    await User.create({
      name: "Another User",
      email: "taken@example.com",
      password: "test123",
    });

    const res = await request(app)
      .put("/api/auth/updateUser")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "taken@example.com" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("User With This Email Already Exists");
  });

  it("should update password securely", async () => {
    const res = await request(app)
      .put("/api/auth/updateUser")
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "newSecurePassword" });

    expect(res.statusCode).toBe(200);

    const updatedUser = await User.findById(user._id);
    const isMatch = await bcrypt.compare(
      "newSecurePassword",
      updatedUser.password
    );
    expect(isMatch).toBe(true);
  });

  it("should return 404 if user is not found", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const fakeToken = jwt.sign({ id: fakeId }, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });

    const res = await request(app)
      .put("/api/auth/updateUser")
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({ name: "Doesn't Matter" });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("User Not Found");
  });

  it("should return 500 if an error occurs", async () => {
    jest.spyOn(User, "findById").mockImplementation(() => {
      throw new Error("Simulated update error");
    });

    const res = await request(app)
      .put("/api/auth/updateUser")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Test" });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Server Error");
    expect(res.body.error).toBe("Simulated update error");

    User.findById.mockRestore();
  });

  it("should return 401 if no token provided", async () => {
    const res = await request(app)
      .put("/api/auth/updateUser")
      .send({ name: "No Token" });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Not authorized, no token");
  });

  it("should return 401 for invalid token", async () => {
    const res = await request(app)
      .put("/api/auth/updateUser")
      .set("Authorization", "Bearer invalidtoken")
      .send({ name: "Bad Token" });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Not authorized, token failed");
  });
});
