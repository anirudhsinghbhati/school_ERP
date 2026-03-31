import { useState } from 'react';

const INITIAL_FORM = {
  classId: '',
  studentId: '',
  subjectId: '',
  marksObtained: '',
  totalMarks: '',
  examType: 'unit_test',
};

export default function MarkUploadForm({ onSubmit, isSubmitting, disabled = false }) {
  const [form, setForm] = useState(INITIAL_FORM);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (disabled) {
      return;
    }

    await onSubmit({
      classId: Number(form.classId),
      studentId: Number(form.studentId),
      subjectId: Number(form.subjectId),
      marksObtained: Number(form.marksObtained),
      totalMarks: Number(form.totalMarks),
      examType: form.examType,
    });

    setForm((prev) => ({
      ...prev,
      studentId: '',
      subjectId: '',
      marksObtained: '',
      totalMarks: '',
    }));
  };

  return (
    <form className="teacher-form" onSubmit={handleSubmit}>
      <label>
        Class ID
        <input
          type="number"
          min="1"
          required
          value={form.classId}
          onChange={(event) => setForm((prev) => ({ ...prev, classId: event.target.value }))}
          disabled={disabled}
        />
      </label>

      <label>
        Student ID
        <input
          type="number"
          min="1"
          required
          value={form.studentId}
          onChange={(event) => setForm((prev) => ({ ...prev, studentId: event.target.value }))}
          disabled={disabled}
        />
      </label>

      <label>
        Subject ID
        <input
          type="number"
          min="1"
          required
          value={form.subjectId}
          onChange={(event) => setForm((prev) => ({ ...prev, subjectId: event.target.value }))}
          disabled={disabled}
        />
      </label>

      <label>
        Marks Obtained
        <input
          type="number"
          min="0"
          required
          value={form.marksObtained}
          onChange={(event) => setForm((prev) => ({ ...prev, marksObtained: event.target.value }))}
          disabled={disabled}
        />
      </label>

      <label>
        Total Marks
        <input
          type="number"
          min="1"
          required
          value={form.totalMarks}
          onChange={(event) => setForm((prev) => ({ ...prev, totalMarks: event.target.value }))}
          disabled={disabled}
        />
      </label>

      <label>
        Exam Type
        <select
          value={form.examType}
          onChange={(event) => setForm((prev) => ({ ...prev, examType: event.target.value }))}
          disabled={disabled}
        >
          <option value="unit_test">Unit Test</option>
          <option value="midterm">Midterm</option>
          <option value="final">Final</option>
          <option value="assignment">Assignment</option>
          <option value="quiz">Quiz</option>
        </select>
      </label>

      <button type="submit" disabled={disabled || isSubmitting}>
        {disabled ? 'Publish Mark' : isSubmitting ? 'Publishing...' : 'Publish Mark'}
      </button>
    </form>
  );
}
