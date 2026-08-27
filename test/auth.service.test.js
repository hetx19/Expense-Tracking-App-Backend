const authService = require("../services/auth.service");
const userRepository = require("../repositories/user.repository");
const expenseService = require("../services/expense.service");
const incomeService = require("../services/income.service");
const cloudinary = require("../config/cloudinary");
const AppError = require("../utils/AppError");
const bcrypt = require("bcryptjs");

jest.mock("../repositories/user.repository");
jest.mock("../services/expense.service");
jest.mock("../services/income.service");
jest.mock("../config/cloudinary");
jest.mock("bcryptjs");

describe("Auth Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("signUpUser", () => {
    it("should register a new user successfully", async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      bcrypt.genSalt.mockResolvedValue("salt");
      bcrypt.hash.mockResolvedValue("hashedPassword");
      const mockCreatedUser = {
        _id: "user123",
        name: "Alice",
        email: "alice@example.com",
        password: "hashedPassword",
      };
      userRepository.create.mockResolvedValue(mockCreatedUser);

      const result = await authService.signUpUser({
        name: "Alice",
        email: "alice@example.com",
        password: "Password123!",
      });

      expect(userRepository.findByEmail).toHaveBeenCalledWith("alice@example.com");
      expect(bcrypt.hash).toHaveBeenCalledWith("Password123!", "salt");
      expect(result.id).toBe("user123");
      expect(result.user).toEqual(mockCreatedUser);
      expect(result.token).toBeDefined();
    });

    it("should throw AppError 400 if user email already exists", async () => {
      userRepository.findByEmail.mockResolvedValue({ _id: "user123" });

      await expect(
        authService.signUpUser({
          name: "Alice",
          email: "alice@example.com",
          password: "Password123!",
        })
      ).rejects.toThrow(new AppError("User With This Email Already Exists", 400));
    });
  });

  describe("signInUser", () => {
    it("should sign in successfully with valid credentials", async () => {
      const mockUser = {
        _id: "user123",
        email: "alice@example.com",
        password: "hashedPassword",
      };
      userRepository.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      const result = await authService.signInUser({
        email: "alice@example.com",
        password: "Password123!",
      });

      expect(userRepository.findByEmail).toHaveBeenCalledWith("alice@example.com");
      expect(bcrypt.compare).toHaveBeenCalledWith("Password123!", "hashedPassword");
      expect(result.id).toBe("user123");
      expect(result.token).toBeDefined();
    });

    it("should throw AppError 401 with invalid email/password", async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        authService.signInUser({
          email: "invalid@example.com",
          password: "Password123!",
        })
      ).rejects.toThrow(new AppError("Invalid email or password", 401));
    });
  });

  describe("getUser", () => {
    it("should return user profile when found", async () => {
      const mockUser = { _id: "user123", name: "Alice" };
      userRepository.findById.mockResolvedValue(mockUser);

      const result = await authService.getUser("user123");

      expect(userRepository.findById).toHaveBeenCalledWith("user123", "-password");
      expect(result).toEqual(mockUser);
    });

    it("should throw AppError 404 when user not found", async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(authService.getUser("nonexistent")).rejects.toThrow(
        new AppError("User Not Found", 404)
      );
    });
  });

  describe("uploadImage", () => {
    it("should upload image to cloudinary and return url", async () => {
      cloudinary.uploader.upload.mockResolvedValue({
        secure_url: "http://cloudinary.com/pic.jpg",
      });

      const result = await authService.uploadImage({ path: "/tmp/pic.jpg" });

      expect(cloudinary.uploader.upload).toHaveBeenCalledWith("/tmp/pic.jpg", {
        folder: "expense-tracker",
      });
      expect(result).toEqual({ imageUrl: "http://cloudinary.com/pic.jpg" });
    });

    it("should throw AppError 400 when file is missing", async () => {
      await expect(authService.uploadImage(null)).rejects.toThrow(
        new AppError("No File Uploaded", 400)
      );
    });
  });

  describe("updateUser", () => {
    it("should update user profile successfully", async () => {
      const mockUser = {
        _id: "user123",
        name: "Alice",
        email: "alice@example.com",
        profileImageUrl: null,
      };
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.findByEmail.mockResolvedValue(null);
      bcrypt.genSalt.mockResolvedValue("salt");
      bcrypt.hash.mockResolvedValue("newHash");
      const savedUser = {
        _id: "user123",
        name: "Alice Updated",
        email: "newalice@example.com",
        profileImageUrl: "http://example.com/pic.jpg",
      };
      userRepository.save.mockResolvedValue(savedUser);

      const result = await authService.updateUser("user123", {
        name: "Alice Updated",
        email: "newalice@example.com",
        password: "NewPassword123!",
        profileImageUrl: "http://example.com/pic.jpg",
      });

      expect(userRepository.findById).toHaveBeenCalledWith("user123", "-password");
      expect(result._id).toBe("user123");
      expect(result.name).toBe("Alice Updated");
      expect(result.message).toBe("User Updated Successfully");
    });

    it("should throw AppError 404 when user to update is not found", async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        authService.updateUser("nonexistent", { name: "Test" })
      ).rejects.toThrow(new AppError("User Not Found", 404));
    });

    it("should throw AppError 400 when new email already exists", async () => {
      const mockUser = { _id: "user123", email: "alice@example.com" };
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.findByEmail.mockResolvedValue({ _id: "user456" });

      await expect(
        authService.updateUser("user123", { email: "existing@example.com" })
      ).rejects.toThrow(new AppError("User With This Email Already Exists", 400));
    });
  });

  describe("updateImage", () => {
    it("should return existing profile image if no new file provided", async () => {
      const mockUser = {
        _id: "user123",
        profileImageUrl: "http://example.com/existing.jpg",
      };
      userRepository.findById.mockResolvedValue(mockUser);

      const result = await authService.updateImage("user123", null);

      expect(result).toEqual({ imageUrl: "http://example.com/existing.jpg" });
    });

    it("should delete old image and upload new one when file provided", async () => {
      const mockUser = {
        _id: "user123",
        profileImageUrl: "http://res.cloudinary.com/demo/image/upload/v1234/oldpic.jpg",
      };
      userRepository.findById.mockResolvedValue(mockUser);
      cloudinary.api.delete_resources.mockResolvedValue({});
      cloudinary.uploader.upload.mockImplementation((path, opts, cb) => {
        cb(null, { secure_url: "http://cloudinary.com/newpic.jpg" });
      });

      const result = await authService.updateImage("user123", {
        path: "/tmp/newpic.jpg",
      });

      expect(cloudinary.api.delete_resources).toHaveBeenCalledWith(
        ["expense-tracker/oldpic"],
        { type: "upload", resource_type: "image" }
      );
      expect(result).toEqual({ imageUrl: "http://cloudinary.com/newpic.jpg" });
    });

    it("should throw AppError 404 when user not found", async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        authService.updateImage("nonexistent", { path: "/tmp/pic.jpg" })
      ).rejects.toThrow(new AppError("User Not Found", 404));
    });
  });

  describe("deleteUser", () => {
    it("should delete user and cascade delete expenses, income, and cloudinary assets", async () => {
      const mockUser = {
        _id: "user123",
        profileImageUrl: "http://res.cloudinary.com/demo/image/upload/v1234/profile.jpg",
      };
      userRepository.findById.mockResolvedValue(mockUser);
      expenseService.deleteAllExpensesByUser.mockResolvedValue({ deletedCount: 2 });
      incomeService.deleteAllIncomeByUser.mockResolvedValue({ deletedCount: 1 });
      cloudinary.api.delete_resources.mockResolvedValue({});
      userRepository.deleteById.mockResolvedValue(mockUser);

      const result = await authService.deleteUser("user123");

      expect(userRepository.findById).toHaveBeenCalledWith("user123");
      expect(expenseService.deleteAllExpensesByUser).toHaveBeenCalledWith("user123");
      expect(incomeService.deleteAllIncomeByUser).toHaveBeenCalledWith("user123");
      expect(cloudinary.api.delete_resources).toHaveBeenCalledWith(
        ["expense-tracker/profile"],
        { type: "upload", resource_type: "image" }
      );
      expect(userRepository.deleteById).toHaveBeenCalledWith("user123");
      expect(result).toEqual({ message: "User Deleted Successfully" });
    });

    it("should throw AppError 404 when user to delete not found", async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(authService.deleteUser("nonexistent")).rejects.toThrow(
        new AppError("User Not Found", 404)
      );
    });
  });
});
