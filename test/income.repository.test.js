const incomeRepository = require('../repositories/income.repository');
const Income = require('../models/Income');

jest.mock('../models/Income');

describe('Income Repository Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUser', () => {
    it('should find income by userId sorted by date descending', async () => {
      const mockSort = jest.fn().mockResolvedValue(['inc1', 'inc2']);
      Income.find.mockReturnValue({ sort: mockSort });

      const result = await incomeRepository.findByUser('user123');

      expect(Income.find).toHaveBeenCalledWith({ userId: 'user123' });
      expect(mockSort).toHaveBeenCalledWith({ date: -1 });
      expect(result).toEqual(['inc1', 'inc2']);
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
