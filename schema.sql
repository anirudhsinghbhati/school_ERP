-- Enable UUID extension if needed
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. ROLES & PERMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL CHECK (name IN ('teacher', 'parent', 'admin', 'department'))
);

INSERT INTO roles (name) VALUES ('teacher'), ('parent'), ('admin'), ('department')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. ORGANIZATIONS & SCHOOLS
-- ============================================================================

CREATE TABLE IF NOT EXISTS schools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    district_id INT,
    board_id INT,
    capacity INT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    school_id INT REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 3. USERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(512),
    role_id INT NOT NULL REFERENCES roles(id),
    school_id INT REFERENCES schools(id) ON DELETE SET NULL,
    department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- 4. ACADEMIC ENTITIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS teachers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    qualifications TEXT,
    school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    roll_number VARCHAR(50),
    class_id INT,
    school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    dob DATE,
    attendance_percentage DECIMAL(5,2),
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    grade INT,
    section VARCHAR(10),
    school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id INT REFERENCES teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE students ADD CONSTRAINT fk_students_class 
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    credit_hours INT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_subject (
    id SERIAL PRIMARY KEY,
    class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id INT REFERENCES teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(class_id, subject_id)
);

CREATE TABLE IF NOT EXISTS student_subject (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, subject_id)
);

-- ============================================================================
-- 5. ACADEMIC RECORDS (Immutable)
-- ============================================================================

CREATE TABLE IF NOT EXISTS marks (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(5,2),
    total_marks DECIMAL(5,2),
    exam_type VARCHAR(50),
    published_at TIMESTAMP,
    teacher_id INT REFERENCES teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    previous_values JSONB
);

CREATE INDEX idx_marks_student ON marks(student_id);
CREATE INDEX idx_marks_class_subject ON marks(class_id, subject_id);
CREATE INDEX idx_marks_created_at ON marks(created_at DESC);

CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    title VARCHAR(255),
    description TEXT,
    due_date TIMESTAMP,
    max_marks INT,
    created_by INT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reportcards (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    term_id VARCHAR(50),
    generated_at TIMESTAMP DEFAULT NOW(),
    created_by INT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    metadata JSONB,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reportcards_student ON reportcards(student_id);
CREATE INDEX idx_reportcards_published ON reportcards(is_published, created_at DESC);

-- ============================================================================
-- 6. AUDIT & COMPLIANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50),
    entity VARCHAR(100),
    entity_id INT,
    changes JSONB,
    timestamp TIMESTAMP DEFAULT NOW(),
    ip_address INET
);

CREATE INDEX idx_audit_entity ON audit_logs(entity, entity_id, timestamp DESC);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);

-- ============================================================================
-- 7. NOTIFICATIONS & CACHING
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint VARCHAR(500),
    auth_key VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

CREATE TABLE IF NOT EXISTS subject_performance_cache (
    id SERIAL PRIMARY KEY,
    class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    avg_marks DECIMAL(5,2),
    median_marks DECIMAL(5,2),
    pass_percentage DECIMAL(5,2),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(class_id, subject_id)
);

-- ============================================================================
-- 8. AUDIT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_marks_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action, entity, entity_id, changes, timestamp)
    VALUES (
        COALESCE(current_setting('app.current_user_id', true)::INT, NULL),
        TG_OP,
        'marks',
        COALESCE(NEW.id, OLD.id),
        CASE
            WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
                'marks_obtained', jsonb_build_object('old', OLD.marks_obtained, 'new', NEW.marks_obtained),
                'published_at', jsonb_build_object('old', OLD.published_at, 'new', NEW.published_at)
            )
            WHEN TG_OP = 'INSERT' THEN jsonb_build_object(
                'student_id', NEW.student_id,
                'subject_id', NEW.subject_id,
                'marks_obtained', NEW.marks_obtained
            )
            ELSE NULL
        END,
        NOW()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER marks_audit_trigger
AFTER INSERT OR UPDATE ON marks
FOR EACH ROW
EXECUTE FUNCTION audit_marks_change();

CREATE OR REPLACE FUNCTION audit_reportcard_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action, entity, entity_id, changes, timestamp)
    VALUES (
        COALESCE(current_setting('app.current_user_id', true)::INT, NULL),
        TG_OP,
        'reportcard',
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
            'student_id', COALESCE(NEW.student_id, OLD.student_id),
            'is_published', COALESCE(NEW.is_published, OLD.is_published)
        ),
        NOW()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reportcard_audit_trigger
AFTER INSERT OR UPDATE ON reportcards
FOR EACH ROW
EXECUTE FUNCTION audit_reportcard_change();

-- ============================================================================
-- 9. SEED DATA (Test/Demo)
-- ============================================================================

INSERT INTO schools (name, district_id, board_id, capacity)
VALUES ('Central High School', 1, 1, 1000)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (name, code, credit_hours)
VALUES 
    ('Mathematics', 'MATH101', 4),
    ('English', 'ENG101', 3),
    ('Science', 'SCI101', 4),
    ('History', 'HIST101', 3),
    ('Physical Education', 'PE101', 1)
ON CONFLICT (code) DO NOTHING;

INSERT INTO classes (name, grade, section, school_id)
VALUES 
    ('Class 10 A', 10, 'A', 1),
    ('Class 10 B', 10, 'B', 1),
    ('Class 11 A', 11, 'A', 1)
ON CONFLICT DO NOTHING;
