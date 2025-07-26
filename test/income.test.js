const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const app = require("../app");
const Income = require("../models/Income");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri, {});

  global.testUserId = new mongoose.Types.ObjectId();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Income.deleteMany();
});

jest.mock("../middleware/auth", () => (req, res, next) => {
  req.user = { _id: global.testUserId.toString() };
  next();
});

describe("Income API", () => {
  describe("POST /api/income/add", () => {
    it("should add an income", async () => {
      const res = await request(app).post("/api/income/add").send({
        icon: "💰",
        source: "Freelance",
        amount: 2000,
        date: "2025-07-20",
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.source).toBe("Freelance");
      expect(res.body.amount).toBe(2000);
    });

    it("should fail when required fields are missing", async () => {
      const res = await request(app).post("/api/income/add").send({
        source: "",
        amount: "",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Missing Required Fields");
    });

    it("should return 500 if saving income throws an error", async () => {
      const originalSave = Income.prototype.save;
      Income.prototype.save = jest
        .fn()
        .mockRejectedValue(new Error("Mock DB error"));

      const res = await request(app).post("/api/income/add").send({
        icon: "💰",
        source: "Freelance",
        amount: 2000,
        date: "2025-07-20",
      });

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe("Server Error");
      expect(res.body.error).toBe("Mock DB error");
    });
  });

  describe("GET /api/income", () => {
    it("should return all incomes", async () => {
      await Income.create([
        {
          userId: global.testUserId,
          icon: "💰",
          source: "Freelance",
          amount: 2000,
          date: new Date(),
        },
        {
          userId: global.testUserId,
          icon: "💼",
          source: "Job",
          amount: 3000,
          date: new Date(),
        },
      ]);

      const res = await request(app).get("/api/income");
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(2);
    });

    it("should return 500 if getting incomes throws an error", async () => {
      const originalFind = Income.find;
      Income.find = jest.fn(() => ({
        sort: jest.fn().mockRejectedValue(new Error("Mock get error")),
      }));

      const res = await request(app).get("/api/income");

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe("Server Error");
      expect(res.body.error).toBe("Mock get error");

      Income.find = originalFind;
    });
  });

  describe("DELETE /api/income/:id", () => {
    it("should delete an income", async () => {
      const income = await Income.create({
        userId: global.testUserId,
        icon: "💰",
        amount: 1500,
        source: "Investment",
        date: new Date(),
      });

      const res = await request(app).delete(`/api/income/${income._id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Income Deleted Successfully");
    });

    it("should return 400 if income not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).delete(`/api/income/${fakeId}`);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Income Not Found");
    });

    it("should return 500 if deleteIncome throws an error", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const originalFindById = Income.findById;
      Income.findById = jest.fn().mockImplementation(() => {
        throw new Error("Mock delete error");
      });

      const res = await request(app).delete(`/api/income/${fakeId}`);

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe("Server Error");
      expect(res.body.error).toBe("Mock delete error");

      Income.findById = originalFindById;
    });
  });

  describe("GET /api/income/download", () => {
    it("should download income data as Excel", async () => {
      await Income.create({
        userId: global.testUserId,
        icon: "💰",
        source: "Freelance",
        amount: 2000,
        date: new Date(),
      });

      const res = await request(app).get("/api/income/download");
      expect(res.statusCode).toBe(200);
      expect(res.header["content-type"]).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      expect(res.header["content-disposition"]).toContain(
        "attachment; filename=income-details.xlsx"
      );
    });

    it("should return 500 if Excel generation throws an error", async () => {
      const originalFind = Income.find;
      Income.find = jest.fn(() => ({
        sort: jest.fn().mockRejectedValue(new Error("Mock Excel error")),
      }));

      const res = await request(app).get("/api/income/download");

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe("Server Error");
      expect(res.body.error).toBe("Mock Excel error");

      Income.findById = originalFind;
    });
  });
});
