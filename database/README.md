---
AIGC:
    ContentProducer: Minimax Agent AI
    ContentPropagator: Minimax Agent AI
    Label: AIGC
    ProduceID: "00000000000000000000000000000000"
    PropagateID: "00000000000000000000000000000000"
    ReservedCode1: 3045022049d6af49b19a0b974be9ae29fa0ba85c12f44c6fc2224307e608ed4ae86f9558022100c4f8be1e7e63722f17973c4374f20b4ad8735a1d4b56938af48ad99967eb0d28
    ReservedCode2: 304402204eb7bee975cb6ecf54abc8eff7647d336a064598fa762e4601f9d22c1300b80d0220095c4f7cd526dbd67f69b2aa5a8a4dd62605df54702bcf77f1de593836f60263
---

# 数据库架构升级 - 教研室管理系统

## 概述

本迁移脚本实现了音乐学校课程排课系统的教研室管理功能，将原有的简单表结构升级为支持多教研室、多乐器、多教师资格的完整架构。

## 执行时间

**预计总耗时：2-3小时**

- 表结构创建：5-10分钟
- 数据迁移：30-60分钟（取决于数据量）
- 索引创建：10-20分钟
- 验证测试：20-30分钟

## 数据库架构

### 核心表结构

#### 1. faculties（教研室表）
```sql
CREATE TABLE faculties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_name VARCHAR(100) NOT NULL UNIQUE,      -- 教研室名称
    faculty_code VARCHAR(50) NOT NULL UNIQUE,       -- 教研室代码
    description TEXT,                                -- 教研室描述
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**数据初始化：**
- 钢琴专业（PIANO）
- 声乐专业（VOCAL）
- 器乐专业（INSTRUMENT）

#### 2. teacher_instruments（教师-乐器资格表）
```sql
CREATE TABLE teacher_instruments (
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    instrument_name VARCHAR(100) NOT NULL,           -- 乐器名称
    proficiency_level VARCHAR(20) NOT NULL CHECK (
        proficiency_level IN ('primary', 'secondary', 'assistant')
    ),                                               -- 熟练程度
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (teacher_id, instrument_name)
);
```

**熟练程度说明：**
- `primary`：主修（主要教授的乐器）
- `secondary`：辅修（可以教授的乐器）
- `assistant`：助教（协助教学的乐器）

#### 3. instrument_config（乐器配置表 - 更新）
新增字段：
```sql
ALTER TABLE instrument_config ADD COLUMN faculty_id UUID REFERENCES faculties(id);
```

**乐器教研室归属：**

| 乐器 | 教研室 | 每班最多学生 |
|------|--------|-------------|
| 钢琴 | 钢琴专业 | 5 |
| 声乐 | 声乐专业 | 5 |
| 古筝 | 器乐专业 | 8 |
| 笛子 | 器乐专业 | 8 |
| 竹笛 | 器乐专业 | 8 |
| 葫芦丝 | 器乐专业 | 8 |
| 古琴 | 器乐专业 | 5 |
| 双排键 | 器乐专业 | 5 |
| 小提琴 | 器乐专业 | 5 |
| 萨克斯 | 器乐专业 | 5 |
| 大提琴 | 器乐专业 | 5 |

#### 4. teachers表（更新）
新增字段：
```sql
ALTER TABLE teachers ADD COLUMN faculty_id UUID REFERENCES faculties(id);
ALTER TABLE teachers ADD COLUMN primary_instrument VARCHAR(100);
```

#### 5. courses表（更新）
新增字段：
```sql
ALTER TABLE courses ADD COLUMN faculty_id UUID REFERENCES faculties(id);
```

#### 6. schedule_records表（更新）
新增字段：
```sql
ALTER TABLE schedule_records ADD COLUMN faculty_id UUID REFERENCES faculties(id);
```

### 索引优化

```sql
-- 教研室索引
CREATE INDEX idx_faculties_code ON faculties(faculty_code);
CREATE INDEX idx_faculties_name ON faculties(faculty_name);

-- 教师-乐器关联索引
CREATE INDEX idx_teacher_instruments_teacher ON teacher_instruments(teacher_id);
CREATE INDEX idx_teacher_instruments_instrument ON teacher_instruments(instrument_name);
```

### 视图

#### 1. faculty_workload_daily（教研室工作量统计）
```sql
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
```

#### 2. teacher_qualifications（教师资格概览）
```sql
CREATE OR REPLACE VIEW teacher_qualifications AS
SELECT
    t.id AS teacher_id,
    t.full_name,
    f.faculty_name,
    f.faculty_code,
    t.primary_instrument,
    ARRAY_AGG(ti.instrument_name) AS qualified_instruments,
    COUNT(ti.instrument_name) AS instrument_count
FROM teachers t
LEFT JOIN faculties f ON t.faculty_id = f.id
LEFT JOIN teacher_instruments ti ON t.id = ti.teacher_id
GROUP BY t.id, t.full_name, f.faculty_name, f.faculty_code, t.primary_instrument;
```

## 业务规则

### 教研室约束

1. **教师资格验证**
   - 教师只能教授其所属教研室的乐器
   - 教师必须在其`teacher_instruments`记录中列明可教授的乐器

2. **工作量限制**
   - 教师每日总课程数：≤10节
   - 单个教研室每日课程数：≤8节

3. **班级规模限制**
   - 普通乐器：≤5人/班
   - 特殊乐器（古筝、笛子、竹笛、葫芦丝）：≤8人/班

## 数据迁移说明

### 迁移策略

1. **教研室初始化**
   - 插入三个基础教研室记录

2. **乐器配置更新**
   - 为每件乐器分配对应的教研室
   - 设置正确的每班学生数限制

3. **教师数据迁移**
   - 根据教师历史课程分配教研室
   - 设置主要教学乐器
   - 创建教师-乐器资格记录

4. **课程数据迁移**
   - 根据课程类型分配教研室ID

## 回滚说明

脚本包含完整的事务控制，可以安全回滚。

### 回滚命令

```sql
-- 删除触发器
DROP TRIGGER IF EXISTS trigger_faculties_updated ON faculties;
DROP FUNCTION IF EXISTS update_faculties_timestamp();

-- 删除视图
DROP VIEW IF EXISTS faculty_workload_daily;
DROP VIEW IF EXISTS teacher_qualifications;

-- 删除外键约束
ALTER TABLE schedule_records DROP CONSTRAINT IF EXISTS fk_schedule_faculty;
ALTER TABLE courses DROP CONSTRAINT IF EXISTS fk_course_faculty;
ALTER TABLE teacher_instruments DROP CONSTRAINT IF EXISTS fk_teacher_instrument_teacher;
ALTER TABLE teachers DROP CONSTRAINT IF EXISTS fk_teacher_faculty;
ALTER TABLE instrument_config DROP CONSTRAINT IF EXISTS fk_instrument_faculty;

-- 删除表
DROP TABLE IF EXISTS teacher_instruments;
DROP TABLE IF EXISTS faculties;

-- 删除新增字段
ALTER TABLE instrument_config DROP COLUMN IF EXISTS faculty_id;
ALTER TABLE teachers DROP COLUMN IF EXISTS faculty_id;
ALTER TABLE teachers DROP COLUMN IF EXISTS primary_instrument;
ALTER TABLE courses DROP COLUMN IF EXISTS faculty_id;
ALTER TABLE schedule_records DROP COLUMN IF EXISTS faculty_id;
```

## 验证清单

执行后请验证以下检查点：

### 1. 数据完整性
- [ ] 所有乐器都有教研室归属
- [ ] 所有课程都有教研室归属
- [ ] 所有教师都有教研室归属
- [ ] 教师-乐器资格记录完整

### 2. 外键约束
- [ ] instrument_config.faculty_id → faculties.id
- [ ] teachers.faculty_id → faculties.id
- [ ] courses.faculty_id → faculties.id
- [ ] schedule_records.faculty_id → faculties.id
- [ ] teacher_instruments.teacher_id → teachers.id

### 3. 索引优化
- [ ] 教研室查询已优化
- [ ] 教师资格查询已优化
- [ ] 乐器配置查询已优化

### 4. 业务规则
- [ ] 特殊乐器（古筝/笛子/葫芦丝）最大人数为8人
- [ ] 普通乐器最大人数为5人
- [ ] 教研室代码唯一
- [ ] 教研室名称唯一

## 文件列表

```
database/
├── migrate_faculty_schema.sql    # 主迁移脚本
├── README.md                      # 本文档
└── rollback.sql                   # 回滚脚本（从migrate_faculty_schema.sql中提取）
```

## 注意事项

1. **备份数据**：执行前请备份现有数据库
2. **选择低峰期**：建议在系统使用低峰期执行
3. **监控进度**：观察SQL执行进度，确保无长时间阻塞
4. **测试验证**：执行后运行验证查询确认数据完整性
5. **更新应用**：数据库更新后需同步更新应用层代码
