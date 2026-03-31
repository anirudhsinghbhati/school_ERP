const express = require('express');
const { authMiddleware, rbac } = require('../middleware/auth');
const {
  createMark,
  getClassMarks,
  createAssignment,
  getClassAssignments,
} = require('../services/academicService');

const router = express.Router();

/**
 * POST /api/academics/marks
 * Teacher uploads a new mark for a student
 */
router.post('/marks', authMiddleware, rbac('teacher'), async (req, res) => {
  const mark = await createMark({
    payload: req.body,
    userId: req.user.id,
    ipAddress: req.ip,
  });

  res.status(201).json({
    message: 'Mark published successfully',
    data: mark,
  });
});

/**
 * GET /api/academics/classes/:classId/marks
 * Get all marks for a class
 */
router.get('/classes/:classId/marks', authMiddleware, rbac(['teacher', 'admin']), async (req, res) => {
  const classId = Number(req.params.classId);

  if (!Number.isInteger(classId)) {
    return res.status(400).json({ error: 'classId must be a valid integer' });
  }

  const marks = await getClassMarks({ classId, user: req.user });

  return res.json({
    count: marks.length,
    data: marks,
  });
});

/**
 * POST /api/academics/assignments
 * Create a new assignment
 */
router.post('/assignments', authMiddleware, rbac('teacher'), async (req, res) => {
  const assignment = await createAssignment({
    payload: req.body,
    userId: req.user.id,
  });

  res.status(201).json({
    message: 'Assignment created successfully',
    data: assignment,
  });
});

/**
 * GET /api/academics/assignments/:classId
 * Get all assignments for a class
 */
router.get('/assignments/:classId', authMiddleware, rbac(['teacher', 'admin', 'department']), async (req, res) => {
  const classId = Number(req.params.classId);

  if (!Number.isInteger(classId)) {
    return res.status(400).json({ error: 'classId must be a valid integer' });
  }

  const assignments = await getClassAssignments({ classId, user: req.user });

  return res.json({
    count: assignments.length,
    data: assignments,
  });
});

module.exports = router;
