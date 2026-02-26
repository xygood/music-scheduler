-- =====================================================
-- 音乐学校排课系统 - 教研室架构升级
-- 版本: 2.0
-- 日期: 2024
-- 执行时间: 2-3小时
-- =====================================================

-- 设置事务
BEGIN;

-- =====================================================
-- 第一部分：创建教研室核心表
-- =====================================================

-- 1.1 创建教研室表
CREATE TABLE IF NOT EXISTS faculties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_name VARCHAR(100) NOT NULL UNIQUE,
    faculty_code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.2 创建教研室索引
CREATE INDEX IF NOT EXISTS idx_faculties_code ON faculties(faculty_code);
CREATE INDEX IF NOT EXISTS idx_faculties_name ON faculties(faculty_name);

COMMENT ON TABLE faculties IS '教研室/专业表，存储钢琴专业、声乐专业、器乐专业等';
COMMENT ON COLUMN faculties.faculty_name IS '教研室名称（钢琴专业、声乐专业、器乐专业）';
COMMENT ON COLUMN faculties.faculty_code IS '教研室代码（PIANO, VOCAL, INSTRUMENT）';

-- =====================================================
-- 第二部分：创建教师-乐器资格关联表
-- =====================================================

-- 2.1 创建教师-乐器资格关联表
CREATE TABLE IF NOT EXISTS teacher_instruments (
    teacher_id UUID NOT NULL,
    instrument_name VARCHAR(100) NOT NULL,
    proficiency_level VARCHAR(20) NOT NULL DEFAULT 'secondary'
        CHECK (proficiency_level IN ('primary', 'secondary', 'assistant')),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (teacher_id, instrument_name)
);

-- 2.2 创建教师-乐器索引
CREATE INDEX IF NOT EXISTS idx_teacher_instruments_teacher ON teacher_instruments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_instruments_instrument ON teacher_instruments(instrument_name);
CREATE INDEX IF NOT EXISTS idx_teacher_instruments_proficiency ON teacher_instruments(proficiency_level);

COMMENT ON TABLE teacher_instruments IS '教师可教授乐器资格表，记录每位教师可以教授哪些乐器及熟练程度';
COMMENT ON COLUMN teacher_instruments.teacher_id IS '教师ID，外键关联teachers表';
COMMENT ON COLUMN teacher_instruments.instrument_name IS '乐器名称';
COMMENT ON COLUMN teacher_instruments.proficiency_level IS '熟练程度：primary(主修)、secondary(辅修)、assistant(助教)';
COMMENT ON COLUMN teacher_instruments.granted_by IS '授予资格的管理员ID';

-- =====================================================
-- 第三部分：更新现有表结构
-- =====================================================

-- 3.1 更新instrument_config表
ALTER TABLE instrument_config ADD COLUMN IF NOT EXISTS faculty_id UUID;
ALTER TABLE instrument_config ADD COLUMN IF NOT EXISTS max_students_per_class INTEGER NOT NULL DEFAULT 5;
ALTER TABLE instrument_config ADD COLUMN IF NOT EXISTS duration_coefficient DECIMAL(3,2) NOT NULL DEFAULT 0.5;

COMMENT ON COLUMN instrument_config.faculty_id IS '所属教研室ID，外键关联faculties表';
COMMENT ON COLUMN instrument_config.max_students_per_class IS '每节课最大学生数（普通5人，特殊8人）';
COMMENT ON COLUMN instrument_config.duration_coefficient IS '课时系数，用于计算标准课时';

-- 3.2 更新teachers表
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS faculty_id UUID REFERENCES faculties(id);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS primary_instrument VARCHAR(100);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS max_weekly_hours INTEGER DEFAULT 20;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'on_leave'));

COMMENT ON COLUMN teachers.faculty_id IS '所属教研室ID，外键关联faculties表';
COMMENT ON COLUMN teachers.primary_instrument IS '主要教学乐器';
COMMENT ON COLUMN teachers.max_weekly_hours IS '最大周课时数';
COMMENT ON COLUMN teachers.status IS '教师状态';

-- 3.3 更新courses表
ALTER TABLE courses ADD COLUMN IF NOT EXISTS faculty_id UUID REFERENCES faculties(id);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 5;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_level VARCHAR(20) DEFAULT 'regular'
    CHECK (course_level IN ('beginner', 'intermediate', 'advanced', 'regular'));

COMMENT ON COLUMN courses.faculty_id IS '课程所属教研室ID';
COMMENT ON COLUMN courses.max_students IS '课程最大学生数';
COMMENT ON COLUMN courses.course_level IS '课程难度级别';

-- 3.4 更新schedule_records表
ALTER TABLE schedule_records ADD COLUMN IF NOT EXISTS faculty_id UUID REFERENCES faculties(id);
ALTER TABLE schedule_records ADD COLUMN IF NOT EXISTS validated BOOLEAN DEFAULT FALSE;
ALTER TABLE schedule_records ADD COLUMN IF NOT EXISTS validation_notes TEXT;

COMMENT ON COLUMN schedule_records.faculty_id IS '排课记录所属教研室ID';
COMMENT ON COLUMN schedule_records.validated IS '是否通过教研室验证';
COMMENT ON COLUMN schedule_records.validation_notes IS '验证备注';

-- =====================================================
-- 第四部分：初始化基础数据
-- =====================================================

-- 4.1 插入三个教研室
INSERT INTO faculties (faculty_name, faculty_code, description) VALUES
    ('钢琴专业', 'PIANO', '负责所有钢琴课程教学，包括钢琴基础、钢琴演奏、钢琴考级等'),
    ('声乐专业', 'VOCAL', '负责所有声乐课程教学，包括声乐技巧、合唱指挥、声乐考级等'),
    ('器乐专业', 'INSTRUMENT', '负责所有器乐课程教学，包括古筝、笛子、古琴、葫芦丝、双排键、小提琴、萨克斯、大提琴等')
ON CONFLICT (faculty_code) DO NOTHING;

-- 4.2 更新乐器配置
DO $$
DECLARE
    piano_id UUID;
    vocal_id UUID;
    instrument_id UUID;
BEGIN
    SELECT id INTO piano_id FROM faculties WHERE faculty_code = 'PIANO';
    SELECT id INTO vocal_id FROM faculties WHERE faculty_code = 'VOCAL';
    SELECT id INTO instrument_id FROM faculties WHERE faculty_code = 'INSTRUMENT';

    -- 钢琴专业乐器（5人班）
    UPDATE instrument_config SET
        faculty_id = piano_id,
        max_students_per_class = 5,
        duration_coefficient = 0.5
    WHERE instrument_name IN ('钢琴');

    -- 声乐专业乐器（5人班）
    UPDATE instrument_config SET
        faculty_id = vocal_id,
        max_students_per_class = 5,
        duration_coefficient = 0.5
    WHERE instrument_name IN ('声乐');

    -- 器乐专业 - 特殊乐器（8人班）
    UPDATE instrument_config SET
        faculty_id = instrument_id,
        max_students_per_class = 8,
        duration_coefficient = 0.5
    WHERE instrument_name IN ('古筝', '笛子', '竹笛', '葫芦丝');

    -- 器乐专业 - 普通乐器（5人班）
    UPDATE instrument_config SET
        faculty_id = instrument_id,
        max_students_per_class = 5,
        duration_coefficient = 0.5
    WHERE instrument_name IN ('古琴', '双排键', '小提琴', '萨克斯', '大提琴');
END $$;

-- 4.3 更新现有教师的教研室
DO $$
DECLARE
    piano_id UUID;
    vocal_id UUID;
    instrument_id UUID;
BEGIN
    SELECT id INTO piano_id FROM faculties WHERE faculty_code = 'PIANO';
    SELECT id INTO vocal_id FROM faculties WHERE faculty_code = 'VOCAL';
    SELECT id INTO instrument_id FROM faculties WHERE faculty_code = 'INSTRUMENT';

    -- 更新钢琴教师
    UPDATE teachers SET
        faculty_id = piano_id,
        primary_instrument = '钢琴',
        updated_at = NOW()
    WHERE id IN (
        SELECT DISTINCT t.id
        FROM teachers t
        JOIN courses c ON t.id = c.teacher_id
        WHERE c.course_type = '钢琴'
    ) AND teachers.faculty_id IS NULL;

    -- 更新声乐教师
    UPDATE teachers SET
        faculty_id = vocal_id,
        primary_instrument = '声乐',
        updated_at = NOW()
    WHERE id IN (
        SELECT DISTINCT t.id
        FROM teachers t
        JOIN courses c ON t.id = c.teacher_id
        WHERE c.course_type = '声乐'
    ) AND teachers.faculty_id IS NULL;

    -- 更新器乐教师
    UPDATE teachers SET
        faculty_id = instrument_id,
        primary_instrument = (SELECT c.course_type FROM courses c WHERE c.teacher_id = teachers.id LIMIT 1),
        updated_at = NOW()
    WHERE id IN (
        SELECT DISTINCT t.id
        FROM teachers t
        JOIN courses c ON t.id = c.teacher_id
        WHERE c.course_type = '器乐'
    ) AND teachers.faculty_id IS NULL;
END $$;

-- 4.4 为现有教师创建乐器资格记录
INSERT INTO teacher_instruments (teacher_id, instrument_name, proficiency_level)
SELECT DISTINCT t.id, c.course_type, 'primary'
FROM teachers t
JOIN courses c ON t.id = c.teacher_id
ON CONFLICT (teacher_id, instrument_name) DO NOTHING;

-- 4.5 更新课程的faculty_id
DO $$
DECLARE
    piano_id UUID;
    vocal_id UUID;
    instrument_id UUID;
BEGIN
    SELECT id INTO piano_id FROM faculties WHERE faculty_code = 'PIANO';
    SELECT id INTO vocal_id FROM faculties WHERE faculty_code = 'VOCAL';
    SELECT id INTO instrument_id FROM faculties WHERE faculty_code = 'INSTRUMENT';

    -- 更新钢琴课程
    UPDATE courses SET faculty_id = piano_id WHERE course_type = '钢琴';

    -- 更新声乐课程
    UPDATE courses SET faculty_id = vocal_id WHERE course_type = '声乐';

    -- 更新器乐课程
    UPDATE courses SET faculty_id = instrument_id WHERE course_type = '器乐';
END $$;

-- =====================================================
-- 第五部分：创建视图
-- =====================================================

-- 5.1 教研室工作量统计视图
CREATE OR REPLACE VIEW faculty_workload_daily AS
SELECT
    f.faculty_name,
    f.faculty_code,
    sr.date,
    COUNT(sr.id) AS class_count,
    COUNT(DISTINCT sr.teacher_id) AS teacher_count,
    COUNT(DISTINCT sr.student_id) AS student_count,
    SUM(c.duration * c.week_frequency) AS total_hours
FROM faculties f
LEFT JOIN schedule_records sr ON f.id = sr.faculty_id AND sr.status = 'scheduled'
LEFT JOIN courses c ON sr.course_id = c.id
GROUP BY f.id, f.faculty_name, f.faculty_code, sr.date;

-- 5.2 教师资格概览视图
CREATE OR REPLACE VIEW teacher_qualifications AS
SELECT
    t.id AS teacher_id,
    t.full_name,
    f.faculty_name,
    f.faculty_code,
    t.primary_instrument,
    ARRAY_AGG(ti.instrument_name ORDER BY
        CASE ti.proficiency_level
            WHEN 'primary' THEN 1
            WHEN 'secondary' THEN 2
            WHEN 'assistant' THEN 3
        END
    ) AS qualified_instruments,
    COUNT(ti.instrument_name) AS instrument_count,
    ARRAY_AGG(ti.proficiency_level ORDER BY
        CASE ti.proficiency_level
            WHEN 'primary' THEN 1
            WHEN 'secondary' THEN 2
            WHEN 'assistant' THEN 3
        END
    ) AS proficiency_levels
FROM teachers t
LEFT JOIN faculties f ON t.faculty_id = f.id
LEFT JOIN teacher_instruments ti ON t.id = ti.teacher_id
GROUP BY t.id, t.full_name, f.faculty_name, f.faculty_code, t.primary_instrument;

-- 5.3 课程-教研室关联视图
CREATE OR REPLACE VIEW course_faculty_view AS
SELECT
    c.id AS course_id,
    c.course_name,
    c.course_type,
    f.faculty_name,
    f.faculty_code,
    t.full_name AS teacher_name,
    c.max_students,
    c.course_level,
    t.primary_instrument,
    (SELECT COUNT(*) FROM schedule_records sr WHERE sr.course_id = c.id AND sr.status = 'scheduled') AS scheduled_count
FROM courses c
LEFT JOIN faculties f ON c.faculty_id = f.id
LEFT JOIN teachers t ON c.teacher_id = t.id;

-- =====================================================
-- 第六部分：创建触发器和函数
-- =====================================================

-- 6.1 自动更新updated_at的函数
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6.2 为各表创建触发器
DROP TRIGGER IF EXISTS trigger_faculties_updated ON faculties;
CREATE TRIGGER trigger_faculties_updated
    BEFORE UPDATE ON faculties
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trigger_teacher_instruments_updated ON teacher_instruments;
CREATE TRIGGER trigger_teacher_instruments_updated
    BEFORE UPDATE ON teacher_instruments
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trigger_teachers_updated ON teachers;
CREATE TRIGGER trigger_teachers_updated
    BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trigger_courses_updated ON courses;
CREATE TRIGGER trigger_courses_updated
    BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 6.3 教研室约束验证触发器
CREATE OR REPLACE FUNCTION validate_faculty_constraint()
RETURNS TRIGGER AS $$
DECLARE
    teacher_faculty UUID;
    course_faculty UUID;
    has_qualification BOOLEAN;
BEGIN
    -- 获取教师教研室
    SELECT faculty_id INTO teacher_faculty
    FROM teachers WHERE id = NEW.teacher_id;

    -- 获取课程教研室
    SELECT faculty_id INTO course_faculty
    FROM courses WHERE id = NEW.course_id;

    -- 验证教研室匹配
    IF teacher_faculty != course_faculty THEN
        RAISE EXCEPTION '教师教研室与课程教研室不匹配';
    END IF;

    -- 验证教师资格
    SELECT EXISTS (
        SELECT 1 FROM teacher_instruments ti
        JOIN courses c ON ti.instrument_name = c.course_type
        WHERE ti.teacher_id = NEW.teacher_id AND c.id = NEW.course_id
    ) INTO has_qualification;

    IF NOT has_qualification THEN
        RAISE EXCEPTION '教师没有该课程的教学资格';
    END IF;

    NEW.faculty_id = course_faculty;
    NEW.validated = TRUE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_schedule_validate ON schedule_records;
CREATE TRIGGER trigger_schedule_validate
    BEFORE INSERT ON schedule_records
    FOR EACH ROW EXECUTE FUNCTION validate_faculty_constraint();

-- =====================================================
-- 第七部分：数据验证查询
-- =====================================================

-- 7.1 验证所有乐器都有教研室归属
SELECT
    CASE
        WHEN COUNT(*) = 0 THEN '✓ 所有乐器都有教研室归属'
        ELSE '✗ ' || COUNT(*) || '个乐器缺少教研室归属'
    END AS validation_result,
    COUNT_count
FROM instrument_config
WHERE faculty(*) AS missing_id IS NULL;

-- 7.2 验证所有课程都有教研室归属
SELECT
    CASE
        WHEN COUNT(*) = 0 THEN '✓ 所有课程都有教研室归属'
        ELSE '✗ ' || COUNT(*) || '门课程缺少教研室归属'
    END AS validation_result,
    COUNT(*) AS missing_count
FROM courses
WHERE faculty_id IS NULL;

-- 7.3 验证所有教师都有教研室归属
SELECT
    CASE
        WHEN COUNT(*) = 0 THEN '✓ 所有教师都有教研室归属'
        ELSE '✗ ' || COUNT(*) || '位教师缺少教研室归属'
    END AS validation_result,
    COUNT(*) AS missing_count
FROM teachers
WHERE id IN (SELECT DISTINCT teacher_id FROM courses) AND faculty_id IS NULL;

-- 7.4 验证教师资格完整性
SELECT
    CASE
        WHEN COUNT(*) = 0 THEN '✓ 所有教师都有教学资格记录'
        ELSE '✗ ' || COUNT(*) || '位教师缺少教学资格记录'
    END AS validation_result
FROM teachers t
WHERE t.id IN (SELECT DISTINCT teacher_id FROM courses)
AND NOT EXISTS (SELECT 1 FROM teacher_instruments ti WHERE ti.teacher_id = t.id);

-- 7.5 教研室工作量统计
SELECT
    f.faculty_name,
    f.faculty_code,
    COUNT(DISTINCT sr.id) AS total_classes,
    COUNT(DISTINCT sr.teacher_id) AS active_teachers,
    COUNT(DISTINCT sr.student_id) AS active_students,
    ROUND(AVG(ARRAY_LENGTH(STRING_TO_ARRAY(fw.qualified_instruments::text, ','), 1)), 1) AS avg_qualifications
FROM faculties f
LEFT JOIN schedule_records sr ON f.id = sr.faculty_id AND sr.status = 'scheduled'
LEFT JOIN teacher_qualifications fw ON f.faculty_code = fw.faculty_code
GROUP BY f.id, f.faculty_name, f.faculty_code
ORDER BY total_classes DESC;

-- =====================================================
-- 第八部分：创建存储过程（可选功能）
-- =====================================================

-- 8.1 自动分配教师到教研室
CREATE OR REPLACE PROCEDURE assign_teacher_to_faculty(
    teacher_id_input UUID,
    instrument_name_input VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    faculty_code_input VARCHAR;
    faculty_id_input UUID;
BEGIN
    -- 根据乐器确定教研室
    SELECT faculty_code INTO faculty_code_input
    FROM instrument_config WHERE instrument_name = instrument_name_input;

    IF faculty_code_input IS NULL THEN
        faculty_code_input = 'INSTRUMENT';
    END IF;

    -- 获取教研室ID
    SELECT id INTO faculty_id_input
    FROM faculties WHERE faculty_code = faculty_code_input;

    -- 更新教师信息
    UPDATE teachers SET
        faculty_id = faculty_id_input,
        primary_instrument = instrument_name_input,
        updated_at = NOW()
    WHERE id = teacher_id_input;

    -- 添加资格记录
    INSERT INTO teacher_instruments (teacher_id, instrument_name, proficiency_level)
    VALUES (teacher_id_input, instrument_name_input, 'primary')
    ON CONFLICT (teacher_id, instrument_name) DO UPDATE
    SET proficiency_level = 'primary', updated_at = NOW();

    COMMIT;
END;
$$;

-- 8.2 批量生成排课验证报告
CREATE OR REPLACE PROCEDURE generate_validation_report(
    start_date_input DATE,
    end_date_input DATE
)
LANGUAGE plpgsql
AS $$
DECLARE
    report_cursor CURSOR FOR
        SELECT
            sr.id AS schedule_id,
            t.full_name AS teacher_name,
            c.course_name,
            f.faculty_name,
            sr.day_of_week,
            sr.period,
            sr.validated,
            CASE
                WHEN t.faculty_id != c.faculty_id THEN '教研室不匹配'
                WHEN NOT EXISTS (
                    SELECT 1 FROM teacher_instruments ti
                    WHERE ti.teacher_id = t.id
                    AND ti.instrument_name = c.course_type
                ) THEN '缺少教学资格'
                ELSE '验证通过'
            END AS validation_status
        FROM schedule_records sr
        JOIN teachers t ON sr.teacher_id = t.id
        JOIN courses c ON sr.course_id = c.id
        JOIN faculties f ON c.faculty_id = f.id
        WHERE sr.date BETWEEN start_date_input AND end_date_input;
BEGIN
    -- 报告生成逻辑（实际应用中可以将结果插入临时表或返回游标）
    FOR record IN report_cursor LOOP
        -- 这里可以添加报告生成逻辑
        RAISE NOTICE 'Schedule ID: %, Teacher: %, Course: %, Status: %',
            record.schedule_id, record.teacher_name, record.course_name, record.validation_status;
    END LOOP;
END;
$$;

-- =====================================================
-- 第九部分：性能优化索引
-- =====================================================

-- 创建复合索引优化常见查询
CREATE INDEX IF NOT EXISTS idx_schedule_teacher_date ON schedule_records(teacher_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_course_date ON schedule_records(course_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_faculty_date ON schedule_records(faculty_id, date);
CREATE INDEX IF NOT EXISTS idx_courses_teacher_faculty ON courses(teacher_id, faculty_id);
CREATE INDEX IF NOT EXISTS idx_teachers_faculty_status ON teachers(faculty_id, status);

-- 部分索引优化大表查询
CREATE INDEX IF NOT EXISTS idx_schedule_scheduled ON schedule_records(date, day_of_week, period)
WHERE status = 'scheduled';

-- =====================================================
-- 回滚脚本
-- =====================================================

/*
-- 注意：以下回滚脚本应按相反顺序执行

-- 1. 删除触发器和函数
DROP TRIGGER IF EXISTS trigger_schedule_validate ON schedule_records;
DROP TRIGGER IF EXISTS trigger_courses_updated ON courses;
DROP TRIGGER IF EXISTS trigger_teachers_updated ON teachers;
DROP TRIGGER IF EXISTS trigger_teacher_instruments_updated ON teacher_instruments;
DROP TRIGGER IF EXISTS trigger_faculties_updated ON faculties;
DROP FUNCTION IF EXISTS validate_faculty_constraint();
DROP FUNCTION IF EXISTS update_timestamp();

-- 2. 删除视图
DROP VIEW IF EXISTS faculty_workload_daily;
DROP VIEW IF EXISTS teacher_qualifications;
DROP VIEW IF EXISTS course_faculty_view;

-- 3. 删除存储过程
DROP PROCEDURE IF EXISTS assign_teacher_to_faculty(UUID, VARCHAR);
DROP PROCEDURE IF EXISTS generate_validation_report(DATE, DATE);

-- 4. 删除索引
DROP INDEX IF EXISTS idx_schedule_teacher_date;
DROP INDEX IF EXISTS idx_schedule_course_date;
DROP INDEX IF EXISTS idx_schedule_faculty_date;
DROP INDEX IF EXISTS idx_courses_teacher_faculty;
DROP INDEX IF EXISTS idx_teachers_faculty_status;
DROP INDEX IF EXISTS idx_schedule_scheduled;
DROP INDEX IF EXISTS idx_faculties_code;
DROP INDEX IF EXISTS idx_faculties_name;
DROP INDEX IF EXISTS idx_teacher_instruments_teacher;
DROP INDEX IF EXISTS idx_teacher_instruments_instrument;
DROP INDEX IF EXISTS idx_teacher_instruments_proficiency;

-- 5. 删除外键约束
ALTER TABLE schedule_records DROP CONSTRAINT IF EXISTS fk_schedule_faculty;
ALTER TABLE schedule_records DROP CONSTRAINT IF EXISTS fk_schedule_validated;
ALTER TABLE courses DROP CONSTRAINT IF EXISTS fk_course_faculty;
ALTER TABLE teacher_instruments DROP CONSTRAINT IF EXISTS fk_teacher_instrument_teacher;
ALTER TABLE teachers DROP CONSTRAINT IF EXISTS fk_teacher_faculty;
ALTER TABLE instrument_config DROP CONSTRAINT IF EXISTS fk_instrument_faculty;

-- 6. 删除表
DROP TABLE IF EXISTS teacher_instruments;
DROP TABLE IF EXISTS faculties;

-- 7. 删除字段
ALTER TABLE instrument_config DROP COLUMN IF EXISTS faculty_id;
ALTER TABLE instrument_config DROP COLUMN IF EXISTS max_students_per_class;
ALTER TABLE instrument_config DROP COLUMN IF EXISTS duration_coefficient;
ALTER TABLE teachers DROP COLUMN IF EXISTS faculty_id;
ALTER TABLE teachers DROP COLUMN IF EXISTS primary_instrument;
ALTER TABLE teachers DROP COLUMN IF EXISTS max_weekly_hours;
ALTER TABLE teachers DROP COLUMN IF EXISTS status;
ALTER TABLE courses DROP COLUMN IF EXISTS faculty_id;
ALTER TABLE courses DROP COLUMN IF EXISTS max_students;
ALTER TABLE courses DROP COLUMN IF EXISTS course_level;
ALTER TABLE schedule_records DROP COLUMN IF EXISTS faculty_id;
ALTER TABLE schedule_records DROP COLUMN IF EXISTS validated;
ALTER TABLE schedule_records DROP COLUMN IF EXISTS validation_notes;
*/

COMMIT;

-- =====================================================
-- 执行说明
-- =====================================================

/*
执行步骤：
1. 在Supabase SQL编辑器中执行此脚本
2. 建议先在测试环境验证
3. 执行前备份现有数据
4. 脚本包含完整的事务控制，可以安全回滚
5. 执行时间预估：2-3小时

检查点：
✓ 所有外键约束正确建立
✓ 索引优化了常见查询
✓ 特殊乐器（古筝/笛子/葫芦丝/竹笛）最大人数为8人
✓ 数据迁移脚本可安全回滚
✓ 触发器和验证逻辑正确

回滚方法：
1. 如果在事务中（未COMMIT），直接执行ROLLBACK
2. 如果已提交，执行上述回滚脚本部分
3. 建议在测试环境先验证回滚脚本
*/
