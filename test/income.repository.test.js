const incomeRepository = require('../repositories/income.repository');
const Income = require('../models/Income');

jest.mock('../models/Income');

describe('Income Repository Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUser', () => {
    it('should find income with default pagination (limit 20)', async () => {
      const mockItems = [{ _id: 'inc1' }, { _id: 'inc2' }];
      const mockLimit = jest.fn().mockResolvedValue(mockItems);
      const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
      Income.find.mockReturnValue({ sort: mockSort });

      const result = await incomeRepository.findByUser('user123');

      expect(Income.find).toHaveBeenCalledWith({ userId: 'user123' });
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
        _id: `inc${i + 1}`,
      }));
      const mockLimit = jest.fn().mockResolvedValue(mockItems);
      const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
      Income.find.mockReturnValue({ sort: mockSort });

      const result = await incomeRepository.findByUser('user123', {
        limit: 20,
      });

      expect(mockLimit).toHaveBeenCalledWith(21);
      expect(result.data).toHaveLength(20);
      expect(result.meta).toEqual({
        nextCursor: 'inc20',
        hasMore: true,
      });
    });

    it('should clamp limit between 1 and 100 and default for invalid values', async () => {
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
      Income.find.mockReturnValue({ sort: mockSort });

      await incomeRepository.findByUser('user123', { limit: 200 });
      expect(mockLimit).toHaveBeenCalledWith(101);

      await incomeRepository.findByUser('user123', { limit: -10 });
      expect(mockLimit).toHaveBeenCalledWith(2);

      await incomeRepository.findByUser('user123', { limit: 'invalid' });
      expect(mockLimit).toHaveBeenCalledWith(21);
    });

    it('should filter by cursor when valid cursor doc is found', async () => {
      const validObjectId = '507f1f77bcf86cd799439011';
      const cursorDate = new Date('2025-07-20');
      Income.findById.mockResolvedValue({
        _id: validObjectId,
        date: cursorDate,
      });

      const mockItems = [{ _id: 'inc21' }];
      const mockLimit = jest.fn().mockResolvedValue(mockItems);
      const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
      Income.find.mockReturnValue({ sort: mockSort });

      const result = await incomeRepository.findByUser('user123', {
        limit: 20,
        cursor: validObjectId,
      });

      expect(Income.findById).toHaveBeenCalledWith(validObjectId);
      expect(Income.find).toHaveBeenCalledWith({
        userId: 'user123',
        $or: [
          { date: { $lt: cursorDate } },
          { date: cursorDate, _id: { $lt: validObjectId } },
        ],
      });
      expect(result.data).toEqual(mockItems);
    });

    it('should return empty result if cursor is invalid ObjectId', async () => {
      const result = await incomeRepository.findByUser('user123', {
        cursor: 'invalid-id',
      });

      expect(result).toEqual({
        data: [],
        meta: { nextCursor: null, hasMore: false },
      });
    });

    it('should return empty result if cursor doc is not found', async () => {
      const validObjectId = '507f1f77bcf86cd799439011';
      Income.findById.mockResolvedValue(null);

      const result = await incomeRepository.findByUser('user123', {
        cursor: validObjectId,
      });

      expect(result).toEqual({
        data: [],
        meta: { nextCursor: null, hasMore: false },
      });
    });

    it('should return all items without limit when all is true', async () => {
      const mockItems = [{ _id: 'inc1' }, { _id: 'inc2' }];
      const mockSort = jest.fn().mockResolvedValue(mockItems);
      Income.find.mockReturnValue({ sort: mockSort });

      const result = await incomeRepository.findByUser('user123', {
        all: true,
      });

      expect(Income.find).toHaveBeenCalledWith({ userId: 'user123' });
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
    it('should find income by id and userId', async () => {
      const mockIncome = { _id: 'inc1', userId: 'user123' };
      Income.findOne.mockResolvedValue(mockIncome);

      const result = await incomeRepository.findOwnedById('inc1', 'user123');

      expect(Income.findOne).toHaveBeenCalledWith({
        _id: 'inc1',
        userId: 'user123',
      });
      expect(result).toEqual(mockIncome);
    });
  });

  describe('create', () => {
    it('should create and save income', async () => {
      const incomeData = { userId: 'user123', amount: 100 };
      const saveMock = jest
        .fn()
        .mockResolvedValue({ _id: 'inc1', ...incomeData });
      Income.mockImplementation(() => ({
        save: saveMock,
      }));

      const result = await incomeRepository.create(incomeData);

      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual({ _id: 'inc1', ...incomeData });
    });
  });

  describe('deleteOwned', () => {
    it('should find and delete owned income', async () => {
      const mockDeleted = { _id: 'inc1', userId: 'user123' };
      Income.findOneAndDelete.mockResolvedValue(mockDeleted);

      const result = await incomeRepository.deleteOwned('inc1', 'user123');

      expect(Income.findOneAndDelete).toHaveBeenCalledWith({
        _id: 'inc1',
        userId: 'user123',
      });
      expect(result).toEqual(mockDeleted);
    });
  });

  describe('deleteByUser', () => {
    it('should delete all income for a user', async () => {
      Income.deleteMany.mockResolvedValue({ deletedCount: 3 });

      const result = await incomeRepository.deleteByUser('user123');

      expect(Income.deleteMany).toHaveBeenCalledWith({ userId: 'user123' });
      expect(result).toEqual({ deletedCount: 3 });
    });
  });

  describe('getTotalAmount', () => {
    it('should return sum of amounts for user income', async () => {
      Income.aggregate.mockResolvedValue([{ _id: null, total: 1000 }]);

      const result = await incomeRepository.getTotalAmount(
        '60d5ecb8b3b3b3b3b3b3b3b3'
      );

      expect(Income.aggregate).toHaveBeenCalled();
      expect(result).toBe(1000);
    });

    it('should return 0 if no income found', async () => {
      Income.aggregate.mockResolvedValue([]);

      const result = await incomeRepository.getTotalAmount(
        '60d5ecb8b3b3b3b3b3b3b3b3'
      );

      expect(result).toBe(0);
    });
  });

  describe('findSinceDate', () => {
    it('should find income since date sorted descending', async () => {
      const mockDate = new Date();
      const mockSort = jest.fn().mockResolvedValue(['inc1']);
      Income.find.mockReturnValue({ sort: mockSort });

      const result = await incomeRepository.findSinceDate('user123', mockDate);

      expect(Income.find).toHaveBeenCalledWith({
        userId: 'user123',
        date: { $gte: mockDate },
      });
      expect(mockSort).toHaveBeenCalledWith({ date: -1 });
      expect(result).toEqual(['inc1']);
    });
  });

  describe('findRecent', () => {
    it('should find recent income with limit', async () => {
      const mockLimit = jest.fn().mockResolvedValue(['inc1', 'inc2']);
      const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
      Income.find.mockReturnValue({ sort: mockSort });

      const result = await incomeRepository.findRecent('user123', 5);

      expect(Income.find).toHaveBeenCalledWith({ userId: 'user123' });
      expect(mockSort).toHaveBeenCalledWith({ date: -1 });
      expect(mockLimit).toHaveBeenCalledWith(5);
      expect(result).toEqual(['inc1', 'inc2']);
    });
  });
});
