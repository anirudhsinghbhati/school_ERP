const express = require('express');
const { authMiddleware, rbac } = require('../middleware/auth');
const {
  getParentDashboard,
  getStudentProgress,
  getReportCard,
  getStudentUpdates,
} = require('../services/parentService');

const router = express.Router();

/**
 * GET /api/parents/dashboard
 * Get parent's dashboard with all linked students and their latest marks
 */
router.get('/dashboard', authMiddleware, rbac('parent'), async (req, res) => {
  const dashboard = await getParentDashboard(req.user.id);

  return res.json({
    message: 'Parent dashboard fetched successfully',
    data: dashboard,
  });
});

/**
 * GET /api/parents/students/:studentId/progress
 * Get progress history of a student (marks over time)
 */
router.get('/students/:studentId/progress', authMiddleware, rbac('parent'), async (req, res) => {
  const studentId = Number(req.params.studentId);

  if (!Number.isInteger(studentId)) {
    return res.status(400).json({ error: 'studentId must be a valid integer' });
  }

  const progress = await getStudentProgress({
    parentUserId: req.user.id,
    studentId,
  });

  return res.json({
    message: 'Student progress fetched successfully',
    data: progress,
  });
});

/**
 * GET /api/parents/reportcards/:reportCardId
 * Get a specific report card
 */
router.get('/reportcards/:reportCardId', authMiddleware, rbac('parent'), async (req, res) => {
  const report = await getReportCard({
    parentUserId: req.user.id,
    reportCardId: req.params.reportCardId,
  });

  return res.json({
    message: 'Report card fetched successfully',
    data: report,
  });
});

/**
 * GET /api/updates/:studentId
 * Polling endpoint to get recent updates for a student
 */
router.get('/updates/:studentId', authMiddleware, rbac('parent'), async (req, res) => {
  const updates = await getStudentUpdates({
    parentUserId: req.user.id,
    studentId: req.params.studentId,
    since: req.query.since,
  });

  return res.json({
    message: 'Student updates fetched successfully',
    data: updates,
  });
});

module.exports = router;
