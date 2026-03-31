const pool = require('../db');

function toInteger(value, fieldName) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    const err = new Error(`${fieldName} must be a valid integer`);
    err.statusCode = 400;
    throw err;
  }

  return parsed;
}

async function getParentStudents(parentUserId) {
  const result = await pool.query(
    `SELECT id, name, roll_number, class_id, attendance_percentage, created_at
     FROM students
     WHERE user_id = $1
     ORDER BY id ASC`,
    [parentUserId]
  );

  return result.rows;
}

async function ensureParentOwnsStudent(parentUserId, studentId) {
  const result = await pool.query(
    `SELECT id, name, roll_number, class_id, attendance_percentage
     FROM students
     WHERE id = $1 AND user_id = $2`,
    [studentId, parentUserId]
  );

  if (result.rows.length === 0) {
    const err = new Error('Student not found for this parent account');
    err.statusCode = 404;
    throw err;
  }

  return result.rows[0];
}

async function getLatestMarksByStudentIds(studentIds) {
  if (studentIds.length === 0) {
    return [];
  }

  const result = await pool.query(
    `SELECT DISTINCT ON (m.student_id, m.subject_id)
      m.id,
      m.student_id,
      m.subject_id,
      sub.name AS subject_name,
      m.marks_obtained,
      m.total_marks,
      m.exam_type,
      m.published_at,
      m.created_at
     FROM marks m
     JOIN subjects sub ON sub.id = m.subject_id
     WHERE m.student_id = ANY($1::int[])
     ORDER BY m.student_id, m.subject_id, COALESCE(m.published_at, m.created_at) DESC`,
    [studentIds]
  );

  return result.rows;
}

async function getLatestReportCardsByStudentIds(studentIds) {
  if (studentIds.length === 0) {
    return [];
  }

  const result = await pool.query(
    `SELECT DISTINCT ON (r.student_id)
      r.id,
      r.student_id,
      r.class_id,
      r.term_id,
      r.generated_at,
      r.is_published,
      r.metadata,
      r.created_at
     FROM reportcards r
     WHERE r.student_id = ANY($1::int[])
     ORDER BY r.student_id, r.generated_at DESC, r.created_at DESC`,
    [studentIds]
  );

  return result.rows;
}

async function getParentDashboard(parentUserId) {
  const students = await getParentStudents(parentUserId);

  if (students.length === 0) {
    return {
      students: [],
      summary: {
        totalStudents: 0,
        recentUpdates: 0,
      },
    };
  }

  const studentIds = students.map((student) => student.id);
  const [latestMarks, latestReportCards] = await Promise.all([
    getLatestMarksByStudentIds(studentIds),
    getLatestReportCardsByStudentIds(studentIds),
  ]);

  const marksByStudent = latestMarks.reduce((acc, mark) => {
    if (!acc[mark.student_id]) {
      acc[mark.student_id] = [];
    }
    acc[mark.student_id].push(mark);
    return acc;
  }, {});

  const reportByStudent = latestReportCards.reduce((acc, report) => {
    acc[report.student_id] = report;
    return acc;
  }, {});

  const enrichedStudents = students.map((student) => ({
    ...student,
    latestMarks: marksByStudent[student.id] || [],
    latestReportCard: reportByStudent[student.id] || null,
  }));

  return {
    students: enrichedStudents,
    summary: {
      totalStudents: students.length,
      recentUpdates: latestMarks.length + latestReportCards.length,
    },
  };
}

async function getStudentProgress({ parentUserId, studentId }) {
  const student = await ensureParentOwnsStudent(parentUserId, studentId);

  const result = await pool.query(
    `SELECT
      m.id,
      m.student_id,
      m.subject_id,
      sub.name AS subject_name,
      m.marks_obtained,
      m.total_marks,
      m.exam_type,
      COALESCE(m.published_at, m.created_at) AS recorded_at,
      ROUND((m.marks_obtained / NULLIF(m.total_marks, 0)) * 100, 2) AS percentage
     FROM marks m
     JOIN subjects sub ON sub.id = m.subject_id
     WHERE m.student_id = $1
     ORDER BY recorded_at ASC`,
    [studentId]
  );

  const marks = result.rows;
  const overallAverage = marks.length
    ? Number(
      (
        marks.reduce((sum, row) => sum + Number(row.percentage || 0), 0) /
        marks.length
      ).toFixed(2)
    )
    : 0;

  return {
    student,
    overallAverage,
    points: marks,
  };
}

async function getReportCard({ parentUserId, reportCardId }) {
  const reportCardIdNum = toInteger(reportCardId, 'reportCardId');

  const result = await pool.query(
    `SELECT
      r.id,
      r.student_id,
      r.class_id,
      r.term_id,
      r.generated_at,
      r.is_published,
      r.metadata,
      r.created_at,
      s.name AS student_name,
      s.roll_number
     FROM reportcards r
     JOIN students s ON s.id = r.student_id
     WHERE r.id = $1 AND s.user_id = $2`,
    [reportCardIdNum, parentUserId]
  );

  if (result.rows.length === 0) {
    const err = new Error('Report card not found for this parent account');
    err.statusCode = 404;
    throw err;
  }

  return result.rows[0];
}

async function getStudentUpdates({ parentUserId, studentId, since }) {
  const studentIdNum = toInteger(studentId, 'studentId');
  await ensureParentOwnsStudent(parentUserId, studentIdNum);

  const sinceDate = since ? new Date(since) : null;
  if (since && Number.isNaN(sinceDate.getTime())) {
    const err = new Error('Invalid since value. Use ISO date-time string.');
    err.statusCode = 400;
    throw err;
  }

  const auditResult = await pool.query(
    `SELECT
      a.id,
      a.action,
      a.entity,
      a.entity_id,
      a.changes,
      a.timestamp
     FROM audit_logs a
     WHERE a.entity IN ('marks', 'reportcard')
       AND a.timestamp > COALESCE($2::timestamp, '1970-01-01'::timestamp)
       AND (
         (a.entity = 'marks' AND a.entity_id IN (
            SELECT m.id FROM marks m WHERE m.student_id = $1
         ))
         OR
         (a.entity = 'reportcard' AND a.entity_id IN (
            SELECT r.id FROM reportcards r WHERE r.student_id = $1
         ))
       )
     ORDER BY a.timestamp DESC
     LIMIT 100`,
    [studentIdNum, sinceDate]
  );

  return {
    studentId: studentIdNum,
    since: sinceDate ? sinceDate.toISOString() : null,
    updates: auditResult.rows,
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = {
  getParentDashboard,
  getStudentProgress,
  getReportCard,
  getStudentUpdates,
};
