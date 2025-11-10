const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const app = require("../app");
const Expense = require("../models/Expense");

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
  await Expense.deleteMany();
});

jest.mock("../middleware/auth", () => (req, res, next) => {
  req.user = { _id: global.testUserId.toString() };
  next();
});

describe("Expense API", () => {
  describe("POST /api/expense/add", () => {
    it("should add an expense", async () => {
      const res = await request(app).post("/api/expense/add").send({
        icon: "🍕",
        category: "Food",
        amount: 20,
        date: "2025-07-20",
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.category).toBe("Food");
      expect(res.body.amount).toBe(20);
    });

    it("should fail when required fields are missing", async () => {
      const res = await request(app).post("/api/expense/add").send({
        category: "",
        amount: "",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Missing Required Fields");
    });

    it("should return 500 if saving expense throws an error", async () => {
      const originalSave = Expense.prototype.save;
      Expense.prototype.save = jest
        .fn()
        .mockRejectedValue(new Error("Mock DB error"));

      const res = await request(app).post("/api/expense/add").send({
        icon: "💡",
        category: "Utilities",
        amount: 60,
        date: "2025-07-20",
      });

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe("Server Error");
      expect(res.body.error).toBe("Mock DB error");

      Expense.prototype.save = originalSave;
    });
  });

  describe("GET /api/expense", () => {
    it("should return all expenses", async () => {
      await Expense.create([
        {
          userId: global.testUserId,
          icon: "✈️",
          category: "Travel",
          amount: 100,
          date: new Date(),
        },
        {
          userId: global.testUserId,
          icon: "🍕",
          category: "Food",
          amount: 50,
          date: new Date(),
        },
      ]);

      const res = await request(app).get("/api/expense");
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(2);
    });

    it("should return 500 if getting expenses throws an error", async () => {
      const originalFind = Expense.find;
      Expense.find = jest.fn(() => ({
        sort: jest.fn().mockRejectedValue(new Error("Mock get error")),
      }));

      const res = await request(app).get("/api/expense");

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe("Server Error");
      expect(res.body.error).toBe("Mock get error");

      Expense.find = originalFind;
    });
  });

  describe("DELETE /api/expense/:id", () => {
    it("should delete an expense", async () => {
      const expense = await Expense.create({
        userId: global.testUserId,
        icon: "📚",
        category: "Books",
        amount: 30,
        date: new Date(),
      });

      const res = await request(app).delete(`/api/expense/${expense._id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Expense Deleted Successfully");
    });

    it("should return 400 if expense not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).delete(`/api/expense/${fakeId}`);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Expense Not Found");
    });

    it("should return 500 if deleteExpense throws an error", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const originalFindById = Expense.findById;
      Expense.findById = jest.fn().mockImplementation(() => {
        throw new Error("Mock delete error");
      });

      const res = await request(app).delete(`/api/expense/${fakeId}`);

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe("Server Error");
      expect(res.body.error).toBe("Mock delete error");

      Expense.findById = originalFindById;
    });
  });

  describe("GET /api/expense/download", () => {
    it("should download expense data as Excel", async () => {
      await Expense.create({
        userId: global.testUserId,
        icon: "🏋️",
        category: "Gym",
        amount: 45,
        date: new Date(),
      });

      const res = await request(app).get("/api/expense/download");
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      expect(res.headers["content-disposition"]).toContain(
        "attachment; filename=expense-details.xlsx"
      );
    });

    it("should return 500 if Excel generation throws an error", async () => {
      const originalFind = Expense.find;
      Expense.find = jest.fn(() => ({
        sort: jest.fn().mockRejectedValue(new Error("Mock Excel error")),
      }));

      const res = await request(app).get("/api/expense/download");

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe("Server Error");
      expect(res.body.error).toBe("Mock Excel error");

      Expense.find = originalFind;
    });
  });
});
