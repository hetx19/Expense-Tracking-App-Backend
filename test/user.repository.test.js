const userRepository = require('../repositories/user.repository');
const User = require('../models/User');

jest.mock('../models/User');

describe('User Repository Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };
      User.findOne.mockResolvedValue(mockUser);

      const result = await userRepository.findByEmail('test@example.com');

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findById', () => {
    it('should find user by id without select', async () => {
      const mockUser = { _id: 'user123', name: 'Test User' };
      User.findById.mockResolvedValue(mockUser);

      const result = await userRepository.findById('user123');

      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(result).toEqual(mockUser);
    });

    it('should find user by id with select projection', async () => {
      const mockSelect = jest
        .fn()
        .mockResolvedValue({ _id: 'user123', name: 'Test User' });
      User.findById.mockReturnValue({ select: mockSelect });

      const result = await userRepository.findById('user123', '-password');

      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(mockSelect).toHaveBeenCalledWith('-password');
      expect(result).toEqual({ _id: 'user123', name: 'Test User' });
    });
  });

  describe('create', () => {
    it('should create user', async () => {
      const userData = { name: 'Test User', email: 'test@example.com' };
      User.create.mockResolvedValue({ _id: 'user123', ...userData });

      const result = await userRepository.create(userData);

      expect(User.create).toHaveBeenCalledWith(userData);
      expect(result).toEqual({ _id: 'user123', ...userData });
    });
  });

  describe('save', () => {
    it('should save user document', async () => {
      const saveMock = jest
        .fn()
        .mockResolvedValue({ _id: 'user123', name: 'Updated User' });
      const userDoc = { save: saveMock };

      const result = await userRepository.save(userDoc);

      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual({ _id: 'user123', name: 'Updated User' });
    });
  });

  describe('deleteById', () => {
    it('should delete user by id', async () => {
      const mockDeleted = { _id: 'user123' };
      User.findByIdAndDelete.mockResolvedValue(mockDeleted);

      const result = await userRepository.deleteById('user123');

      expect(User.findByIdAndDelete).toHaveBeenCalledWith('user123');
      expect(result).toEqual(mockDeleted);
    });
  });
});
