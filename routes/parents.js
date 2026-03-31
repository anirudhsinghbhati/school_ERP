const express = require('express');
const { authMiddleware, rbac } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/parents/dashboard
 * Get parent's dashboard with all linked students and their latest marks
 */
router.get('/dashboard', authMiddleware, rbac('parent'), async (req, res) => {
  res.status(501).json({ message: 'Endpoint not yet implemented' });
});

/**
 * GET /api/parents/students/:studentId/progress
 * Get progress history of a student (marks over time)
 */
router.get('/students/:studentId/progress', authMiddleware, rbac('parent'), async (req, res) => {
  res.status(501).json({ message: 'Endpoint not yet implemented' });
});

/**
 * GET /api/parents/reportcards/:reportCardId
 * Get a specific report card
 */
router.get('/reportcards/:reportCardId', authMiddleware, rbac('parent'), async (req, res) => {
  res.status(501).json({ message: 'Endpoint not yet implemented' });
});

/**
 * GET /api/updates/:studentId
 * Polling endpoint to get recent updates for a student
 */
router.get('/updates/:studentId', authMiddleware, rbac('parent'), async (req, res) => {
  res.status(501).json({ message: 'Endpoint not yet implemented' });
});

module.exports = router;
