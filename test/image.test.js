// Mock cloudinary
const mockCloudinary = {
  uploader: {
    upload: jest.fn(),
  },
  api: {
    delete_resources: jest.fn(),
  },
};

jest.mock('../config/cloudinary', () => mockCloudinary);

const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');

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
  jest.clearAllMocks();
});

const createUserAndToken = async () => {
  const user = await User.create({
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword',
    profileImageUrl: 'http://example.com/profile.jpg',
  });

  const token = jwt.sign({ id: user._id }, env.JWT_SECRET, {
    expiresIn: '2h',
  });

  return { user, token };
};

describe('POST /api/auth/upload-image', () => {
  let token;

  beforeEach(async () => {
    const { token: userToken } = await createUserAndToken();
    token = userToken;
  });

  it('should upload image successfully', async () => {
    const mockResult = {
      secure_url: 'https://cloudinary.com/test-image.jpg',
    };

    mockCloudinary.uploader.upload.mockResolvedValue(mockResult);

    const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');

    const fixturesDir = path.join(__dirname, 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    if (!fs.existsSync(testImagePath)) {
      fs.writeFileSync(testImagePath, 'fake image data');
    }

    const res = await request(app)
      .post('/api/auth/upload-image')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', testImagePath);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.imageUrl).toBe(mockResult.secure_url);
    expect(mockCloudinary.uploader.upload).toHaveBeenCalledWith(
      expect.any(String),
      { folder: 'expense-tracker' }
    );
  });

  it('should return 400 if no file is uploaded', async () => {
    const res = await request(app)
      .post('/api/auth/upload-image')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('No File Uploaded');
  });

  it('should return 400 for invalid file type', async () => {
    const testFilePath = path.join(__dirname, 'fixtures', 'test-file.txt');

    const fixturesDir = path.join(__dirname, 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    fs.writeFileSync(testFilePath, 'test content');

    const res = await request(app)
      .post('/api/auth/upload-image')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', testFilePath);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('No File Uploaded');
  });

  it('should handle cloudinary upload error', async () => {
    mockCloudinary.uploader.upload.mockRejectedValue(
      new Error('Cloudinary upload failed')
    );

    const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');

    const fixturesDir = path.join(__dirname, 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    if (!fs.existsSync(testImagePath)) {
      fs.writeFileSync(testImagePath, 'fake image data');
    }

    const res = await request(app)
      .post('/api/auth/upload-image')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', testImagePath);

    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Cloudinary upload failed');
  });
});

describe('POST /api/auth/update-image', () => {
  it('should return 400 if no file uploaded', async () => {
    const { uploadImage } = require('../controllers/authControllers');

    const req = { file: null };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await uploadImage(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'No File Uploaded',
        statusCode: 400,
      })
    );
  });

  it('should upload image successfully', async () => {
    const { uploadImage } = require('../controllers/authControllers');

    const mockResult = {
      secure_url: 'https://cloudinary.com/test-image.jpg',
    };

    mockCloudinary.uploader.upload.mockResolvedValue(mockResult);

    const req = { file: { path: '/tmp/test-image.jpg' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await uploadImage(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { imageUrl: mockResult.secure_url },
    });
    expect(mockCloudinary.uploader.upload).toHaveBeenCalledWith(
      '/tmp/test-image.jpg',
      { folder: 'expense-tracker' }
    );
  });

  it('should handle server error during upload', async () => {
    const { uploadImage } = require('../controllers/authControllers');

    mockCloudinary.uploader.upload.mockRejectedValue(
      new Error('Upload failed')
    );

    const req = { file: { path: '/tmp/test-image.jpg' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await uploadImage(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Upload failed',
      })
    );
  });
});

describe('PUT /api/auth/update-image', () => {
  let user;

  beforeEach(async () => {
    const userData = await createUserAndToken();
    user = userData.user;
  });

  it('should return existing image URL if no file provided', async () => {
    const { updateImage } = require('../controllers/authControllers');

    const req = {
      user: { _id: user._id },
      file: null,
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const next = jest.fn();

    await updateImage(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { imageUrl: 'http://example.com/profile.jpg' },
    });
  });

  it('should handle error in cloudinary upload callback', async () => {
    const error = new Error('Upload callback failed');

    mockCloudinary.api.delete_resources.mockResolvedValue({});

    mockCloudinary.uploader.upload.mockImplementation(
      (filePath, options, callback) => {
        callback(error, null);
      }
    );

    const { updateImage } = require('../controllers/authControllers');

    const req = {
      user: { _id: user._id },
      file: { path: '/tmp/failing-upload.jpg' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await updateImage(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Upload callback failed',
      })
    );
  });

  it('should update image successfully when file is provided', async () => {
    const mockResult = {
      secure_url: 'https://cloudinary.com/new-image.jpg',
    };

    mockCloudinary.api.delete_resources.mockResolvedValue({});
    mockCloudinary.uploader.upload.mockImplementation(
      (filePath, options, callback) => {
        if (callback) {
          callback(null, mockResult);
        } else {
          return Promise.resolve(mockResult);
        }
      }
    );

    const { updateImage } = require('../controllers/authControllers');

    const req = {
      user: { _id: user._id },
      file: { path: '/tmp/new-image.jpg' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const next = jest.fn();

    await updateImage(req, res, next);

    expect(mockCloudinary.api.delete_resources).toHaveBeenCalledWith(
      ['expense-tracker/profile'],
      {
        type: 'upload',
        resource_type: 'image',
      }
    );
    expect(mockCloudinary.uploader.upload).toHaveBeenCalledWith(
      '/tmp/new-image.jpg',
      { folder: 'expense-tracker' },
      expect.any(Function)
    );
  });

  it('should handle user not found error', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const { updateImage } = require('../controllers/authControllers');

    const req = {
      user: { _id: fakeId },
      file: null,
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await updateImage(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'User Not Found',
        statusCode: 404,
      })
    );
  });

  it('should handle server error during image update', async () => {
    jest.spyOn(User, 'findById').mockImplementation(() => {
      throw new Error('Database error');
    });

    const { updateImage } = require('../controllers/authControllers');

    const req = {
      user: { _id: user._id },
      file: null,
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await updateImage(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Database error',
      })
    );

    User.findById.mockRestore();
  });
});

describe('Upload middleware tests', () => {
  it('should allow valid image file types', () => {
    const upload = require('../middleware/upload');

    const req = {};
    const file = { mimetype: 'image/jpeg' };
    const cb = jest.fn();

    const multerOptions = upload.options || upload;
    if (multerOptions.fileFilter) {
      multerOptions.fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    }
  });
});
