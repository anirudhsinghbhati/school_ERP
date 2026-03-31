const pool = require('../db');

const VALID_EXAM_TYPES = ['unit_test', 'midterm', 'final', 'assignment', 'quiz'];

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : NaN;
}

async function getTeacherByUserId(userId) {
  const result = await pool.query(
    'SELECT id, school_id FROM teachers WHERE user_id = $1',
    [userId]
  );

  return result.rows[0] || null;
}

async function getClassById(classId) {
  const result = await pool.query(
    'SELECT id, name, school_id, teacher_id FROM classes WHERE id = $1',
    [classId]
  );

  return result.rows[0] || null;
}

async function studentBelongsToClass(studentId, classId) {
  const result = await pool.query(
    'SELECT id FROM students WHERE id = $1 AND class_id = $2',
    [studentId, classId]
  );

  return result.rows.length > 0;
}

async function subjectAssignedToClass(subjectId, classId) {
  const result = await pool.query(
    'SELECT id FROM class_subject WHERE class_id = $1 AND subject_id = $2',
    [classId, subjectId]
  );

  return result.rows.length > 0;
}

function validateMarkPayload(payload) {
  const {
    studentId,
    subjectId,
    classId,
    marksObtained,
    totalMarks,
    examType,
  } = payload;

  if (!studentId || !subjectId || !classId || marksObtained === undefined || totalMarks === undefined) {
    return 'studentId, subjectId, classId, marksObtained, and totalMarks are required';
  }

  const markValue = toNumber(marksObtained);
  const totalValue = toNumber(totalMarks);

  if (!Number.isInteger(Number(studentId)) || !Number.isInteger(Number(subjectId)) || !Number.isInteger(Number(classId))) {
    return 'studentId, subjectId, and classId must be valid integers';
  }

  if (Number.isNaN(markValue) || Number.isNaN(totalValue) || totalValue <= 0) {
    return 'marksObtained and totalMarks must be valid numbers and totalMarks must be > 0';
  }

  if (markValue < 0 || markValue > totalValue) {
    return 'marksObtained must be between 0 and totalMarks';
  }

  if (examType && !VALID_EXAM_TYPES.includes(examType)) {
    return `examType must be one of: ${VALID_EXAM_TYPES.join(', ')}`;
  }

  return null;
}

async function createMark({ payload, userId, ipAddress }) {
  const validationError = validateMarkPayload(payload);

  if (validationError) {
    const err = new Error(validationError);
    err.statusCode = 400;
    throw err;
  }

  const studentId = Number(payload.studentId);
  const subjectId = Number(payload.subjectId);
  const classId = Number(payload.classId);
  const marksObtained = toNumber(payload.marksObtained);
  const totalMarks = toNumber(payload.totalMarks);
  const examType = payload.examType || 'unit_test';
  const publishedAt = payload.publishedAt ? new Date(payload.publishedAt) : new Date();

  const teacher = await getTeacherByUserId(userId);
  if (!teacher) {
    const err = new Error('Teacher profile not found for current user');
    err.statusCode = 403;
    throw err;
  }

  const classRecord = await getClassById(classId);
  if (!classRecord) {
    const err = new Error('Class not found');
    err.statusCode = 404;
    throw err;
  }

  if (classRecord.teacher_id !== teacher.id) {
    const err = new Error('You can only publish marks for your assigned classes');
    err.statusCode = 403;
    throw err;
  }

  const hasStudent = await studentBelongsToClass(studentId, classId);
  if (!hasStudent) {
    const err = new Error('Student does not belong to the specified class');
    err.statusCode = 400;
    throw err;
  }

  const hasSubject = await subjectAssignedToClass(subjectId, classId);
  if (!hasSubject) {
    const err = new Error('Subject is not assigned to this class');
    err.statusCode = 400;
    throw err;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [String(userId)]);

    const insertResult = await client.query(
      `INSERT INTO marks (
        student_id, subject_id, class_id, marks_obtained, total_marks,
        exam_type, published_at, teacher_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, student_id, subject_id, class_id, marks_obtained, total_marks, exam_type, published_at, teacher_id, created_at`,
      [
        studentId,
        subjectId,
        classId,
        marksObtained,
        totalMarks,
        examType,
        publishedAt,
        teacher.id,
      ]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, changes, ip_address)
       VALUES ($1, 'CREATE', 'marks', $2, $3::jsonb, $4::inet)`,
      [
        userId,
        insertResult.rows[0].id,
        JSON.stringify({
          source: 'api',
          note: 'Mark published by teacher',
        }),
        ipAddress || null,
      ]
    );

    await client.query('COMMIT');
    return insertResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getClassMarks({ classId, user }) {
  const classRecord = await getClassById(classId);

  if (!classRecord) {
    const err = new Error('Class not found');
    err.statusCode = 404;
    throw err;
  }

  if (user.role === 'teacher') {
    const teacher = await getTeacherByUserId(user.id);

    if (!teacher || classRecord.teacher_id !== teacher.id) {
      const err = new Error('You can only view marks for your assigned classes');
      err.statusCode = 403;
      throw err;
    }
  }

  const result = await pool.query(
    `SELECT
      m.id,
      m.student_id,
      s.name AS student_name,
      m.subject_id,
      sub.name AS subject_name,
      m.class_id,
      m.marks_obtained,
      m.total_marks,
      m.exam_type,
      m.published_at,
      m.created_at
    FROM marks m
    JOIN students s ON s.id = m.student_id
    JOIN subjects sub ON sub.id = m.subject_id
    WHERE m.class_id = $1
    ORDER BY m.created_at DESC`,
    [classId]
  );

  return result.rows;
}

async function createAssignment({ payload, userId }) {
  const { classId, subjectId, title, description, dueDate, maxMarks } = payload;

  if (!classId || !subjectId || !title || maxMarks === undefined) {
    const err = new Error('classId, subjectId, title, and maxMarks are required');
    err.statusCode = 400;
    throw err;
  }

  const classIdNum = Number(classId);
  const subjectIdNum = Number(subjectId);
  const maxMarksNum = Number(maxMarks);

  if (!Number.isInteger(classIdNum) || !Number.isInteger(subjectIdNum) || !Number.isFinite(maxMarksNum) || maxMarksNum <= 0) {
    const err = new Error('classId/subjectId must be integers and maxMarks must be > 0');
    err.statusCode = 400;
    throw err;
  }

  const teacher = await getTeacherByUserId(userId);
  if (!teacher) {
    const err = new Error('Teacher profile not found for current user');
    err.statusCode = 403;
    throw err;
  }

  const classRecord = await getClassById(classIdNum);
  if (!classRecord) {
    const err = new Error('Class not found');
    err.statusCode = 404;
    throw err;
  }

  if (classRecord.teacher_id !== teacher.id) {
    const err = new Error('You can only create assignments for your assigned classes');
    err.statusCode = 403;
    throw err;
  }

  const hasSubject = await subjectAssignedToClass(subjectIdNum, classIdNum);
  if (!hasSubject) {
    const err = new Error('Subject is not assigned to this class');
    err.statusCode = 400;
    throw err;
  }

  const result = await pool.query(
    `INSERT INTO assignments (subject_id, class_id, title, description, due_date, max_marks, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, subject_id, class_id, title, description, due_date, max_marks, created_by, created_at`,
    [
      subjectIdNum,
      classIdNum,
      title.trim(),
      description || null,
      dueDate ? new Date(dueDate) : null,
      maxMarksNum,
      teacher.id,
    ]
  );

  return result.rows[0];
}

async function getClassAssignments({ classId, user }) {
  const classRecord = await getClassById(classId);

  if (!classRecord) {
    const err = new Error('Class not found');
    err.statusCode = 404;
    throw err;
  }

  if (user.role === 'teacher') {
    const teacher = await getTeacherByUserId(user.id);

    if (!teacher || classRecord.teacher_id !== teacher.id) {
      const err = new Error('You can only view assignments for your assigned classes');
      err.statusCode = 403;
      throw err;
    }
  }

  const result = await pool.query(
    `SELECT
      a.id,
      a.class_id,
      a.subject_id,
      sub.name AS subject_name,
      a.title,
      a.description,
      a.due_date,
      a.max_marks,
      a.created_at
     FROM assignments a
     JOIN subjects sub ON sub.id = a.subject_id
     WHERE a.class_id = $1
     ORDER BY a.created_at DESC`,
    [classId]
  );

  return result.rows;
}

module.exports = {
  createMark,
  getClassMarks,
  createAssignment,
  getClassAssignments,
};
