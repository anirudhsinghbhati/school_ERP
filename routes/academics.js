const express = require('express');
const { authMiddleware, rbac } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/academics/marks
 * Teacher uploads a new mark for a student
 */
router.post('/marks', authMiddleware, rbac('teacher'), async (req, res) => {
  res.status(501).json({ message: 'Endpoint not yet implemented' });
});

/**
 * GET /api/academics/classes/:classId/marks
 * Get all marks for a class
 */
router.get('/classes/:classId/marks', authMiddleware, rbac(['teacher', 'admin']), async (req, res) => {
  res.status(501).json({ message: 'Endpoint not yet implemented' });
});

/**
 * POST /api/academics/assignments
 * Create a new assignment
 */
router.post('/assignments', authMiddleware, rbac('teacher'), async (req, res) => {
  res.status(501).json({ message: 'Endpoint not yet implemented' });
});

/**
 * GET /api/academics/assignments/:classId
 * Get all assignments for a class
 */
router.get('/assignments/:classId', authMiddleware, async (req, res) => {
  res.status(501).json({ message: 'Endpoint not yet implemented' });
});

module.exports = router;
