jest.mock('../db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}));

const pool = require('../db');
const { createMark, getClassMarks } = require('../services/academicService');

describe('academicService validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createMark throws for missing required fields', async () => {
    await expect(
      createMark({
        payload: { classId: 1 },
        userId: 12,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'studentId, subjectId, classId, marksObtained, and totalMarks are required',
    });

    expect(pool.query).not.toHaveBeenCalled();
  });

  test('createMark throws when marks exceed total', async () => {
    await expect(
      createMark({
        payload: {
          studentId: 1,
          subjectId: 1,
          classId: 1,
          marksObtained: 95,
          totalMarks: 70,
          examType: 'unit_test',
        },
        userId: 12,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'marksObtained must be between 0 and totalMarks',
    });

    expect(pool.query).not.toHaveBeenCalled();
  });

  test('getClassMarks throws when class does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await expect(
      getClassMarks({
        classId: 999,
        user: { id: 1, role: 'admin' },
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Class not found',
    });
  });
});
