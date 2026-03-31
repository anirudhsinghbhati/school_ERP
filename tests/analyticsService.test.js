jest.mock('../db', () => ({
  query: jest.fn(),
}));

const pool = require('../db');
const { getClassPerformance, getSubjectGaps, getPerformanceTrends } = require('../services/analyticsService');

describe('analyticsService validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getClassPerformance rejects invalid classId', async () => {
    await expect(getClassPerformance({ classId: 'abc' })).rejects.toMatchObject({
      statusCode: 400,
      message: 'classId must be a valid integer',
    });

    expect(pool.query).not.toHaveBeenCalled();
  });

  test('getSubjectGaps rejects invalid threshold range', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 2, name: 'Math', code: 'MTH' }] });

    await expect(
      getSubjectGaps({
        subjectId: 2,
        threshold: 180,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'threshold must be between 1 and 100',
    });
  });

  test('getPerformanceTrends rejects invalid date values', async () => {
    await expect(
      getPerformanceTrends({
        from: 'not-a-date',
        to: '2026-01-01',
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'from and to must be valid ISO date-time values',
    });
  });
});
