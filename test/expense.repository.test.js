const expenseRepository = require('../repositories/expense.repository');
const Expense = require('../models/Expense');

jest.mock('../models/Expense');

describe('Expense Repository Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUser', () => {
    it('should find expenses with default pagination (limit 20)', async () => {
      const mockItems = [{ _id: 'exp1' }, { _id: 'exp2' }];
      const mockLimit = jest.fn().mockResolvedValue(mockItems);
      const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
      Expense.find.mockReturnValue({ sort: mockSort });

      const result = await expenseRepository.findByUser('user123');

      expect(Expense.find).toHaveBeenCalledWith({ userId: 'user123' });
      expect(mockSort).toHaveBeenCalledWith({ date: -1, _id: -1 });
      expect(mockLimit).toHaveBeenCalledWith(21);
      expect(result).toEqual({
        data: mockItems,
        meta: {
          nextCursor: null,
          hasMore: false,
        },
      });
    });

    it('should return nextCursor and hasMore: true when items exceed limit', async () => {
      const mockItems = Array.from({ length: 21 }, (_, i) => ({
        _id: `exp${i + 1}`,
      }));
      const mockLimit = jest.fn().mockResolvedValue(mockItems);
      const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
      Expense.find.mockReturnValue({ sort: mockSort });

      const result = await expenseRepository.findByUser('user123', {
        limit: 20,
      });

      expect(mockLimit).toHaveBeenCalledWith(21);
      expect(result.data).toHaveLength(20);
      expect(result.meta).toEqual({
        nextCursor: 'exp20',
        hasMore: true,
      });
    });

    it('should clamp limit between 1 and 100 and default for invalid values', async () => {
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
      Expense.find.mockReturnValue({ sort: mockSort });

      await expenseRepository.findByUser('user123', { limit: 200 });
      expect(mockLimit).toHaveBeenCalledWith(101);

      await expenseRepository.findByUser('user123', { limit: -10 });
      expect(mockLimit).toHaveBeenCalledWith(2);

      await expenseRepository.findByUser('user123', { limit: 'invalid' });
      expect(mockLimit).toHaveBeenCalledWith(21);
    });

    it('should filter by cursor when valid cursor doc is found', async () => {
      const validObjectId = '507f1f77bcf86cd799439011';
      const cursorDate = new Date('2025-07-20');
      Expense.findById.mockResolvedValue({
        _id: validObjectId,
        date: cursorDate,
      });

      const mockItems = [{ _id: 'exp21' }];
      const mockLimit = jest.fn().mockResolvedValue(mockItems);
      const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
      Expense.find.mockReturnValue({ sort: mockSort });

      const result = await expenseRepository.findByUser('user123', {
        limit: 20,
        cursor: validObjectId,
      });

      expect(Expense.findById).toHaveBeenCalledWith(validObjectId);
      expect(Expense.find).toHaveBeenCalledWith({
        userId: 'user123',
        $or: [
          { date: { $lt: cursorDate } },
          { date: cursorDate, _id: { $lt: validObjectId } },
        ],
      });
      expect(result.data).toEqual(mockItems);
    });

    it('should return empty result if cursor is invalid ObjectId', async () => {
      const result = await expenseRepository.findByUser('user123', {
        cursor: 'invalid-id',
      });

      expect(result).toEqual({
        data: [],
        meta: { nextCursor: null, hasMore: false },
      });
    });

    it('should return empty result if cursor doc is not found', async () => {
      const validObjectId = '507f1f77bcf86cd799439011';
      Expense.findById.mockResolvedValue(null);

      const result = await expenseRepository.findByUser('user123', {
        cursor: validObjectId,
      });

      expect(result).toEqual({
        data: [],
        meta: { nextCursor: null, hasMore: false },
      });
    });

    it('should return all items without limit when all is true', async () => {
      const mockItems = [{ _id: 'exp1' }, { _id: 'exp2' }];
      const mockSort = jest.fn().mockResolvedValue(mockItems);
      Expense.find.mockReturnValue({ sort: mockSort });

      const result = await expenseRepository.findByUser('user123', {
        all: true,
      });

      expect(Expense.find).toHaveBeenCalledWith({ userId: 'user123' });
      expect(mockSort).toHaveBeenCalledWith({ date: -1, _id: -1 });
      expect(result).toEqual({
        data: mockItems,
        meta: {
          nextCursor: null,
          hasMore: false,
        },
      });
    });
  });

  describe('findOwnedById', () => {
    it('should find an expense by id and userId', async () => {
      const mockExpense = { _id: 'exp1', userId: 'user123' };
      Expense.findOne.mockResolvedValue(mockExpense);

      const result = await expenseRepository.findOwnedById('exp1', 'user123');

      expect(Expense.findOne).toHaveBeenCalledWith({
        _id: 'exp1',
        userId: 'user123',
      });
      expect(result).toEqual(mockExpense);
    });
  });

  describe('create', () => {
    it('should create and save an expense', async () => {
      const expenseData = { userId: 'user123', amount: 100 };
      const saveMock = jest
        .fn()
        .mockResolvedValue({ _id: 'exp1', ...expenseData });
      Expense.mockImplementation(() => ({
        save: saveMock,
      }));

      const result = await expenseRepository.create(expenseData);

      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual({ _id: 'exp1', ...expenseData });
    });
  });

  describe('deleteOwned', () => {
    it('should find and delete an owned expense', async () => {
      const mockDeleted = { _id: 'exp1', userId: 'user123' };
      Expense.findOneAndDelete.mockResolvedValue(mockDeleted);

      const result = await expenseRepository.deleteOwned('exp1', 'user123');

      expect(Expense.findOneAndDelete).toHaveBeenCalledWith({
        _id: 'exp1',
        userId: 'user123',
      });
      expect(result).toEqual(mockDeleted);
    });
  });

  describe('deleteByUser', () => {
    it('should delete all expenses for a user', async () => {
      Expense.deleteMany.mockResolvedValue({ deletedCount: 5 });

      const result = await expenseRepository.deleteByUser('user123');

      expect(Expense.deleteMany).toHaveBeenCalledWith({ userId: 'user123' });
      expect(result).toEqual({ deletedCount: 5 });
    });
  });

  describe('getTotalAmount', () => {
    it('should return sum of amounts for user expenses', async () => {
      Expense.aggregate.mockResolvedValue([{ _id: null, total: 500 }]);

      const result = await expenseRepository.getTotalAmount(
        '60d5ecb8b3b3b3b3b3b3b3b3'
      );

      expect(Expense.aggregate).toHaveBeenCalled();
      expect(result).toBe(500);
    });

    it('should return 0 if no expenses found', async () => {
      Expense.aggregate.mockResolvedValue([]);

      const result = await expenseRepository.getTotalAmount(
        '60d5ecb8b3b3b3b3b3b3b3b3'
      );

      expect(result).toBe(0);
    });
  });

  describe('findSinceDate', () => {
    it('should find expenses since date sorted descending', async () => {
      const mockDate = new Date();
      const mockSort = jest.fn().mockResolvedValue(['exp1']);
      Expense.find.mockReturnValue({ sort: mockSort });

      const result = await expenseRepository.findSinceDate('user123', mockDate);

      expect(Expense.find).toHaveBeenCalledWith({
        userId: 'user123',
        date: { $gte: mockDate },
      });
      expect(mockSort).toHaveBeenCalledWith({ date: -1 });
      expect(result).toEqual(['exp1']);
    });
  });

  describe('findRecent', () => {
    it('should find recent expenses with limit', async () => {
      const mockLimit = jest.fn().mockResolvedValue(['exp1', 'exp2']);
      const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
      Expense.find.mockReturnValue({ sort: mockSort });

      const result = await expenseRepository.findRecent('user123', 5);

      expect(Expense.find).toHaveBeenCalledWith({ userId: 'user123' });
      expect(mockSort).toHaveBeenCalledWith({ date: -1 });
      expect(mockLimit).toHaveBeenCalledWith(5);
      expect(result).toEqual(['exp1', 'exp2']);
    });
  });
});
