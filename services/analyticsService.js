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

function toNumberOrDefault(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function ensureClassExists(classId) {
  const result = await pool.query('SELECT id, name, grade, section FROM classes WHERE id = $1', [classId]);

  if (result.rows.length === 0) {
    const err = new Error('Class not found');
    err.statusCode = 404;
    throw err;
  }

  return result.rows[0];
}

async function ensureSubjectExists(subjectId) {
  const result = await pool.query('SELECT id, name, code FROM subjects WHERE id = $1', [subjectId]);

  if (result.rows.length === 0) {
    const err = new Error('Subject not found');
    err.statusCode = 404;
    throw err;
  }

  return result.rows[0];
}

async function refreshSubjectPerformanceCache(classId) {
  await pool.query(
    `INSERT INTO subject_performance_cache (class_id, subject_id, avg_marks, median_marks, pass_percentage, updated_at)
     SELECT
       m.class_id,
       m.subject_id,
       ROUND(AVG((m.marks_obtained / NULLIF(m.total_marks, 0)) * 100), 2) AS avg_marks,
       ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ((m.marks_obtained / NULLIF(m.total_marks, 0)) * 100))::numeric, 2) AS median_marks,
       ROUND(AVG(CASE WHEN (m.marks_obtained / NULLIF(m.total_marks, 0)) * 100 >= 40 THEN 100 ELSE 0 END), 2) AS pass_percentage,
       NOW()
     FROM marks m
     WHERE m.class_id = $1
     GROUP BY m.class_id, m.subject_id
     ON CONFLICT (class_id, subject_id)
     DO UPDATE SET
       avg_marks = EXCLUDED.avg_marks,
       median_marks = EXCLUDED.median_marks,
       pass_percentage = EXCLUDED.pass_percentage,
       updated_at = NOW()`,
    [classId]
  );
}

async function getClassPerformance({ classId, passThreshold = 40 }) {
  const classIdNum = toInteger(classId, 'classId');
  await ensureClassExists(classIdNum);

  await refreshSubjectPerformanceCache(classIdNum);

  const summaryResult = await pool.query(
    `SELECT
      COUNT(*)::int AS total_records,
      COUNT(DISTINCT m.student_id)::int AS students_count,
      ROUND(AVG((m.marks_obtained / NULLIF(m.total_marks, 0)) * 100), 2) AS avg_percentage,
      ROUND(AVG(CASE WHEN (m.marks_obtained / NULLIF(m.total_marks, 0)) * 100 >= $2 THEN 100 ELSE 0 END), 2) AS pass_percentage,
      ROUND(MIN((m.marks_obtained / NULLIF(m.total_marks, 0)) * 100), 2) AS min_percentage,
      ROUND(MAX((m.marks_obtained / NULLIF(m.total_marks, 0)) * 100), 2) AS max_percentage
     FROM marks m
     WHERE m.class_id = $1`,
    [classIdNum, passThreshold]
  );

  const distributionResult = await pool.query(
    `SELECT
      CASE
        WHEN score_percent < 35 THEN '0-34'
        WHEN score_percent < 50 THEN '35-49'
        WHEN score_percent < 65 THEN '50-64'
        WHEN score_percent < 80 THEN '65-79'
        ELSE '80-100'
      END AS bucket,
      COUNT(*)::int AS count
     FROM (
       SELECT (m.marks_obtained / NULLIF(m.total_marks, 0)) * 100 AS score_percent
       FROM marks m
       WHERE m.class_id = $1
     ) scores
     GROUP BY bucket
     ORDER BY bucket`,
    [classIdNum]
  );

  const subjectResult = await pool.query(
    `SELECT
      c.subject_id,
      s.name AS subject_name,
      c.avg_marks,
      c.median_marks,
      c.pass_percentage,
      c.updated_at
     FROM subject_performance_cache c
     JOIN subjects s ON s.id = c.subject_id
     WHERE c.class_id = $1
     ORDER BY c.avg_marks DESC NULLS LAST`,
    [classIdNum]
  );

  const topBottomResult = await pool.query(
    `SELECT
      m.student_id,
      st.name AS student_name,
      ROUND(AVG((m.marks_obtained / NULLIF(m.total_marks, 0)) * 100), 2) AS avg_percentage
     FROM marks m
     JOIN students st ON st.id = m.student_id
     WHERE m.class_id = $1
     GROUP BY m.student_id, st.name
     ORDER BY avg_percentage DESC`,
    [classIdNum]
  );

  const ranking = topBottomResult.rows;

  return {
    classId: classIdNum,
    summary: summaryResult.rows[0],
    distribution: distributionResult.rows,
    subjects: subjectResult.rows,
    topPerformers: ranking.slice(0, 5),
    lowPerformers: ranking.slice(-5).reverse(),
  };
}

async function getSubjectGaps({ subjectId, classId, threshold = 40 }) {
  const subjectIdNum = toInteger(subjectId, 'subjectId');
  await ensureSubjectExists(subjectIdNum);

  const thresholdNum = toNumberOrDefault(threshold, 40);
  if (thresholdNum <= 0 || thresholdNum > 100) {
    const err = new Error('threshold must be between 1 and 100');
    err.statusCode = 400;
    throw err;
  }

  let classFilterClause = '';
  const params = [subjectIdNum, thresholdNum];

  if (classId !== undefined) {
    const classIdNum = toInteger(classId, 'classId');
    await ensureClassExists(classIdNum);
    classFilterClause = 'AND m.class_id = $3';
    params.push(classIdNum);
  }

  const result = await pool.query(
    `SELECT
      m.student_id,
      st.name AS student_name,
      st.class_id,
      c.name AS class_name,
      ROUND(AVG((m.marks_obtained / NULLIF(m.total_marks, 0)) * 100), 2) AS avg_percentage,
      COUNT(*)::int AS assessment_count,
      CASE
        WHEN ROUND(AVG((m.marks_obtained / NULLIF(m.total_marks, 0)) * 100), 2) < 25 THEN 'Immediate intervention needed'
        WHEN ROUND(AVG((m.marks_obtained / NULLIF(m.total_marks, 0)) * 100), 2) < 35 THEN 'High priority remediation'
        ELSE 'Focused practice required'
      END AS recommendation
     FROM marks m
     JOIN students st ON st.id = m.student_id
     JOIN classes c ON c.id = st.class_id
     WHERE m.subject_id = $1
       ${classFilterClause}
     GROUP BY m.student_id, st.name, st.class_id, c.name
     HAVING AVG((m.marks_obtained / NULLIF(m.total_marks, 0)) * 100) < $2
     ORDER BY avg_percentage ASC`,
    params
  );

  return {
    subjectId: subjectIdNum,
    classId: classId !== undefined ? Number(classId) : null,
    threshold: thresholdNum,
    totalGapStudents: result.rows.length,
    students: result.rows,
  };
}

async function getPerformanceTrends({ classId, subjectId, from, to }) {
  const classIdNum = classId !== undefined ? toInteger(classId, 'classId') : null;
  const subjectIdNum = subjectId !== undefined ? toInteger(subjectId, 'subjectId') : null;

  if (classIdNum !== null) {
    await ensureClassExists(classIdNum);
  }
  if (subjectIdNum !== null) {
    await ensureSubjectExists(subjectIdNum);
  }

  const fromDate = from ? new Date(from) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date();

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    const err = new Error('from and to must be valid ISO date-time values');
    err.statusCode = 400;
    throw err;
  }

  const result = await pool.query(
    `SELECT
      date_trunc('day', COALESCE(m.published_at, m.created_at))::date AS day,
      m.class_id,
      c.name AS class_name,
      m.subject_id,
      s.name AS subject_name,
      COUNT(*)::int AS records,
      ROUND(AVG((m.marks_obtained / NULLIF(m.total_marks, 0)) * 100), 2) AS avg_percentage,
      ROUND(MIN((m.marks_obtained / NULLIF(m.total_marks, 0)) * 100), 2) AS min_percentage,
      ROUND(MAX((m.marks_obtained / NULLIF(m.total_marks, 0)) * 100), 2) AS max_percentage
     FROM marks m
     JOIN classes c ON c.id = m.class_id
     JOIN subjects s ON s.id = m.subject_id
     WHERE COALESCE(m.published_at, m.created_at) BETWEEN $1 AND $2
       AND ($3::int IS NULL OR m.class_id = $3)
       AND ($4::int IS NULL OR m.subject_id = $4)
     GROUP BY day, m.class_id, c.name, m.subject_id, s.name
     ORDER BY day ASC`,
    [fromDate, toDate, classIdNum, subjectIdNum]
  );

  return {
    filters: {
      classId: classIdNum,
      subjectId: subjectIdNum,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    },
    points: result.rows,
  };
}

module.exports = {
  getClassPerformance,
  getSubjectGaps,
  getPerformanceTrends,
};
