const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const User = require("../models/User");
const Expense = require("../models/Expense");
const Income = require("../models/Income");

describe("Database Index Verification & Explain Stats", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    await User.syncIndexes();
    await Expense.syncIndexes();
    await Income.syncIndexes();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  test("User email unique index exists in getIndexes()", async () => {
    const userIndexes = await User.collection.getIndexes();
    console.log(
      "Verified User getIndexes():",
      JSON.stringify(userIndexes, null, 2),
    );
    expect(userIndexes).toHaveProperty("email_1");
    expect(userIndexes.email_1).toEqual([["email", 1]]);
  });

  test("Expense compound index { userId: 1, date: -1 } exists and improves query plan (COLLSCAN -> IXSCAN)", async () => {
    const userId = new mongoose.Types.ObjectId();
    await Expense.create([
      { userId, category: "Food", amount: 20, date: new Date("2026-01-01") },
      {
        userId,
        category: "Transport",
        amount: 15,
        date: new Date("2026-01-02"),
      },
    ]);

    // Check getIndexes()
    const expenseIndexes = await Expense.collection.getIndexes();
    console.log(
      "Verified Expense getIndexes():",
      JSON.stringify(expenseIndexes, null, 2),
    );
    expect(expenseIndexes).toHaveProperty("userId_1_date_-1");

    // Explain WITH index (IXSCAN)
    const explainWithIndex = await Expense.find({ userId })
      .sort({ date: -1 })
      .explain("executionStats");
    const stageWithIndex =
      explainWithIndex.queryPlanner.winningPlan.stage === "FETCH"
        ? explainWithIndex.queryPlanner.winningPlan.inputStage.stage
        : explainWithIndex.queryPlanner.winningPlan.stage;

    console.log("Expense Explain WITH Index (Stage):", stageWithIndex);
    console.log(
      "Expense Explain WITH Index (WinningPlan):",
      JSON.stringify(explainWithIndex.queryPlanner.winningPlan, null, 2),
    );
    expect(stageWithIndex).toBe("IXSCAN");

    // Drop index and test COLLSCAN
    await Expense.collection.dropIndex("userId_1_date_-1");
    const explainWithoutIndex = await Expense.find({ userId })
      .sort({ date: -1 })
      .explain("executionStats");
    const stageWithoutIndex =
      explainWithoutIndex.queryPlanner.winningPlan.stage === "SORT"
        ? explainWithoutIndex.queryPlanner.winningPlan.inputStage.stage
        : explainWithoutIndex.queryPlanner.winningPlan.stage;

    console.log("Expense Explain WITHOUT Index (Stage):", stageWithoutIndex);
    console.log(
      "Expense Explain WITHOUT Index (WinningPlan):",
      JSON.stringify(explainWithoutIndex.queryPlanner.winningPlan, null, 2),
    );
    expect(stageWithoutIndex).toBe("COLLSCAN");
  });

  test("Income compound index { userId: 1, date: -1 } exists and improves query plan (COLLSCAN -> IXSCAN)", async () => {
    const userId = new mongoose.Types.ObjectId();
    await Income.create([
      { userId, source: "Salary", amount: 5000, date: new Date("2026-01-01") },
      {
        userId,
        source: "Freelance",
        amount: 300,
        date: new Date("2026-01-02"),
      },
    ]);

    // Check getIndexes()
    const incomeIndexes = await Income.collection.getIndexes();
    console.log(
      "Verified Income getIndexes():",
      JSON.stringify(incomeIndexes, null, 2),
    );
    expect(incomeIndexes).toHaveProperty("userId_1_date_-1");

    // Explain WITH index (IXSCAN)
    const explainWithIndex = await Income.find({ userId })
      .sort({ date: -1 })
      .explain("executionStats");
    const stageWithIndex =
      explainWithIndex.queryPlanner.winningPlan.stage === "FETCH"
        ? explainWithIndex.queryPlanner.winningPlan.inputStage.stage
        : explainWithIndex.queryPlanner.winningPlan.stage;

    console.log("Income Explain WITH Index (Stage):", stageWithIndex);
    console.log(
      "Income Explain WITH Index (WinningPlan):",
      JSON.stringify(explainWithIndex.queryPlanner.winningPlan, null, 2),
    );
    expect(stageWithIndex).toBe("IXSCAN");

    // Drop index and test COLLSCAN
    await Income.collection.dropIndex("userId_1_date_-1");
    const explainWithoutIndex = await Income.find({ userId })
      .sort({ date: -1 })
      .explain("executionStats");
    const stageWithoutIndex =
      explainWithoutIndex.queryPlanner.winningPlan.stage === "SORT"
        ? explainWithoutIndex.queryPlanner.winningPlan.inputStage.stage
        : explainWithoutIndex.queryPlanner.winningPlan.stage;

    console.log("Income Explain WITHOUT Index (Stage):", stageWithoutIndex);
    console.log(
      "Income Explain WITHOUT Index (WinningPlan):",
      JSON.stringify(explainWithoutIndex.queryPlanner.winningPlan, null, 2),
    );
    expect(stageWithoutIndex).toBe("COLLSCAN");
  });
});
