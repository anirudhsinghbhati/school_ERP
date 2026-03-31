jest.mock('../db', () => ({
  query: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

const pool = require('../db');
const jwt = require('jsonwebtoken');
const { authMiddleware, rbac } = require('../middleware/auth');

describe('auth middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when token is missing', async () => {
    const req = { headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization token' });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 403 when token is invalid', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid token');
    });

    const req = { headers: { authorization: 'Bearer bad-token' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  test('attaches user and calls next for valid token', async () => {
    jwt.verify.mockReturnValue({ userId: 5 });
    pool.query.mockResolvedValue({
      rows: [
        {
          id: 5,
          email: 'teacher@example.com',
          role: 'teacher',
          active: true,
        },
      ],
    });

    const req = { headers: { authorization: 'Bearer valid-token' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(5);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('rbac middleware', () => {
  test('blocks when role is not allowed', () => {
    const req = { user: { role: 'parent' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    rbac(['teacher', 'admin'])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next when role is allowed', () => {
    const req = { user: { role: 'teacher' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    rbac(['teacher', 'admin'])(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
