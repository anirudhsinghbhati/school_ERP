const express = require('express');
const { authMiddleware, rbac } = require('../middleware/auth');
const {
  getClassPerformance,
  getSubjectGaps,
  getPerformanceTrends,
} = require('../services/analyticsService');

const router = express.Router();

/**
 * GET /api/analytics/class/:classId/performance
 * Get class performance metrics (avg, pass %, distribution)
 */
router.get('/class/:classId/performance', authMiddleware, rbac(['admin', 'department']), async (req, res) => {
  const data = await getClassPerformance({
    classId: req.params.classId,
    passThreshold: req.query.passThreshold,
  });

  return res.json({
    message: 'Class performance fetched successfully',
    data,
  });
});

/**
 * GET /api/analytics/subject/:subjectId/gaps
 * Get learning gaps for a subject (identify struggling students)
 */
router.get('/subject/:subjectId/gaps', authMiddleware, rbac(['admin', 'department']), async (req, res) => {
  const data = await getSubjectGaps({
    subjectId: req.params.subjectId,
    classId: req.query.classId,
    threshold: req.query.threshold,
  });

  return res.json({
    message: 'Subject learning gaps fetched successfully',
    data,
  });
});

/**
 * GET /api/analytics/trends
 * Get performance trends over time
 */
router.get('/trends', authMiddleware, rbac(['admin', 'department']), async (req, res) => {
  const data = await getPerformanceTrends({
    classId: req.query.classId,
    subjectId: req.query.subjectId,
    from: req.query.from,
    to: req.query.to,
  });

  return res.json({
    message: 'Performance trends fetched successfully',
    data,
  });
});

module.exports = router;
