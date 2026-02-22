-- =====================================================
-- 数据库架构升级：教研室相关表结构
-- 目标：建立正确的教研室、乐器、教师关系
-- 执行时间：约2-3小时（包含数据迁移）
-- =====================================================

-- 开始事务，确保可以回滚
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

COMMENT ON TABLE faculties IS '教研室/专业表，存储钢琴专业、声乐专业、器乐专业等';
COMMENT ON COLUMN faculties.faculty_name IS '教研室名称（钢琴专业、声乐专业、器乐专业）';
COMMENT ON COLUMN faculties.faculty_code IS '教研室代码（PIANO, VOCAL, INSTRUMENT）';

-- 1.2 为faculties表创建索引
CREATE INDEX IF NOT EXISTS idx_faculties_code ON faculties(faculty_code);
CREATE INDEX IF NOT EXISTS idx_faculties_name ON faculties(faculty_name);

-- =====================================================
-- 第二部分：创建教师-乐器资格关联表
-- =====================================================

-- 2.1 创建教师-乐器资格关联表
CREATE TABLE IF NOT EXISTS teacher_instruments (
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    instrument_name VARCHAR(100) NOT NULL,
    proficiency_level VARCHAR(20) NOT NULL CHECK (proficiency_level IN ('primary', 'secondary', 'assistant')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (teacher_id, instrument_name)
);

COMMENT ON TABLE teacher_instruments IS '教师可教授乐器资格表，记录每位教师可以教授哪些乐器';
COMMENT ON COLUMN teacher_instruments.teacher_id IS '教师ID，外键关联teachers表';
COMMENT ON COLUMN teacher_instruments.instrument_name IS '乐器名称';
COMMENT ON COLUMN teacher_instruments.proficiency_level IS '熟练程度：primary(主修)、secondary(辅修)、assistant(助教)';

-- 2.2 为teacher_instruments创建索引
CREATE INDEX IF NOT EXISTS idx_teacher_instruments_teacher ON teacher_instruments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_instruments_instrument ON teacher_instruments(instrument_name);

-- =====================================================
-- 第三部分：更新现有表结构
-- =====================================================

-- 3.1 更新instrument_config表，添加faculty_id外键
ALTER TABLE instrument_config ADD COLUMN IF NOT EXISTS faculty_id UUID;

COMMENT ON COLUMN instrument_config.faculty_id IS '所属教研室ID，外键关联faculties表';

-- 3.2 更新teachers表，添加faculty_id和primary_instrument字段
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS faculty_id UUID REFERENCES faculties(id);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS primary_instrument VARCHAR(100);

COMMENT ON COLUMN teachers.faculty_id IS '所属教研室ID，外键关联faculties表';
COMMENT ON COLUMN teachers.primary_instrument IS '主要教学乐器';

-- 3.3 更新courses表，添加faculty_id字段
ALTER TABLE courses ADD COLUMN IF NOT EXISTS faculty_id UUID REFERENCES faculties(id);

COMMENT ON COLUMN courses.faculty_id IS '课程所属教研室ID，外键关联faculties表';

-- 3.4 更新schedule_records表，添加faculty_id字段
ALTER TABLE schedule_records ADD COLUMN IF NOT EXISTS faculty_id UUID REFERENCES faculties(id);

COMMENT ON COLUMN schedule_records.faculty_id IS '排课记录所属教研室ID，外键关联faculties表';

-- =====================================================
-- 第四部分：初始化基础数据
-- =====================================================

-- 4.1 插入三个教研室
INSERT INTO faculties (faculty_name, faculty_code, description) VALUES
    ('钢琴专业', 'PIANO', '负责所有钢琴课程教学，包括钢琴基础、钢琴演奏、钢琴考级等'),
    ('声乐专业', 'VOCAL', '负责所有声乐课程教学，包括声乐技巧、合唱指挥、声乐考级等'),
    ('器乐专业', 'INSTRUMENT', '负责所有器乐课程教学，包括古筝、笛子、古琴、葫芦丝、双排键、小提琴、萨克斯、大提琴等')
ON CONFLICT (faculty_code) DO NOTHING;

-- 获取教研室ID用于后续关联
DO $$
DECLARE
    piano_id UUID;
    vocal_id UUID;
    instrument_id UUID;
BEGIN
    SELECT id INTO piano_id FROM faculties WHERE faculty_code = 'PIANO';
    SELECT id INTO vocal_id FROM faculties WHERE faculty_code = 'VOCAL';
    SELECT id INTO instrument_id FROM faculties WHERE faculty_code = 'INSTRUMENT';

    -- 4.2 更新乐器配置表的faculty_id
    -- 钢琴专业乐器（5人班）
    UPDATE instrument_config SET faculty_id = piano_id WHERE instrument_name IN ('钢琴');

    -- 声乐专业乐器（5人班）
    UPDATE instrument_config SET faculty_id = vocal_id WHERE instrument_name IN ('声乐');

    -- 器乐专业 - 特殊乐器（8人班）
    UPDATE instrument_config SET faculty_id = instrument_id WHERE instrument_name IN ('古筝', '笛子', '竹笛', '葫芦丝');

    -- 器乐专业 - 普通乐器（5人班）
    UPDATE instrument_config SET faculty_id = instrument_id WHERE instrument_name IN ('古琴', '双排键', '小提琴', '萨克斯', '大提琴');
END $$;

-- 4.3 更新现有教师的教研室和主要乐器
-- 根据教师当前教授的乐器分配教研室
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
-- 第五部分：创建视图（便于查询）
-- =====================================================

-- 5.1 创建教研室工作量统计视图
CREATE OR REPLACE VIEW faculty_workload_daily AS
SELECT
    f.faculty_name,
    f.faculty_code,
    sr.date,
    COUNT(sr.id) AS class_count,
    COUNT(DISTINCT sr.teacher_id) AS teacher_count,
    COUNT(DISTINCT sr.student_id) AS student_count
FROM faculties f
LEFT JOIN schedule_records sr ON f.id = sr.faculty_id AND sr.status = 'scheduled'
GROUP BY f.id, f.faculty_name, f.faculty_code, sr.date;

COMMENT ON VIEW faculty_workload_daily IS '教研室每日工作量统计视图';

-- 5.2 创建教师资格概览视图
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
    COUNT(ti.instrument_name) AS instrument_count
FROM teachers t
LEFT JOIN faculties f ON t.faculty_id = f.id
LEFT JOIN teacher_instruments ti ON t.id = ti.teacher_id
GROUP BY t.id, t.full_name, f.faculty_name, f.faculty_code, t.primary_instrument;

COMMENT ON VIEW teacher_qualifications IS '教师资格概览视图，显示每位教师的教研室归属和可教授乐器';

-- =====================================================
-- 第六部分：创建触发器（自动更新updated_at）
-- =====================================================

-- 为faculties表创建updated_at自动更新触发器
CREATE OR REPLACE FUNCTION update_faculties_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_faculties_updated ON faculties;
CREATE TRIGGER trigger_faculties_updated
    BEFORE UPDATE ON faculties
    FOR EACH ROW
    EXECUTE FUNCTION update_faculties_timestamp();

-- =====================================================
-- 第七部分：验证数据完整性
-- =====================================================

-- 7.1 验证所有乐器都有教研室归属
SELECT
    CASE
        WHEN COUNT(*) = 0 THEN '✓ 所有乐器都有教研室归属'
        ELSE '✗ ' || COUNT(*) || '个乐器缺少教研室归属'
    END AS validation_result
FROM instrument_config
WHERE faculty_id IS NULL;

-- 7.2 验证所有课程都有教研室归属
SELECT
    CASE
        WHEN COUNT(*) = 0 THEN '✓ 所有课程都有教研室归属'
        ELSE '✗ ' || COUNT(*) || '门课程缺少教研室归属'
    END AS validation_result
FROM courses
WHERE faculty_id IS NULL;

-- 7.3 验证教研室工作量统计
SELECT
    faculty_name,
    faculty_code,
    SUM(class_count) AS total_classes,
    AVG(class_count) AS avg_daily_classes,
    MAX(class_count) AS max_daily_classes
FROM faculty_workload_daily
GROUP BY faculty_name, faculty_code
ORDER BY total_classes DESC;

-- =====================================================
-- 回滚脚本（如需回滚执行以下命令）
-- =====================================================
/*
-- 删除触发器
DROP TRIGGER IF EXISTS trigger_faculties_updated ON faculties;
DROP FUNCTION IF EXISTS update_faculties_timestamp();

-- 删除视图
DROP VIEW IF EXISTS faculty_workload_daily;
DROP VIEW IF EXISTS teacher_qualifications;

-- 删除外键约束（按依赖顺序）
ALTER TABLE schedule_records DROP CONSTRAINT IF EXISTS fk_schedule_faculty;
ALTER TABLE courses DROP CONSTRAINT IF EXISTS fk_course_faculty;
ALTER TABLE teacher_instruments DROP CONSTRAINT IF EXISTS fk_teacher_instrument_teacher;
ALTER TABLE teachers DROP CONSTRAINT IF EXISTS fk_teacher_faculty;
ALTER TABLE instrument_config DROP CONSTRAINT IF EXISTS fk_instrument_faculty;

-- 删除表
DROP TABLE IF EXISTS teacher_instruments;
DROP TABLE IF EXISTS faculties;

-- 删除字段
ALTER TABLE instrument_config DROP COLUMN IF EXISTS faculty_id;
ALTER TABLE teachers DROP COLUMN IF EXISTS faculty_id;
ALTER TABLE teachers DROP COLUMN IF EXISTS primary_instrument;
ALTER TABLE courses DROP COLUMN IF EXISTS faculty_id;
ALTER TABLE schedule_records DROP COLUMN IF EXISTS faculty_id;
*/

-- 提交事务
COMMIT;

-- =====================================================
-- 执行说明
-- =====================================================
/*
执行步骤：
1. 在Supabase SQL编辑器中执行此脚本
2. 执行前建议先备份现有数据
3. 脚本包含完整的事务控制，可以安全回滚
4. 执行时间预估：
   - 表结构创建：5-10分钟
   - 数据迁移：30-60分钟（取决于数据量）
   - 索引创建：10-20分钟
   - 验证测试：20-30分钟

检查点：
- 所有外键约束正确建立
- 索引优化了常见查询
- 特殊乐器（古筝/笛子/葫芦丝）最大人数为8人
- 数据迁移脚本可安全回滚
*/
