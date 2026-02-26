# MySQL 数据库迁移方案

> **版本**: 1.4.0  
> **创建日期**: 2026-02-25  
> **更新日期**: 2026-02-27  
> **状态**: 待实施

---

## 一、项目概述

### 1.1 迁移目标

将音乐排课系统从 localStorage 本地存储迁移到 MySQL 数据库，确保：
- 所有数据完整迁移，无遗漏
- 所有功能逻辑不受影响
- 支持阿里云服务器部署

### 1.2 当前架构

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | React + TypeScript | localStorage 存储数据 |
| 后端 | Flask + SQLAlchemy | 已有模型定义，使用 SQLite |
| 部署 | 本地开发 | 需迁移到阿里云 |

### 1.3 目标架构

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | React + TypeScript | 通过 API 获取数据 |
| 后端 | Flask + SQLAlchemy | MySQL 数据库 |
| 数据库 | MySQL 8.0 | 阿里云 RDS 或自建 |
| 部署 | 阿里云 ECS | Nginx + Gunicorn |

---

## 二、数据结构分析

### 2.1 数据实体清单

| 序号 | 实体名称 | localStorage 键 | MySQL 表名 | 字段数 | 预估数据量 |
|------|----------|-----------------|------------|--------|------------|
| 1 | 用户 | `music_scheduler_users` | `users` | 11 | 50+ |
| 2 | 教师 | `music_scheduler_teachers` | `teachers` | 17 | 50+ |
| 3 | 学生 | `music_scheduler_students` | `students` | 20 | 500+ |
| 4 | 班级 | `music_scheduler_classes` | `classes` | 8 | 20+ |
| 5 | 课程 | `music_scheduler_courses` | `courses` | 22 | 200+ |
| 6 | 教室 | `music_scheduler_rooms` | `rooms` | 11 | 50+ |
| 7 | 排课记录 | `music_scheduler_scheduled_classes` | `scheduled_classes` | 18 | 1000+ |
| 8 | 禁排时段 | `music_scheduler_blocked_slots` | `blocked_slots` | 14 | 50+ |
| 9 | 学期周次配置 | `music_scheduler_semester_week_configs` | `semester_week_configs` | 6 | 10+ |
| 10 | 大课表 | `music_scheduler_large_class_schedules` | `large_class_schedules` | 5 | 5+ |
| 11 | 学生-教师分配 | `music_scheduler_student_teacher_assignments` | `student_teacher_assignments` | 13 | 500+ |
| 12 | 操作日志 | `music_scheduler_operation_logs` | `operation_logs` | 10 | 1000+ |
| 13 | 在线教师 | `music_scheduler_online_teachers` | `online_teachers` | 7 | 实时 |

> **说明**：`priority_blocked_times`（优先级禁排时间）是派生数据，由系统从大课表等数据自动生成，无需迁移。迁移完成后调用 `largeClassBlockedTimeService.generateBlockedTimesFromLargeClasses()` 即可生成。

### 2.2 数据关系图

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   users     │────<│  teachers   │>────│   rooms     │
└─────────────┘     └─────────────┘     └─────────────┘
                          │                    │
                          │                    │
                          ▼                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   classes   │<────│  students   │     │scheduled_   │
└─────────────┘     └─────────────┘     │  classes    │
      │                   │              └─────────────┘
      │                   │                    │
      ▼                   ▼                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   courses   │     │student_     │     │blocked_slots│
└─────────────┘     │teacher_     │     └─────────────┘
                    │assignments  │
                    └─────────────┘
```

---

## 三、MySQL 数据库表设计

### 3.1 用户表 (users)

```sql
CREATE TABLE `users` (
  `id` VARCHAR(36) NOT NULL COMMENT '主键UUID',
  `teacher_id` VARCHAR(50) NOT NULL COMMENT '工号',
  `email` VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
  `password` VARCHAR(255) NOT NULL COMMENT '密码哈希',
  `full_name` VARCHAR(100) NOT NULL COMMENT '姓名',
  `department` VARCHAR(100) DEFAULT NULL COMMENT '部门(兼容旧版)',
  `faculty_id` VARCHAR(50) DEFAULT NULL COMMENT '教研室ID',
  `faculty_code` VARCHAR(50) DEFAULT NULL COMMENT '教研室代码',
  `specialty` JSON DEFAULT NULL COMMENT '专业特长',
  `is_admin` TINYINT(1) DEFAULT 0 COMMENT '是否管理员',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_teacher_id` (`teacher_id`),
  UNIQUE KEY `uk_email` (`email`),
  KEY `idx_faculty_code` (`faculty_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';
```

**字段说明**：

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | VARCHAR(36) | 是 | UUID主键 |
| teacher_id | VARCHAR(50) | 是 | 工号，唯一标识 |
| email | VARCHAR(100) | 否 | 邮箱地址 |
| password | VARCHAR(255) | 是 | SHA-256哈希密码 |
| full_name | VARCHAR(100) | 是 | 用户姓名 |
| department | VARCHAR(100) | 否 | 部门名称(兼容旧版) |
| faculty_id | VARCHAR(50) | 否 | 教研室ID |
| faculty_code | VARCHAR(50) | 否 | 教研室代码(PIANO/VOCAL/INSTRUMENT) |
| specialty | JSON | 否 | 专业特长数组 |
| is_admin | TINYINT(1) | 否 | 是否管理员(0/1) |

### 3.2 教师表 (teachers)

```sql
CREATE TABLE `teachers` (
  `id` VARCHAR(36) NOT NULL COMMENT '主键UUID',
  `teacher_id` VARCHAR(50) NOT NULL COMMENT '工号',
  `name` VARCHAR(100) NOT NULL COMMENT '姓名',
  `full_name` VARCHAR(100) DEFAULT NULL COMMENT '姓名(兼容)',
  `email` VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '电话',
  `department` VARCHAR(100) DEFAULT NULL COMMENT '部门(兼容旧版)',
  `faculty_id` VARCHAR(50) DEFAULT NULL COMMENT '教研室ID',
  `faculty_code` VARCHAR(50) DEFAULT NULL COMMENT '教研室代码',
  `faculty_name` VARCHAR(100) DEFAULT NULL COMMENT '教研室名称',
  `position` VARCHAR(50) DEFAULT NULL COMMENT '职称',
  `hire_date` DATE DEFAULT NULL COMMENT '入职日期',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态',
  `primary_instrument` VARCHAR(100) DEFAULT NULL COMMENT '主要教学乐器',
  `can_teach_instruments` JSON DEFAULT NULL COMMENT '可教授乐器列表',
  `max_students_per_class` INT DEFAULT 5 COMMENT '每班最大学生数',
  `fixed_room_id` VARCHAR(36) DEFAULT NULL COMMENT '固定琴房ID(兼容)',
  `fixed_rooms` JSON DEFAULT NULL COMMENT '多琴房配置',
  `qualifications` JSON DEFAULT NULL COMMENT '教学资质',
  `remarks` TEXT DEFAULT NULL COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_teacher_id` (`teacher_id`),
  KEY `idx_faculty_code` (`faculty_code`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='教师表';
```

**字段说明**：

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | VARCHAR(36) | 是 | UUID主键，**但to_dict()返回teacher_id** |
| teacher_id | VARCHAR(50) | 是 | 工号，唯一标识 |
| name | VARCHAR(100) | 是 | 教师姓名 |
| faculty_code | VARCHAR(50) | 否 | 教研室代码(PIANO/VOCAL/INSTRUMENT) |
| faculty_name | VARCHAR(100) | 否 | 教研室名称 |
| position | VARCHAR(50) | 否 | 职称(教授/副教授/讲师/助教) |
| status | VARCHAR(20) | 否 | 状态(active/inactive/on_leave) |
| can_teach_instruments | JSON | 否 | 可教授乐器数组 |
| fixed_rooms | JSON | 否 | 多琴房配置数组 |
| qualifications | JSON | 否 | 教学资质数组 |

> **重要说明**：`Teacher.to_dict()` 方法返回的 `id` 字段值等于 `teacher_id`（工号），而非数据库主键UUID。
> 这是为了保持与前端期望的数据格式一致。前端使用 `teacher.id` 作为教师工号。

### 3.3 学生表 (students)

```sql
CREATE TABLE `students` (
  `id` VARCHAR(36) NOT NULL COMMENT '主键UUID',
  `student_id` VARCHAR(50) NOT NULL COMMENT '学号',
  `name` VARCHAR(100) NOT NULL COMMENT '姓名',
  `teacher_id` VARCHAR(50) DEFAULT NULL COMMENT '关联教师工号',
  `major_class` VARCHAR(100) DEFAULT NULL COMMENT '专业班级',
  `grade` INT DEFAULT NULL COMMENT '年级',
  `student_type` VARCHAR(20) DEFAULT 'general' COMMENT '学生类型',
  `primary_instrument` VARCHAR(100) DEFAULT NULL COMMENT '主项',
  `secondary_instruments` JSON DEFAULT NULL COMMENT '副项列表',
  `faculty_code` VARCHAR(50) DEFAULT NULL COMMENT '教研室代码',
  `enrollment_year` INT DEFAULT NULL COMMENT '入学年份',
  `current_grade` INT DEFAULT NULL COMMENT '当前年级',
  `student_status` VARCHAR(20) DEFAULT 'active' COMMENT '学生状态',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态',
  `remarks` TEXT DEFAULT NULL COMMENT '备注',
  `assigned_teachers` JSON DEFAULT NULL COMMENT '分配的教师信息',
  `secondary1_teacher_id` VARCHAR(50) DEFAULT NULL COMMENT '副项1教师ID',
  `secondary1_teacher_name` VARCHAR(100) DEFAULT NULL COMMENT '副项1教师姓名',
  `secondary2_teacher_id` VARCHAR(50) DEFAULT NULL COMMENT '副项2教师ID',
  `secondary2_teacher_name` VARCHAR(100) DEFAULT NULL COMMENT '副项2教师姓名',
  `secondary3_teacher_id` VARCHAR(50) DEFAULT NULL COMMENT '副项3教师ID',
  `secondary3_teacher_name` VARCHAR(100) DEFAULT NULL COMMENT '副项3教师姓名',
  `secondary_instrument1` VARCHAR(100) DEFAULT NULL COMMENT '副项1专业',
  `secondary_instrument2` VARCHAR(100) DEFAULT NULL COMMENT '副项2专业',
  `secondary_instrument3` VARCHAR(100) DEFAULT NULL COMMENT '副项3专业',
  `notes` TEXT DEFAULT NULL COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_student_id` (`student_id`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_major_class` (`major_class`),
  KEY `idx_student_type` (`student_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生表';
```

**字段说明**：

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | VARCHAR(36) | 是 | UUID主键，**但to_dict()返回student_id** |
| student_id | VARCHAR(50) | 是 | 学号，唯一标识 |
| name | VARCHAR(100) | 是 | 学生姓名 |
| major_class | VARCHAR(100) | 否 | 专业班级(如"音乐学2401") |
| student_type | VARCHAR(20) | 否 | 学生类型(general/upgrade) |
| primary_instrument | VARCHAR(100) | 否 | 主项乐器 |
| secondary_instruments | JSON | 否 | 副项乐器数组 |
| assigned_teachers | JSON | 否 | 分配的教师对象 |

> **重要说明**：`Student.to_dict()` 方法返回的 `id` 字段值等于 `student_id`（学号），而非数据库主键UUID。
> 这是为了保持与前端期望的数据格式一致。前端使用 `student.id` 作为学生学号。

### 3.4 班级表 (classes)

```sql
CREATE TABLE `classes` (
  `id` VARCHAR(36) NOT NULL COMMENT '主键UUID',
  `class_id` VARCHAR(50) DEFAULT NULL COMMENT '班级编号',
  `class_name` VARCHAR(100) NOT NULL COMMENT '班级名称',
  `enrollment_year` INT DEFAULT NULL COMMENT '入学年份',
  `class_number` INT DEFAULT NULL COMMENT '班号',
  `student_count` INT DEFAULT 0 COMMENT '学生人数',
  `student_type` VARCHAR(20) DEFAULT 'general' COMMENT '学生类型',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_class_name` (`class_name`),
  KEY `idx_enrollment_year` (`enrollment_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='班级表';
```

### 3.5 课程表 (courses)

```sql
CREATE TABLE `courses` (
  `id` VARCHAR(36) NOT NULL COMMENT '主键UUID',
  `course_id` VARCHAR(50) DEFAULT NULL COMMENT '课程编号',
  `course_name` VARCHAR(200) NOT NULL COMMENT '课程名称',
  `course_type` VARCHAR(50) NOT NULL COMMENT '课程类型',
  `faculty_id` VARCHAR(50) DEFAULT NULL COMMENT '教研室ID',
  `teacher_id` VARCHAR(50) DEFAULT NULL COMMENT '教师工号',
  `teacher_name` VARCHAR(100) DEFAULT NULL COMMENT '教师姓名',
  `student_id` VARCHAR(50) DEFAULT NULL COMMENT '学生ID',
  `student_name` VARCHAR(100) DEFAULT NULL COMMENT '学生姓名',
  `major_class` VARCHAR(100) DEFAULT NULL COMMENT '专业班级',
  `academic_year` VARCHAR(20) DEFAULT NULL COMMENT '学年',
  `semester` INT DEFAULT NULL COMMENT '学期序号',
  `semester_label` VARCHAR(20) DEFAULT NULL COMMENT '学期标签',
  `course_category` VARCHAR(20) DEFAULT 'general' COMMENT '课程类别',
  `primary_instrument` VARCHAR(100) DEFAULT NULL COMMENT '主项乐器',
  `secondary_instrument` VARCHAR(100) DEFAULT NULL COMMENT '副项乐器',
  `duration` INT DEFAULT 30 COMMENT '时长(分钟)',
  `week_frequency` INT DEFAULT 1 COMMENT '周频次',
  `credit` INT DEFAULT 1 COMMENT '学分',
  `required_hours` INT DEFAULT 16 COMMENT '所需课时',
  `group_size` INT DEFAULT 1 COMMENT '小组人数',
  `student_count` INT DEFAULT 1 COMMENT '学生数量',
  `teaching_type` VARCHAR(50) DEFAULT NULL COMMENT '授课类型',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_major_class` (`major_class`),
  KEY `idx_semester_label` (`semester_label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程表';
```

### 3.6 教室表 (rooms)

```sql
CREATE TABLE `rooms` (
  `id` VARCHAR(36) NOT NULL COMMENT '主键UUID',
  `teacher_id` VARCHAR(50) DEFAULT NULL COMMENT '关联教师',
  `room_name` VARCHAR(100) NOT NULL COMMENT '教室名称',
  `room_type` VARCHAR(20) DEFAULT '琴房' COMMENT '教室类型',
  `faculty_code` VARCHAR(50) DEFAULT NULL COMMENT '专业代码',
  `capacity` INT DEFAULT 1 COMMENT '容量',
  `location` VARCHAR(200) DEFAULT NULL COMMENT '位置',
  `equipment` JSON DEFAULT NULL COMMENT '设备配置',
  `status` VARCHAR(20) DEFAULT '空闲' COMMENT '状态',
  `last_maintenance` DATE DEFAULT NULL COMMENT '最后维护时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_room_name` (`room_name`),
  KEY `idx_faculty_code` (`faculty_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='教室表';
```

### 3.7 排课记录表 (scheduled_classes)

```sql
CREATE TABLE `scheduled_classes` (
  `id` VARCHAR(36) NOT NULL COMMENT '主键UUID',
  `teacher_id` VARCHAR(50) NOT NULL COMMENT '教师工号',
  `course_id` VARCHAR(36) DEFAULT NULL COMMENT '课程ID',
  `student_id` VARCHAR(50) DEFAULT NULL COMMENT '学生ID',
  `room_id` VARCHAR(36) DEFAULT NULL COMMENT '教室ID',
  `class_id` VARCHAR(50) DEFAULT NULL COMMENT '班级ID',
  `teacher_name` VARCHAR(100) DEFAULT NULL COMMENT '教师姓名',
  `course_code` VARCHAR(50) DEFAULT NULL COMMENT '课程编号',
  `day_of_week` INT NOT NULL COMMENT '星期几(1-7)',
  `date` DATE DEFAULT NULL COMMENT '具体日期',
  `period` INT NOT NULL COMMENT '节次(1-10)',
  `duration` INT DEFAULT 1 COMMENT '持续节数',
  `start_week` INT DEFAULT NULL COMMENT '开始周次',
  `end_week` INT DEFAULT NULL COMMENT '结束周次',
  `week_number` INT DEFAULT NULL COMMENT '周次(兼容)',
  `specific_dates` JSON DEFAULT NULL COMMENT '特定日期列表',
  `faculty_id` VARCHAR(50) DEFAULT NULL COMMENT '教研室ID',
  `semester_label` VARCHAR(20) DEFAULT NULL COMMENT '学期标签',
  `academic_year` VARCHAR(20) DEFAULT NULL COMMENT '学年',
  `semester` INT DEFAULT NULL COMMENT '学期',
  `status` VARCHAR(20) DEFAULT 'scheduled' COMMENT '状态',
  `group_id` VARCHAR(36) DEFAULT NULL COMMENT '小组ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_day_period` (`day_of_week`, `period`),
  KEY `idx_semester_label` (`semester_label`),
  KEY `idx_room_id` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='排课记录表';
```

### 3.8 禁排时段表 (blocked_slots)

```sql
CREATE TABLE `blocked_slots` (
  `id` VARCHAR(36) NOT NULL COMMENT '主键UUID',
  `academic_year` VARCHAR(20) DEFAULT NULL COMMENT '学年',
  `semester_label` VARCHAR(20) DEFAULT NULL COMMENT '学期标签',
  `type` VARCHAR(20) NOT NULL COMMENT '类型',
  `class_associations` JSON DEFAULT NULL COMMENT '关联班级',
  `week_number` INT DEFAULT NULL COMMENT '特定周次',
  `specific_week_days` JSON DEFAULT NULL COMMENT '特定周次的星期几',
  `day_of_week` INT DEFAULT NULL COMMENT '星期几(循环)',
  `start_period` INT DEFAULT NULL COMMENT '开始节次',
  `end_period` INT DEFAULT NULL COMMENT '结束节次',
  `start_date` DATE DEFAULT NULL COMMENT '开始日期',
  `end_date` DATE DEFAULT NULL COMMENT '结束日期',
  `weeks` VARCHAR(50) DEFAULT NULL COMMENT '周次范围字符串',
  `reason` VARCHAR(255) DEFAULT NULL COMMENT '原因',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_semester_label` (`semester_label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='禁排时段表';
```

### 3.9 学期周次配置表 (semester_week_configs)

```sql
CREATE TABLE `semester_week_configs` (
  `id` VARCHAR(36) NOT NULL COMMENT '主键UUID',
  `academic_year` VARCHAR(20) NOT NULL COMMENT '学年',
  `semester_label` VARCHAR(20) NOT NULL COMMENT '学期标签',
  `start_date` DATE NOT NULL COMMENT '学期开始日期',
  `total_weeks` INT DEFAULT 16 COMMENT '总周数',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_semester_label` (`semester_label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学期周次配置表';
```

### 3.10 大课表 (large_class_schedules)

```sql
CREATE TABLE `large_class_schedules` (
  `id` VARCHAR(36) NOT NULL COMMENT '主键UUID',
  `file_name` VARCHAR(255) DEFAULT NULL COMMENT '原始文件名',
  `academic_year` VARCHAR(20) DEFAULT NULL COMMENT '学年',
  `semester_label` VARCHAR(20) DEFAULT NULL COMMENT '学期标签',
  `entries` JSON DEFAULT NULL COMMENT '课程条目数组',
  `imported_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '导入时间',
  PRIMARY KEY (`id`),
  KEY `idx_semester_label` (`semester_label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='大课表';
```

### 3.11 学生-教师分配表 (student_teacher_assignments)

```sql
CREATE TABLE `student_teacher_assignments` (
  `id` VARCHAR(36) NOT NULL COMMENT '主键UUID',
  `student_id` VARCHAR(50) NOT NULL COMMENT '学生ID',
  `teacher_id` VARCHAR(50) NOT NULL COMMENT '教师ID',
  `faculty_code` VARCHAR(20) NOT NULL COMMENT '教研室代码',
  `instrument_name` VARCHAR(100) NOT NULL COMMENT '乐器名称',
  `assignment_type` VARCHAR(20) DEFAULT 'primary' COMMENT '分配类型',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否活跃',
  `assignment_status` VARCHAR(20) DEFAULT 'active' COMMENT '分配状态',
  `assigned_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '分配时间',
  `effective_date` DATE DEFAULT NULL COMMENT '生效日期',
  `ended_at` DATETIME DEFAULT NULL COMMENT '结束日期',
  `assigned_by` VARCHAR(50) DEFAULT NULL COMMENT '分配操作者',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_faculty_code` (`faculty_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生-教师分配表';
```

### 3.12 操作日志表 (operation_logs)

```sql
CREATE TABLE `operation_logs` (
  `id` VARCHAR(36) NOT NULL COMMENT '主键UUID',
  `teacher_id` VARCHAR(50) DEFAULT NULL COMMENT '操作教师工号',
  `teacher_name` VARCHAR(100) DEFAULT NULL COMMENT '操作教师姓名',
  `operation` VARCHAR(100) DEFAULT NULL COMMENT '操作类型',
  `target_type` VARCHAR(20) DEFAULT NULL COMMENT '对象类型',
  `target_id` VARCHAR(50) DEFAULT NULL COMMENT '对象ID',
  `target_name` VARCHAR(100) DEFAULT NULL COMMENT '对象名称',
  `details` TEXT DEFAULT NULL COMMENT '操作详情',
  `ip_address` VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
  `user_agent` VARCHAR(500) DEFAULT NULL COMMENT '用户代理',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  PRIMARY KEY (`id`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_target_type` (`target_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';
```

### 3.13 在线教师状态表 (online_teachers)

```sql
CREATE TABLE `online_teachers` (
  `id` VARCHAR(36) NOT NULL COMMENT '主键UUID',
  `teacher_id` VARCHAR(50) NOT NULL COMMENT '教师工号',
  `teacher_name` VARCHAR(100) DEFAULT NULL COMMENT '教师姓名',
  `faculty_id` VARCHAR(50) DEFAULT NULL COMMENT '教研室ID',
  `faculty_name` VARCHAR(100) DEFAULT NULL COMMENT '教研室名称',
  `login_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '登录时间',
  `last_activity_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '最后活动时间',
  `status` VARCHAR(20) DEFAULT 'online' COMMENT '状态',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_teacher_id` (`teacher_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='在线教师状态表';
```

---

## 四、数据迁移方案

### 4.1 迁移流程

```
┌─────────────────┐
│ 1. 导出localStorage数据 │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 2. 创建MySQL数据库    │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 3. 执行建表SQL        │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 4. 运行迁移脚本       │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 5. 验证数据完整性     │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 6. 切换到MySQL模式    │
└─────────────────┘
```

### 4.2 数据导出方法

在浏览器控制台执行以下代码：

```javascript
// 导出所有 localStorage 数据
const exportData = {};
const keys = Object.keys(localStorage).filter(k => k.startsWith('music_scheduler_'));
keys.forEach(key => {
  try {
    exportData[key] = JSON.parse(localStorage.getItem(key));
  } catch (e) {
    exportData[key] = localStorage.getItem(key);
  }
});

// 生成下载链接
const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `localStorage_export_${new Date().toISOString().slice(0,10)}.json`;
a.click();
URL.revokeObjectURL(url);

console.log(`已导出 ${keys.length} 个数据项`);
```

### 4.3 迁移脚本

迁移脚本位于 `server/migrate_to_mysql.py`，主要功能：

1. **读取JSON数据**: 从导出的JSON文件读取localStorage数据
2. **数据转换**: 将数据转换为MySQL兼容格式
3. **批量插入**: 使用 `INSERT ... ON DUPLICATE KEY UPDATE` 确保幂等性
4. **错误处理**: 记录失败记录，不中断整体迁移

执行命令：

```bash
cd server
python migrate_to_mysql.py ../localStorage_export_2026-02-25.json
```

### 4.4 数据验证

迁移完成后执行以下SQL验证：

```sql
-- 检查各表数据量
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'teachers', COUNT(*) FROM teachers
UNION ALL SELECT 'students', COUNT(*) FROM students
UNION ALL SELECT 'classes', COUNT(*) FROM classes
UNION ALL SELECT 'courses', COUNT(*) FROM courses
UNION ALL SELECT 'rooms', COUNT(*) FROM rooms
UNION ALL SELECT 'scheduled_classes', COUNT(*) FROM scheduled_classes
UNION ALL SELECT 'blocked_slots', COUNT(*) FROM blocked_slots
UNION ALL SELECT 'semester_week_configs', COUNT(*) FROM semester_week_configs
UNION ALL SELECT 'large_class_schedules', COUNT(*) FROM large_class_schedules
UNION ALL SELECT 'student_teacher_assignments', COUNT(*) FROM student_teacher_assignments
UNION ALL SELECT 'operation_logs', COUNT(*) FROM operation_logs;

-- 检查管理员账号
SELECT * FROM users WHERE teacher_id = '110';

-- 检查教师数据完整性
SELECT teacher_id, name, faculty_code, 
       JSON_LENGTH(can_teach_instruments) as instrument_count
FROM teachers LIMIT 10;
```

---

## 五、后端适配方案

### 5.1 配置文件更新

修改 `server/config.py`：

```python
class ProductionConfig(Config):
    DEBUG = False
    USE_MYSQL = True
    SQLALCHEMY_DATABASE_URI = Config.MYSQL_SQLALCHEMY_URI
```

### 5.2 环境变量配置

创建 `.env.production`：

```env
FLASK_ENV=production
SECRET_KEY=your-secret-key-here

# MySQL 配置
MYSQL_HOST=your-mysql-host.aliyuncs.com
MYSQL_PORT=3306
MYSQL_USER=scheduler
MYSQL_PASSWORD=Scheduler@2026
MYSQL_DATABASE=music_scheduler
```

### 5.3 API 路由检查

确保所有API路由正确返回数据：

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/me` | GET | 获取当前用户 |
| `/api/teachers` | GET/POST | 教师列表/创建 |
| `/api/students` | GET/POST | 学生列表/创建 |
| `/api/classes` | GET | 班级列表 |
| `/api/courses` | GET/POST | 课程列表/创建 |
| `/api/rooms` | GET/POST | 教室列表/创建 |
| `/api/schedule` | GET/POST | 排课列表/创建 |
| `/api/blocked-slots` | GET/POST | 禁排时段 |
| `/api/semester-configs` | GET/POST | 学期配置 |
| `/api/large-class-schedules` | GET/POST | 大课表 |
| `/api/student-teacher-assignments` | GET/POST | 学生教师分配 |
| `/api/operation-logs` | GET/POST | 操作日志 |

---

## 六、阿里云部署配置

### 6.1 服务器要求

| 配置项 | 最低要求 | 推荐配置 |
|--------|----------|----------|
| CPU | 1核 | 2核+ |
| 内存 | 1GB | 2GB+ |
| 磁盘 | 20GB | 40GB+ |
| 带宽 | 1Mbps | 5Mbps+ |
| 系统 | CentOS 7+ | Ubuntu 20.04 |

### 6.2 MySQL 初始化

```bash
# 登录MySQL
mysql -u root -p

# 执行初始化脚本
source /var/www/music-scheduler/server/init_mysql.sql
```

### 6.3 Nginx 配置

创建 `/etc/nginx/sites-available/music-scheduler`：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端静态文件
    location / {
        root /var/www/music-scheduler/dist;
        try_files $uri $uri/ /index.html;
        
        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API 代理
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket 代理
    location /socket.io {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6.4 Systemd 服务配置

创建 `/etc/systemd/system/music-scheduler.service`：

```ini
[Unit]
Description=Music Scheduler API Server
After=network.target mysql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/music-scheduler/server
Environment="FLASK_ENV=production"
Environment="PATH=/var/www/music-scheduler/venv/bin"
ExecStart=/var/www/music-scheduler/venv/bin/gunicorn -w 4 -b 127.0.0.1:5000 app:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable music-scheduler
sudo systemctl start music-scheduler
```

---

## 七、JSON备份兼容性说明

### 7.1 迁移前后数据流对比

```
┌─────────────────────────────────────────────────────────────────┐
│                        迁移前 (localStorage)                      │
├─────────────────────────────────────────────────────────────────┤
│  JSON备份 ──► 浏览器控制台导入 ──► localStorage ──► 前端直接读取  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        迁移后 (MySQL)                             │
├─────────────────────────────────────────────────────────────────┤
│  JSON备份 ──► 迁移脚本/API ──► MySQL ──► API接口 ──► 前端读取    │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 JSON备份文件兼容性

**重要结论：以前的JSON备份文件完全兼容，不会受影响！**

| 项目 | 说明 |
|------|------|
| JSON格式 | 完全兼容，无需修改 |
| 字段名称 | 完全一致 |
| 数据结构 | 完全一致 |
| 导入方式 | 从浏览器控制台改为迁移脚本或API |

### 7.3 恢复JSON备份的方法

#### 方法一：使用迁移脚本（推荐）

```bash
cd server
python migrate_to_mysql.py your_backup.json
```

#### 方法二：使用API接口

```bash
# 通过后端API导入JSON数据
curl -X POST http://your-server/api/sync/import \
  -H "Content-Type: application/json" \
  -d @your_backup.json
```

#### 方法三：前端页面导入

在前端备份管理页面，上传JSON文件，系统会自动调用API导入。

### 7.4 数据去重机制

迁移脚本和API都使用 `merge` 或 `ON DUPLICATE KEY UPDATE` 机制：

- **相同ID的记录**：会被更新，不会重复
- **新记录**：会被插入
- **不会产生重复数据**

### 7.5 备份策略建议

迁移后的备份策略：

| 备份方式 | 命令 | 频率 |
|----------|------|------|
| MySQL备份 | `mysqldump -u scheduler -p music_scheduler > backup.sql` | 每日 |
| JSON导出 | `curl http://server/api/sync/all > backup.json` | 每周 |
| 手动备份 | 通过前端备份页面下载 | 按需 |

---

## 八、字段对照表（前端 vs MySQL）

### 8.1 教师表 (teachers) ✅ 完全匹配

| 前端字段 (TypeScript) | MySQL字段 | 类型 | 状态 |
|----------------------|-----------|------|------|
| `id` | `teacher_id` (via to_dict) | VARCHAR(50) | ✅ 返回工号 |
| `teacher_id` | `teacher_id` | VARCHAR(50) | ✅ |
| `name` | `name` | VARCHAR(100) | ✅ |
| `full_name` | `full_name` | VARCHAR(100) | ✅ |
| `email` | `email` | VARCHAR(100) | ✅ |
| `phone` | `phone` | VARCHAR(20) | ✅ |
| `department` | `department` | VARCHAR(100) | ✅ |
| `faculty_id` | `faculty_id` | VARCHAR(50) | ✅ |
| `faculty_code` | `faculty_code` | VARCHAR(50) | ✅ |
| `faculty_name` | `faculty_name` | VARCHAR(100) | ✅ |
| `position` | `position` | VARCHAR(50) | ✅ |
| `hire_date` | `hire_date` | DATE | ✅ |
| `status` | `status` | VARCHAR(20) | ✅ |
| `primary_instrument` | `primary_instrument` | VARCHAR(100) | ✅ |
| `can_teach_instruments` | `can_teach_instruments` | JSON | ✅ |
| `max_students_per_class` | `max_students_per_class` | INT | ✅ |
| `fixed_room_id` | `fixed_room_id` | VARCHAR(36) | ✅ |
| `fixed_rooms` | `fixed_rooms` | JSON | ✅ |
| `qualifications` | `qualifications` | JSON | ✅ |
| `remarks` | `remarks` | TEXT | ✅ |

> **注意**：数据库主键是UUID，但 `to_dict()` 返回的 `id` 字段是工号。

### 8.2 学生表 (students) ✅ 基本匹配

| 前端字段 (TypeScript) | MySQL字段 | 类型 | 状态 |
|----------------------|-----------|------|------|
| `id` | `student_id` (via to_dict) | VARCHAR(50) | ✅ 返回学号 |
| `student_id` | `student_id` | VARCHAR(50) | ✅ |
| `name` | `name` | VARCHAR(100) | ✅ |
| `teacher_id` | `teacher_id` | VARCHAR(50) | ✅ |
| `major_class` | `major_class` | VARCHAR(100) | ✅ |
| `grade` | `grade` | INT | ✅ |
| `student_type` | `student_type` | VARCHAR(20) | ✅ |
| `primary_instrument` | `primary_instrument` | VARCHAR(100) | ✅ |
| `secondary_instruments` | `secondary_instruments` | JSON | ✅ |
| `faculty_code` | `faculty_code` | VARCHAR(50) | ✅ |
| `enrollment_year` | `enrollment_year` | INT | ✅ |
| `current_grade` | `current_grade` | INT | ✅ |
| `student_status` | `student_status` | VARCHAR(20) | ✅ |
| `status` | `status` | VARCHAR(20) | ✅ |
| `remarks` | `remarks` | TEXT | ✅ |
| `assigned_teachers` | `assigned_teachers` | JSON | ✅ |
| `secondary1_teacher_id` | `secondary1_teacher_id` | VARCHAR(50) | ✅ |
| `secondary1_teacher_name` | `secondary1_teacher_name` | VARCHAR(100) | ✅ |
| `secondary2_teacher_id` | `secondary2_teacher_id` | VARCHAR(50) | ✅ |
| `secondary2_teacher_name` | `secondary2_teacher_name` | VARCHAR(100) | ✅ |
| `secondary3_teacher_id` | `secondary3_teacher_id` | VARCHAR(50) | ✅ |
| `secondary3_teacher_name` | `secondary3_teacher_name` | VARCHAR(100) | ✅ |
| `secondary_instrument1` | `secondary_instrument1` | VARCHAR(100) | ✅ |
| `secondary_instrument2` | `secondary_instrument2` | VARCHAR(100) | ✅ |
| `secondary_instrument3` | `secondary_instrument3` | VARCHAR(100) | ✅ |
| `notes` | `notes` | TEXT | ✅ |
| `instrument` | - | - | ⚠️ 计算字段 |
| `grade_text` | - | - | ⚠️ 计算字段 |

> **说明**: 
> - 数据库主键是UUID，但 `to_dict()` 返回的 `id` 字段是学号
> - `instrument` 和 `grade_text` 是前端计算字段，不需要存储在数据库中
> - `notes` 和 `remarks` 是同义字段，`notes` 用于学生备注，`remarks` 用于其他备注

### 8.3 课程表 (courses) ⚠️ 需注意字段映射

| 前端字段 (TypeScript) | MySQL字段 | 类型 | 状态 |
|----------------------|-----------|------|------|
| `id` | `id` | VARCHAR(36) | ✅ |
| `course_id` | `course_id` | VARCHAR(50) | ✅ |
| `course_name` | `course_name` | VARCHAR(200) | ✅ |
| `course_type` | `course_type` | VARCHAR(50) | ✅ |
| `faculty_id` | `faculty_id` | VARCHAR(50) | ✅ |
| `teacher_id` | `teacher_id` | VARCHAR(50) | ✅ |
| `teacher_name` | `teacher_name` | VARCHAR(100) | ✅ |
| `student_id` | `student_id` | VARCHAR(50) | ✅ |
| `student_name` | `student_name` | VARCHAR(100) | ✅ |
| `major_class` | `major_class` | VARCHAR(100) | ✅ |
| `academic_year` | `academic_year` | VARCHAR(20) | ✅ |
| `semester` | `semester` | INT | ✅ |
| `semester_label` | `semester_label` | VARCHAR(20) | ✅ |
| `course_category` | `course_category` | VARCHAR(20) | ✅ |
| `primary_instrument` | `primary_instrument` | VARCHAR(100) | ✅ |
| `secondary_instrument` | `secondary_instrument` | VARCHAR(100) | ✅ |
| `duration` | `duration` | INT | ✅ |
| `week_frequency` | `week_frequency` | INT | ✅ |
| `credit` | `credit` | INT | ✅ |
| `credit_hours` | `credit_hours` | INT | ✅ 兼容字段，已迁移 |
| `required_hours` | `required_hours` | INT | ✅ |
| `total_hours` | `total_hours` | INT | ✅ 兼容字段，已迁移 |
| `weeks` | `weeks` | INT | ✅ 兼容字段，已迁移 |
| `group_size` | `group_size` | INT | ✅ |
| `student_count` | `student_count` | INT | ✅ |
| `teaching_type` | `teaching_type` | VARCHAR(50) | ✅ |
| `class_type` | `teaching_type` | VARCHAR(50) | ⚠️ 映射到teaching_type |
| `remark` | - | - | ⚠️ 前端计算字段，不存储 |

> **重要说明**：
> - `credit_hours`、`total_hours`、`weeks` 已添加到MySQL表作为兼容字段
> - 迁移脚本已更新，支持双向映射：`credit ↔ credit_hours`、`required_hours ↔ total_hours`
> - `class_type` 字段映射到 `teaching_type`，前端代码中两者混用
> - `remark` 是前端临时字段，不需要存储到数据库

### 8.4 排课表 (scheduled_classes) ✅ 完全匹配

| 前端字段 (TypeScript) | MySQL字段 | 类型 | 状态 |
|----------------------|-----------|------|------|
| `id` | `id` | VARCHAR(36) | ✅ |
| `teacher_id` | `teacher_id` | VARCHAR(50) | ✅ |
| `teacher_name` | `teacher_name` | VARCHAR(100) | ✅ |
| `course_id` | `course_id` | VARCHAR(36) | ✅ |
| `course_code` | `course_code` | VARCHAR(50) | ✅ |
| `class_id` | `class_id` | VARCHAR(50) | ✅ |
| `room_id` | `room_id` | VARCHAR(36) | ✅ |
| `student_id` | `student_id` | VARCHAR(50) | ✅ |
| `day_of_week` | `day_of_week` | INT | ✅ |
| `date` | `date` | DATE | ✅ |
| `period` | `period` | INT | ✅ |
| `duration` | `duration` | INT | ✅ |
| `start_week` | `start_week` | INT | ✅ |
| `end_week` | `end_week` | INT | ✅ |
| `specific_dates` | `specific_dates` | JSON | ✅ |
| `week_number` | `week_number` | INT | ✅ |
| `faculty_id` | `faculty_id` | VARCHAR(50) | ✅ |
| `semester_label` | `semester_label` | VARCHAR(20) | ✅ |
| `academic_year` | `academic_year` | VARCHAR(20) | ✅ |
| `semester` | `semester` | INT | ✅ |
| `status` | `status` | VARCHAR(20) | ✅ |
| `group_id` | `group_id` | VARCHAR(36) | ✅ |

### 8.5 教室表 (rooms) ✅ 完全匹配

| 前端字段 (TypeScript) | MySQL字段 | 类型 | 状态 |
|----------------------|-----------|------|------|
| `id` | `id` | VARCHAR(36) | ✅ |
| `teacher_id` | `teacher_id` | VARCHAR(50) | ✅ |
| `room_name` | `room_name` | VARCHAR(100) | ✅ |
| `room_type` | `room_type` | VARCHAR(20) | ✅ |
| `faculty_code` | `faculty_code` | VARCHAR(50) | ✅ |
| `capacity` | `capacity` | INT | ✅ |
| `location` | `location` | VARCHAR(200) | ✅ |
| `equipment` | `equipment` | JSON | ✅ |
| `status` | `status` | VARCHAR(20) | ✅ |
| `last_maintenance` | `last_maintenance` | DATE | ✅ |

---

## 九、兼容性保障

### 9.1 数据字段映射

| localStorage 字段 | MySQL 字段 | 转换规则 |
|-------------------|------------|----------|
| 数组类型 | JSON | `JSON.stringify()` |
| 对象类型 | JSON | `JSON.stringify()` |
| 日期字符串 | DATETIME/DATE | 直接存储 |
| 布尔值 | TINYINT(1) | `true→1, false→0` |

### 9.2 API 响应格式

保持与 localStorage 数据格式完全一致：

```json
{
  "id": "uuid-string",
  "teacher_id": "12015001",
  "name": "张老师",
  "can_teach_instruments": ["钢琴", "钢琴伴奏"],
  "fixed_rooms": [
    {"room_id": "room-uuid", "faculty_code": "PIANO"}
  ],
  "created_at": "2024-01-01T00:00:00Z"
}
```

### 9.3 回滚方案

如果迁移后出现问题：

1. **配置回滚**: 设置 `USE_MYSQL=false`
2. **数据恢复**: 从备份JSON恢复到localStorage
3. **服务重启**: 重启应用服务

---

## 十、测试计划

### 10.1 功能测试清单

| 功能模块 | 测试项 | 预期结果 |
|----------|--------|----------|
| 用户认证 | 登录/登出 | 正常跳转 |
| 教师管理 | 增删改查 | 数据正确 |
| 学生管理 | 导入/分配 | 数据完整 |
| 排课功能 | 创建/冲突检测 | 正常工作 |
| 数据同步 | 导入/导出 | 格式正确 |

### 10.2 性能测试

| 测试项 | 指标 | 目标值 |
|--------|------|--------|
| 页面加载 | 首屏时间 | < 3s |
| API响应 | 平均响应时间 | < 500ms |
| 并发能力 | 同时在线用户 | 50+ |

---

## 十一、附录

### 11.1 相关文件清单

| 文件路径 | 说明 |
|----------|------|
| `server/config.py` | 配置文件 |
| `server/models/*.py` | 数据模型 |
| `server/routes/*.py` | API路由 |
| `server/migrate_to_mysql.py` | 迁移脚本 |
| `server/init_mysql.sql` | 数据库初始化 |
| `docs/mysql-migration-plan.md` | 本文档 |

### 11.2 参考链接

- [SQLAlchemy 文档](https://docs.sqlalchemy.org/)
- [MySQL 8.0 文档](https://dev.mysql.com/doc/refman/8.0/en/)
- [Flask 文档](https://flask.palletsprojects.com/)

---

## 十二、关键迁移注意事项（重要！）

### 12.1 JSON字段处理

MySQL中JSON字段与localStorage的JSON数据需要特别注意：

| 字段 | 表 | 原始格式 | MySQL存储 | 注意事项 |
|------|-----|---------|----------|---------|
| `can_teach_instruments` | teachers | `["钢琴", "声乐"]` | JSON列 | ✅ 直接存储 |
| `fixed_rooms` | teachers | `[{room_id, faculty_code}]` | JSON列 | ✅ 直接存储 |
| `qualifications` | teachers | `[{course_name, proficiency_level}]` | JSON列 | ✅ 直接存储 |
| `secondary_instruments` | students | `["声乐", "古筝"]` | JSON列 | ✅ 直接存储 |
| `assigned_teachers` | students | `{primary_teacher_id, primary_teacher_name...}` | JSON列 | ✅ 直接存储 |
| `specific_dates` | scheduled_classes | `["2026-03-01", "2026-03-08"]` | JSON列 | ✅ 直接存储 |
| `class_associations` | blocked_slots | `[{id, name}]` | JSON列 | ✅ 直接存储 |
| `specific_week_days` | blocked_slots | `[{week, day}]` | JSON列 | ✅ 直接存储 |
| `entries` | large_class_schedules | `[LargeClassEntry...]` | JSON列 | ✅ 直接存储 |

**JSON字段迁移规则**：
1. 数组类型：使用 `json.dumps(data, ensure_ascii=False)` 转换
2. 对象类型：同上
3. 空值处理：`None` 或 `[]` 或 `{}` 都需要正确处理
4. 读取时：MySQL会自动返回Python对象，无需额外解析

### 12.2 教师ID与工号的映射关系

**关键问题**：系统中存在两种教师ID格式：
- **UUID格式**：如 `550e8400-e29b-41d4-a716-446655440000`（旧版本）
- **工号格式**：如 `12015001`（新版本）

**迁移策略**：
```
┌─────────────────────────────────────────────────────────────────┐
│                    教师ID统一使用工号                            │
├─────────────────────────────────────────────────────────────────┤
│  teachers.id = teachers.teacher_id = 工号                       │
│  scheduled_classes.teacher_id = 工号                            │
│  students.teacher_id = 工号                                     │
│  student_teacher_assignments.teacher_id = 工号                  │
│  users.teacher_id = 工号                                        │
└─────────────────────────────────────────────────────────────────┘
```

**迁移脚本中的处理**：
```python
# 在sync.py中已实现映射转换
teacher_name_to_id = {t.name: t.teacher_id for t in teachers}
# 将旧UUID转换为工号
if not teacher_id.isdigit():
    teacher_id = teacher_name_to_id.get(teacher_name, teacher_id)
```

### 12.3 学生ID与学号的映射关系

**关键问题**：学生ID同样存在两种格式：
- **UUID格式**：旧版本前端生成的临时ID
- **学号格式**：如 `2023001`（正式学号）

**迁移策略**：
```
┌─────────────────────────────────────────────────────────────────┐
│                    学生ID统一使用学号                            │
├─────────────────────────────────────────────────────────────────┤
│  students.id = students.student_id = 学号                       │
│  scheduled_classes.student_id = 学号                            │
│  student_teacher_assignments.student_id = 学号                  │
└─────────────────────────────────────────────────────────────────┘
```

**迁移脚本中的处理**：
```python
# 建立旧UUID到学号的映射
old_uuid_to_student_id = {}
if old_id and student_id and old_id != student_id:
    old_uuid_to_student_id[old_id] = student_id

# 转换排课数据中的学生ID
def convert_student_id(original_student_id):
    if original_student_id.isdigit():
        return original_student_id
    return old_uuid_to_student_id.get(original_student_id, original_student_id)
```

### 12.4 多教师同时排课的并发控制

**核心需求**：确保多位教师在同一时间排课时数据不冲突。

#### 方案一：数据库行锁 + 乐观锁

```sql
-- 添加版本号字段
ALTER TABLE scheduled_classes ADD COLUMN version INT DEFAULT 1;

-- 更新时检查版本
UPDATE scheduled_classes 
SET ..., version = version + 1 
WHERE id = ? AND version = ?;
```

#### 方案二：唯一索引约束

```sql
-- 防止同一教师同一时间排多节课
ALTER TABLE scheduled_classes 
ADD UNIQUE KEY uk_teacher_time (teacher_id, day_of_week, period, semester_label);

-- 防止同一琴房同一时间被占用
ALTER TABLE scheduled_classes 
ADD UNIQUE KEY uk_room_time (room_id, day_of_week, period, semester_label);
```

> ⚠️ **重要提示**：添加唯一约束前需先清理数据！
> - 当前数据中存在 `semester_label` 为空的记录（约1232条）
> - 存在同一教师时间周次的重复记录（约302组）
> - **建议**：迁移后先清理数据（补充学期标签、删除重复记录），再添加唯一约束

#### 方案三：WebSocket实时同步（已实现）

```python
# websocket_handlers/handlers.py
def broadcast_schedule_created(schedule_data):
    socketio.emit('schedule_created', schedule_data)

def broadcast_schedule_updated(schedule_data):
    socketio.emit('schedule_updated', schedule_data)

def broadcast_schedule_deleted(schedule_id):
    socketio.emit('schedule_deleted', {'id': schedule_id})
```

**推荐方案**：**唯一索引约束 + WebSocket实时同步**

### 12.5 数据一致性保障

#### 12.5.1 外键关系检查

迁移前需要确保：
```sql
-- 检查孤儿数据：排课记录中的教师不存在
SELECT sc.* FROM scheduled_classes sc 
LEFT JOIN teachers t ON sc.teacher_id = t.teacher_id 
WHERE t.id IS NULL;

-- 检查孤儿数据：排课记录中的学生不存在
SELECT sc.* FROM scheduled_classes sc 
LEFT JOIN students s ON sc.student_id = s.student_id 
WHERE s.id IS NULL;

-- 检查孤儿数据：排课记录中的琴房不存在
SELECT sc.* FROM scheduled_classes sc 
LEFT JOIN rooms r ON sc.room_id = r.id 
WHERE r.id IS NULL;
```

#### 12.5.2 数据完整性约束

```sql
-- 添加外键约束（可选，根据实际需求）
ALTER TABLE scheduled_classes
ADD CONSTRAINT fk_schedule_teacher 
FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) 
ON DELETE SET NULL;

ALTER TABLE scheduled_classes
ADD CONSTRAINT fk_schedule_student
FOREIGN KEY (student_id) REFERENCES students(student_id)
ON DELETE SET NULL;

ALTER TABLE scheduled_classes
ADD CONSTRAINT fk_schedule_room
FOREIGN KEY (room_id) REFERENCES rooms(id)
ON DELETE SET NULL;
```

### 12.6 前端页面数据字段对照检查

#### 12.6.1 排课页面 (ArrangeClass.tsx)

| 使用字段 | 来源表 | 迁移后来源 | 状态 |
|---------|--------|-----------|------|
| `teacher.id` | teachers | teachers.teacher_id | ✅ 需确保返回工号 |
| `teacher.name` | teachers | teachers.name | ✅ |
| `teacher.fixed_rooms` | teachers | teachers.fixed_rooms (JSON) | ✅ |
| `student.student_id` | students | students.student_id | ✅ |
| `student.assigned_teachers` | students | students.assigned_teachers (JSON) | ✅ |
| `schedule.teacher_id` | scheduled_classes | scheduled_classes.teacher_id | ✅ 工号 |
| `schedule.student_id` | scheduled_classes | scheduled_classes.student_id | ✅ 学号 |

#### 12.6.2 学生管理页面 (Students.tsx)

| 使用字段 | 来源表 | 迁移后来源 | 状态 |
|---------|--------|-----------|------|
| `student.secondary_instruments` | students | students.secondary_instruments (JSON) | ✅ |
| `student.assigned_teachers` | students | students.assigned_teachers (JSON) | ✅ |
| `student.secondary1_teacher_id` | students | students.secondary1_teacher_id | ✅ 工号 |
| `student.secondary1_teacher_name` | students | students.secondary1_teacher_name | ✅ |

#### 12.6.3 教师管理页面 (Teachers.tsx)

| 使用字段 | 来源表 | 迁移后来源 | 状态 |
|---------|--------|-----------|------|
| `teacher.can_teach_instruments` | teachers | teachers.can_teach_instruments (JSON) | ✅ |
| `teacher.fixed_rooms` | teachers | teachers.fixed_rooms (JSON) | ✅ |
| `teacher.qualifications` | teachers | teachers.qualifications (JSON) | ✅ |

### 12.7 迁移后API响应格式验证

确保所有API返回的数据格式与前端期望一致：

```json
{
  "id": "12015001",
  "teacher_id": "12015001",
  "name": "张老师",
  "can_teach_instruments": ["钢琴", "声乐"],
  "fixed_rooms": [
    {"room_id": "room-uuid", "faculty_code": "PIANO"}
  ],
  "created_at": "2024-01-01T00:00:00"
}
```

**关键检查点**：
1. ✅ JSON字段返回的是对象/数组，不是字符串
2. ✅ `id` 字段返回的是工号/学号，不是UUID
3. ✅ 日期格式为ISO 8601格式
4. ✅ 空值返回 `null` 或 `[]`，不是空字符串

### 12.8 迁移测试清单

#### 阶段一：数据完整性测试

| 测试项 | 验证方法 | 预期结果 |
|--------|---------|---------|
| 教师数据完整性 | `SELECT COUNT(*) FROM teachers` | 与localStorage数量一致 |
| 学生数据完整性 | `SELECT COUNT(*) FROM students` | 与localStorage数量一致 |
| 排课数据完整性 | `SELECT COUNT(*) FROM scheduled_classes` | 与localStorage数量一致 |
| JSON字段解析 | `SELECT JSON_LENGTH(can_teach_instruments) FROM teachers` | 返回数组长度 |
| ID映射正确性 | 检查teacher_id是否为工号格式 | 全部为数字 |

#### 阶段二：功能测试

| 测试项 | 测试步骤 | 预期结果 |
|--------|---------|---------|
| 教师登录 | 使用工号登录 | 成功登录 |
| 查看学生列表 | 进入学生管理页面 | 数据正确显示 |
| 创建排课 | 选择学生、时间、琴房 | 成功创建 |
| 并发排课 | 两位教师同时排课 | 不产生冲突 |
| 实时同步 | 教师A排课后教师B看到 | 数据实时更新 |

#### 阶段三：性能测试

| 测试项 | 测试条件 | 预期结果 |
|--------|---------|---------|
| 排课查询 | 1000条排课记录 | < 200ms |
| 学生查询 | 500条学生记录 | < 100ms |
| 并发写入 | 10个并发请求 | 全部成功 |

---

## 十二B、类型定义注意事项

### 12B.1 前端类型定义问题

在 `src/types/index.ts` 中存在以下类型定义问题，迁移时需注意：

| 问题 | 描述 | 影响 |
|------|------|------|
| `as any` 类型转换 | Courses.tsx 中大量使用 `(course as any).teaching_type` | 类型安全性降低 |
| `id` 字段含义 | 文档说返回工号/学号，但类型定义中 `id` 和 `teacher_id`/`student_id` 是独立字段 | 可能导致混淆 |
| 可选字段过多 | 许多关键字段定义为可选（如 `teacher_id?: string`） | 可能导致数据不完整 |

### 12B.2 建议修复

**Course 类型定义完善**：
```typescript
export interface Course {
  // ... 现有字段
  teaching_type: '专业大课' | '小组课';  // 建议改为必填
  class_type?: '普通班' | '专升本';      // 映射到 teaching_type
  weeks: number;                         // 建议改为必填
  credit_hours: number;                  // 建议改为必填
  total_hours: number;                   // 建议改为必填
}
```

**Student 类型定义完善**：
```typescript
export interface Student {
  // ... 现有字段
  assigned_teachers?: {
    primary_teacher_id?: string;
    primary_teacher_name?: string;
    secondary1_teacher_id?: string;      // 已在数据库定义
    secondary1_teacher_name?: string;
    secondary2_teacher_id?: string;
    secondary2_teacher_name?: string;
    secondary3_teacher_id?: string;
    secondary3_teacher_name?: string;
  };
}
```

---

## 十三、迁移执行步骤

### 13.1 迁移前准备

```bash
# 1. 备份当前数据
# 在浏览器控制台执行导出脚本

# 2. 创建MySQL数据库
mysql -u root -p
CREATE DATABASE music_scheduler CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 3. 执行建表SQL
source /path/to/init_mysql.sql
```

### 13.2 执行迁移

```bash
# 1. 配置环境变量
export MYSQL_HOST=localhost
export MYSQL_PORT=3306
export MYSQL_USER=scheduler
export MYSQL_PASSWORD=Scheduler@2026
export MYSQL_DATABASE=music_scheduler

# 2. 运行迁移脚本
cd server
python migrate_to_mysql.py ../localStorage_export_2026-02-25.json

# 3. 验证迁移结果
# 执行验证SQL（见上文）
```

### 13.3 切换到MySQL模式

```bash
# 1. 修改配置
# server/config.py
USE_MYSQL = True

# 2. 重启服务
systemctl restart music-scheduler
```

---

## 十四、迁移执行快速指南

### 14.0 数据备份（迁移前必须执行）

> ⚠️ **重要**：在执行任何迁移操作前，必须先完成数据备份！

#### 14.0.1 备份方式

系统支持三种备份方式，建议全部执行：

| 备份方式 | 文件格式 | 用途 | 优先级 |
|---------|---------|------|--------|
| SQLite数据库备份 | `.db` | 直接替换恢复 | ⭐⭐⭐ 必须 |
| JSON数据导出 | `.json` | MySQL迁移/跨平台恢复 | ⭐⭐⭐ 必须 |
| localStorage导出 | `.json` | 浏览器端恢复 | ⭐⭐ 推荐 |

#### 14.0.2 方式一：SQLite数据库备份（命令行）

```bash
# 创建备份目录
mkdir -p backups

# 备份SQLite数据库
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp server/music_scheduler.db backups/music_scheduler_${TIMESTAMP}.db

# 验证备份
ls -la backups/
```

#### 14.0.3 方式二：JSON数据导出（API方式）

```bash
# 通过API导出所有数据
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
curl -s http://localhost:5000/api/sync/all -o backups/data_export_${TIMESTAMP}.json

# 验证导出数据
cat backups/data_export_${TIMESTAMP}.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'教师: {len(data.get(\"teachers\", []))}')
print(f'学生: {len(data.get(\"students\", []))}')
print(f'课程: {len(data.get(\"courses\", []))}')
print(f'排课: {len(data.get(\"schedules\", []))}')
"
```

#### 14.0.4 方式三：localStorage导出（浏览器控制台）

在浏览器控制台执行以下脚本：

```javascript
const exportData = {};
const keys = Object.keys(localStorage).filter(k => k.startsWith('music_scheduler_'));
keys.forEach(key => {
  try {
    exportData[key] = JSON.parse(localStorage.getItem(key));
  } catch (e) {
    exportData[key] = localStorage.getItem(key);
  }
});
const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `localStorage_export_${new Date().toISOString().slice(0,10)}.json`;
a.click();
URL.revokeObjectURL(url);
console.log(`已导出 ${keys.length} 个数据项`);
```

#### 14.0.5 一键备份脚本

创建 `scripts/backup.sh`：

```bash
#!/bin/bash
# 数据备份脚本

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "=== 开始数据备份 ==="
echo "时间戳: $TIMESTAMP"
echo ""

# 创建备份目录
mkdir -p $BACKUP_DIR

# 1. 备份SQLite数据库
echo "1. 备份SQLite数据库..."
if [ -f "server/music_scheduler.db" ]; then
    cp server/music_scheduler.db $BACKUP_DIR/music_scheduler_${TIMESTAMP}.db
    echo "   ✅ SQLite备份完成"
else
    echo "   ⚠️ SQLite数据库文件不存在"
fi

# 2. 通过API导出JSON
echo "2. 导出JSON数据..."
curl -s http://localhost:5000/api/sync/all -o $BACKUP_DIR/data_export_${TIMESTAMP}.json
if [ -s $BACKUP_DIR/data_export_${TIMESTAMP}.json ]; then
    echo "   ✅ JSON导出完成"
else
    echo "   ⚠️ JSON导出失败，请检查服务是否运行"
fi

# 3. 显示备份文件
echo ""
echo "3. 备份文件列表:"
ls -lh $BACKUP_DIR/

# 4. 数据统计
echo ""
echo "4. 数据统计:"
cat $BACKUP_DIR/data_export_${TIMESTAMP}.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'   - 教师: {len(data.get(\"teachers\", []))}')
print(f'   - 学生: {len(data.get(\"students\", []))}')
print(f'   - 课程: {len(data.get(\"courses\", []))}')
print(f'   - 排课: {len(data.get(\"schedules\", []))}')
print(f'   - 教室: {len(data.get(\"rooms\", []))}')
print(f'   - 班级: {len(data.get(\"classes\", []))}')
print(f'   - 用户: {len(data.get(\"users\", []))}')
"

echo ""
echo "=== 备份完成 ==="
echo "备份目录: $BACKUP_DIR"
```

使用方法：
```bash
chmod +x scripts/backup.sh
./scripts/backup.sh
```

#### 14.0.6 备份验证

```bash
# 验证SQLite备份
sqlite3 backups/music_scheduler_*.db "
SELECT 'teachers' as tbl, COUNT(*) FROM teachers
UNION ALL SELECT 'students', COUNT(*) FROM students
UNION ALL SELECT 'courses', COUNT(*) FROM courses
UNION ALL SELECT 'scheduled_classes', COUNT(*) FROM scheduled_classes;
"

# 验证JSON备份
cat backups/data_export_*.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for key in ['teachers', 'students', 'courses', 'schedules', 'rooms']:
    print(f'{key}: {len(data.get(key, []))}')
"
```

#### 14.0.7 数据恢复方法

**恢复SQLite数据库**：
```bash
# 停止服务
# systemctl stop music-scheduler  # 生产环境

# 恢复数据库
cp backups/music_scheduler_20260226_230652.db server/music_scheduler.db

# 重启服务
# systemctl start music-scheduler
```

**恢复到MySQL**：
```bash
python migrate_to_mysql.py backups/data_export_20260226_230652.json
```

**恢复到localStorage**：
1. 打开浏览器控制台
2. 执行以下脚本导入JSON数据：
```javascript
fetch('path/to/your/backup.json')
  .then(r => r.json())
  .then(data => {
    Object.keys(data).forEach(key => {
      localStorage.setItem(key, JSON.stringify(data[key]));
    });
    console.log('数据恢复完成，请刷新页面');
  });
```

#### 14.0.8 备份策略建议

| 备份类型 | 频率 | 保留期限 | 存储位置 |
|---------|------|---------|---------|
| 迁移前备份 | 每次迁移前 | 永久 | 本地 + 云存储 |
| 日常备份 | 每日 | 7天 | 服务器本地 |
| 周备份 | 每周 | 4周 | 云存储 |
| 月备份 | 每月 | 12月 | 异地备份 |

---

### 14.1 迁移流程总览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           完整迁移流程                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│   │ 1.导出   │───►│ 2.准备   │───►│ 3.迁移   │───►│ 4.验证   │            │
│   │ 数据     │    │ MySQL    │    │ 数据     │    │ 结果     │            │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘            │
│        │               │               │               │                   │
│        ▼               ▼               ▼               ▼                   │
│   浏览器控制台     创建数据库       运行脚本       检查数据量               │
│   执行导出脚本     执行建表SQL      导入数据       验证JSON字段             │
│                                                                     │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│   │ 5.构建   │───►│ 6.配置   │───►│ 7.部署   │───►│ 8.测试   │            │
│   │ 前端     │    │ 服务     │    │ 上线     │    │ 验收     │            │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘            │
│        │               │               │               │                   │
│        ▼               ▼               ▼               ▼                   │
│   npm run build    Nginx配置       启动服务       功能测试                 │
│   生成静态文件     Systemd配置     开放端口       性能测试                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 14.2 阶段一：数据迁移（本地操作）

#### 第1步：导出localStorage数据

在浏览器控制台执行以下脚本：

```javascript
const exportData = {};
const keys = Object.keys(localStorage).filter(k => k.startsWith('music_scheduler_'));
keys.forEach(key => {
  try {
    exportData[key] = JSON.parse(localStorage.getItem(key));
  } catch (e) {
    exportData[key] = localStorage.getItem(key);
  }
});
const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `localStorage_export_${new Date().toISOString().slice(0,10)}.json`;
a.click();
URL.revokeObjectURL(url);
console.log(`已导出 ${keys.length} 个数据项`);
```

**输出文件**：`localStorage_export_2026-02-26.json`

#### 第2步：准备MySQL数据库

```sql
-- 创建数据库
CREATE DATABASE music_scheduler 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 创建用户（如需要）
CREATE USER 'scheduler'@'%' IDENTIFIED BY 'Scheduler@2026';
GRANT ALL PRIVILEGES ON music_scheduler.* TO 'scheduler'@'%';
FLUSH PRIVILEGES;
```

#### 第3步：执行迁移脚本

```bash
# 配置环境变量
export MYSQL_HOST=localhost
export MYSQL_PORT=3306
export MYSQL_USER=scheduler
export MYSQL_PASSWORD=Scheduler@2026
export MYSQL_DATABASE=music_scheduler

# 运行迁移
cd server
python migrate_to_mysql.py ../localStorage_export_2026-02-26.json
```

#### 第4步：验证迁移结果

```sql
-- 检查各表数据量
SELECT 'users' as tbl, COUNT(*) as cnt FROM users
UNION ALL SELECT 'teachers', COUNT(*) FROM teachers
UNION ALL SELECT 'students', COUNT(*) FROM students
UNION ALL SELECT 'courses', COUNT(*) FROM courses
UNION ALL SELECT 'scheduled_classes', COUNT(*) FROM scheduled_classes
UNION ALL SELECT 'rooms', COUNT(*) FROM rooms;

-- 检查JSON字段
SELECT teacher_id, name, JSON_LENGTH(can_teach_instruments) as instruments 
FROM teachers LIMIT 5;
```

---

### 14.3 阶段二：部署到阿里云

#### 第1步：服务器环境准备

```bash
# 安装必要软件
sudo apt update
sudo apt install -y python3 python3-pip python3-venv nginx mysql-client

# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

#### 第2步：上传项目代码

```bash
# 方式A：Git clone（推荐）
git clone your-repo-url /var/www/music-scheduler

# 方式B：SCP上传
scp -r ./music225 user@server:/var/www/music-scheduler
```

#### 第3步：配置环境变量

创建 `/var/www/music-scheduler/server/.env`：

```env
FLASK_ENV=production
SECRET_KEY=your-secret-key-here

# MySQL配置
MYSQL_HOST=your-mysql-host.aliyuncs.com
MYSQL_PORT=3306
MYSQL_USER=scheduler
MYSQL_PASSWORD=Scheduler@2026
MYSQL_DATABASE=music_scheduler
```

#### 第4步：安装依赖并构建

```bash
# 后端依赖
cd /var/www/music-scheduler/server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 前端构建
cd /var/www/music-scheduler
npm install
npm run build
```

#### 第5步：配置Nginx

创建 `/etc/nginx/sites-available/music-scheduler`：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端静态文件
    location / {
        root /var/www/music-scheduler/dist;
        try_files $uri $uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API代理
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # WebSocket代理
    location /socket.io {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/music-scheduler /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 第6步：配置Systemd服务

创建 `/etc/systemd/system/music-scheduler.service`：

```ini
[Unit]
Description=Music Scheduler API Server
After=network.target mysql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/music-scheduler/server
Environment="FLASK_ENV=production"
Environment="PATH=/var/www/music-scheduler/server/venv/bin"
ExecStart=/var/www/music-scheduler/server/venv/bin/gunicorn -w 4 -b 127.0.0.1:5000 app:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl daemon-reload
sudo systemctl enable music-scheduler
sudo systemctl start music-scheduler
```

---

### 14.4 部署检查清单

| 检查项 | 命令 | 预期结果 |
|--------|------|---------|
| MySQL连接 | `mysql -u scheduler -p music_scheduler -e "SELECT 1"` | 连接成功 |
| 后端服务 | `systemctl status music-scheduler` | active (running) |
| Nginx状态 | `systemctl status nginx` | active (running) |
| API测试 | `curl http://localhost:5000/api/teachers` | 返回JSON数据 |
| 前端访问 | 浏览器访问 `http://your-domain.com` | 页面正常显示 |
| 登录测试 | 使用工号登录 | 登录成功 |

---

### 14.5 常见问题排查

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| API返回500错误 | 数据库连接失败 | 检查.env配置和MySQL服务状态 |
| 前端页面空白 | 构建失败或路径问题 | 检查npm run build输出和Nginx配置 |
| 登录失败 | 用户数据未迁移 | 检查users表是否有数据 |
| WebSocket连接失败 | Nginx代理配置问题 | 检查/socket.io的proxy配置 |
| 数据不显示 | JSON字段解析问题 | 检查MySQL JSON字段是否正确存储 |

---

### 14.6 回滚方案

如果迁移后出现问题，可以按以下步骤回滚：

```bash
# 1. 停止服务
sudo systemctl stop music-scheduler

# 2. 恢复localStorage模式
# 修改 config.py: USE_MYSQL = False

# 3. 重启服务
sudo systemctl start music-scheduler

# 4. 在浏览器控制台导入JSON备份恢复localStorage数据
```

---

**文档版本历史**：

| 版本 | 日期 | 修改内容 | 作者 |
|------|------|----------|------|
| 1.0.0 | 2026-02-25 | 初始版本 | AI Assistant |
| 1.1.0 | 2026-02-26 | 添加关键迁移注意事项、并发控制方案、数据一致性保障 | AI Assistant |
| 1.2.0 | 2026-02-26 | 修复字段对照表不一致问题，明确to_dict()返回逻辑 | AI Assistant |
| 1.3.0 | 2026-02-26 | 添加迁移执行快速指南章节 | AI Assistant |
