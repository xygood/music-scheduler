-- =====================================================
-- MySQL 数据库初始化脚本
-- 音乐排课系统 - Music Scheduler
-- 版本: 1.0.0
-- 创建日期: 2026-02-25
-- =====================================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS music_scheduler 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 创建用户（如果不存在）
CREATE USER IF NOT EXISTS 'scheduler'@'%' IDENTIFIED BY 'Scheduler@2026';

-- 授权
GRANT ALL PRIVILEGES ON music_scheduler.* TO 'scheduler'@'%';
FLUSH PRIVILEGES;

-- 使用数据库
USE music_scheduler;

-- =====================================================
-- 1. 用户表
-- =====================================================
CREATE TABLE IF NOT EXISTS `users` (
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

-- =====================================================
-- 2. 教师表
-- =====================================================
CREATE TABLE IF NOT EXISTS `teachers` (
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

-- =====================================================
-- 3. 学生表
-- =====================================================
CREATE TABLE IF NOT EXISTS `students` (
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

-- =====================================================
-- 4. 班级表
-- =====================================================
CREATE TABLE IF NOT EXISTS `classes` (
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

-- =====================================================
-- 5. 课程表
-- =====================================================
CREATE TABLE IF NOT EXISTS `courses` (
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
  `credit_hours` INT DEFAULT NULL COMMENT '学分课时(兼容)',
  `required_hours` INT DEFAULT 16 COMMENT '所需课时',
  `total_hours` INT DEFAULT NULL COMMENT '总课时(兼容)',
  `weeks` INT DEFAULT 16 COMMENT '周数',
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

-- =====================================================
-- 6. 教室表
-- =====================================================
CREATE TABLE IF NOT EXISTS `rooms` (
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

-- =====================================================
-- 7. 排课记录表
-- =====================================================
CREATE TABLE IF NOT EXISTS `scheduled_classes` (
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

-- =====================================================
-- 8. 禁排时段表
-- =====================================================
CREATE TABLE IF NOT EXISTS `blocked_slots` (
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

-- =====================================================
-- 9. 学期周次配置表
-- =====================================================
CREATE TABLE IF NOT EXISTS `semester_week_configs` (
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

-- =====================================================
-- 10. 大课表
-- =====================================================
CREATE TABLE IF NOT EXISTS `large_class_schedules` (
  `id` VARCHAR(36) NOT NULL COMMENT '主键UUID',
  `file_name` VARCHAR(255) DEFAULT NULL COMMENT '原始文件名',
  `academic_year` VARCHAR(20) DEFAULT NULL COMMENT '学年',
  `semester_label` VARCHAR(20) DEFAULT NULL COMMENT '学期标签',
  `entries` JSON DEFAULT NULL COMMENT '课程条目数组',
  `imported_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '导入时间',
  PRIMARY KEY (`id`),
  KEY `idx_semester_label` (`semester_label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='大课表';

-- =====================================================
-- 11. 学生-教师分配表
-- =====================================================
CREATE TABLE IF NOT EXISTS `student_teacher_assignments` (
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

-- =====================================================
-- 12. 操作日志表
-- =====================================================
CREATE TABLE IF NOT EXISTS `operation_logs` (
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

-- =====================================================
-- 13. 在线教师状态表
-- =====================================================
CREATE TABLE IF NOT EXISTS `online_teachers` (
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

-- =====================================================
-- 14. 优先级禁排时间表
-- =====================================================
CREATE TABLE IF NOT EXISTS `priority_blocked_times` (
  `id` VARCHAR(100) NOT NULL COMMENT '主键ID',
  `priority` VARCHAR(20) NOT NULL COMMENT '优先级: high/medium/low',
  `source` VARCHAR(50) NOT NULL COMMENT '来源: large_class/week_config/major_class/minor_class',
  `entity_type` VARCHAR(50) NOT NULL COMMENT '实体类型: teacher/student/room/class/system',
  `entity_id` VARCHAR(100) NOT NULL COMMENT '实体ID',
  `entity_name` VARCHAR(100) DEFAULT NULL COMMENT '实体名称',
  `academic_year` VARCHAR(20) DEFAULT NULL COMMENT '学年',
  `semester_label` VARCHAR(20) DEFAULT NULL COMMENT '学期标签',
  `start_week` INT DEFAULT NULL COMMENT '开始周次',
  `end_week` INT DEFAULT NULL COMMENT '结束周次',
  `day_of_week` INT NOT NULL COMMENT '星期几(1-7)',
  `start_period` INT NOT NULL COMMENT '开始节次',
  `end_period` INT NOT NULL COMMENT '结束节次',
  `reason` VARCHAR(255) DEFAULT NULL COMMENT '禁排原因',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_entity` (`entity_type`, `entity_id`),
  KEY `idx_semester` (`academic_year`, `semester_label`),
  KEY `idx_time` (`day_of_week`, `start_period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='优先级禁排时间表';

-- =====================================================
-- 插入默认管理员账号
-- 密码: 135 (SHA-256哈希)
-- =====================================================
INSERT INTO `users` (`id`, `teacher_id`, `email`, `password`, `full_name`, `department`, `faculty_id`, `faculty_code`, `specialty`, `is_admin`)
VALUES ('admin-001', '110', 'admin@music.edu.cn', 
        'a3c024e5a6e5b8c2d1f0e8b7a6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7', 
        '谷歌', '系统管理', 'ADMIN', 'PIANO', 
        '["钢琴", "声乐", "器乐"]', 1)
ON DUPLICATE KEY UPDATE `is_admin` = 1, `updated_at` = NOW();

-- =====================================================
-- 验证表创建
-- =====================================================
SELECT 
    TABLE_NAME as '表名',
    TABLE_COMMENT as '说明',
    TABLE_ROWS as '行数',
    ROUND(DATA_LENGTH/1024/1024, 2) as '数据大小(MB)'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'music_scheduler'
ORDER BY TABLE_NAME;

-- =====================================================
-- 完成
-- =====================================================
SELECT 'MySQL 数据库初始化完成!' as '状态';
