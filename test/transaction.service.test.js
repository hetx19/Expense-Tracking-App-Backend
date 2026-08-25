const transactionService = require('../services/transaction.service');
const AppError = require('../utils/AppError');

describe('Transaction Service Shared Parameterized Tests', () => {
  const mockRepo = {
    create: jest.fn(),
    findByUser: jest.fn(),
    deleteOwned: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe.each([
    {
      resourceName: 'Expense',
      fieldKey: 'category',
      fieldVal: 'Food',
      sheetName: 'Expense',
      mapItem: (item) => ({
        Category: item.category,
        Amount: item.amount,
        Date: item.date,
      }),
    },
    {
      resourceName: 'Income',
      fieldKey: 'source',
      fieldVal: 'Salary',
      sheetName: 'Income',
      mapItem: (item) => ({
        Source: item.source,
        Amount: item.amount,
        Date: item.date,
      }),
    },
  ])(
    'shared logic for $resourceName',
    ({ resourceName, fieldKey, fieldVal, sheetName, mapItem }) => {
      it('should create a new transaction with converted Date object', async () => {
        const inputData = {
          userId: 'user123',
          icon: '✨',
          [fieldKey]: fieldVal,
          amount: 100,
          date: '2025-08-01',
        };

        const mockSaved = {
          _id: 'tx123',
          ...inputData,
          date: new Date('2025-08-01'),
        };

        mockRepo.create.mockResolvedValue(mockSaved);

        const result = await transactionService.addTransaction(
          mockRepo,
          inputData
        );

        expect(mockRepo.create).toHaveBeenCalledWith({
          userId: 'user123',
          icon: '✨',
          [fieldKey]: fieldVal,
          amount: 100,
          date: new Date('2025-08-01'),
        });
        expect(result).toEqual(mockSaved);
      });

      it('should fetch transactions by user with options', async () => {
        const mockResult = {
          data: [{ _id: 'tx1' }, { _id: 'tx2' }],
          meta: { nextCursor: null, hasMore: false },
        };
        mockRepo.findByUser.mockResolvedValue(mockResult);

        const options = { limit: 10, cursor: 'tx0' };
        const result = await transactionService.getTransactionsByUser(
          mockRepo,
          'user123',
          options
        );

        expect(mockRepo.findByUser).toHaveBeenCalledWith('user123', options);
        expect(result).toEqual(mockResult);
      });

      it('should delete transaction when found', async () => {
        const mockDeleted = { _id: 'tx1', userId: 'user123' };
        mockRepo.deleteOwned.mockResolvedValue(mockDeleted);

        const result = await transactionService.deleteTransaction(
          mockRepo,
          'tx1',
          'user123',
          resourceName
        );

        expect(mockRepo.deleteOwned).toHaveBeenCalledWith('tx1', 'user123');
        expect(result).toEqual(mockDeleted);
      });

      it('should throw AppError 404 when transaction is not found on delete', async () => {
        mockRepo.deleteOwned.mockResolvedValue(null);

        await expect(
          transactionService.deleteTransaction(
            mockRepo,
            'invalidId',
            'user123',
            resourceName
          )
        ).rejects.toThrow(new AppError(`${resourceName} Not Found`, 404));

        expect(mockRepo.deleteOwned).toHaveBeenCalledWith(
          'invalidId',
          'user123'
        );
      });

      it('should generate Excel buffer for user transactions when repo returns raw array or object', async () => {
        const mockItems = [
          { [fieldKey]: fieldVal, amount: 50, date: new Date('2025-08-01') },
        ];
        mockRepo.findByUser.mockResolvedValue({ data: mockItems });

        const buffer = await transactionService.generateTransactionExcel(
          mockRepo,
          'user123',
          sheetName,
          mapItem
        );

        expect(mockRepo.findByUser).toHaveBeenCalledWith('user123', {
          all: true,
        });
        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(buffer.length).toBeGreaterThan(0);

        // Also test raw array branch
        mockRepo.findByUser.mockResolvedValue(mockItems);
        const buffer2 = await transactionService.generateTransactionExcel(
          mockRepo,
          'user123',
          sheetName,
          mapItem
        );
        expect(Buffer.isBuffer(buffer2)).toBe(true);

        // Also test null result fallback
        mockRepo.findByUser.mockResolvedValue(null);
        const buffer3 = await transactionService.generateTransactionExcel(
          mockRepo,
          'user123',
          sheetName,
          mapItem
        );
        expect(Buffer.isBuffer(buffer3)).toBe(true);
      });
    }
  );
});
