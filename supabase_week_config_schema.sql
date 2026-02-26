-- 学期周次配置表
CREATE TABLE IF NOT EXISTS semester_week_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year VARCHAR(4) NOT NULL,         -- 学年，如 "2025"
  semester_label VARCHAR(10) NOT NULL,       -- 学期标签，如 "2025-1" 或 "2025-2"
  start_date DATE NOT NULL,                  -- 学期开始日期，也是第1周开始日期
  total_weeks INTEGER NOT NULL DEFAULT 16,   -- 总周数
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 唯一约束
  CONSTRAINT unique_semester_config UNIQUE (academic_year, semester_label)
);

-- 禁排时段表
CREATE TABLE IF NOT EXISTS blocked_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year VARCHAR(4) NOT NULL,         -- 学年
  semester_label VARCHAR(10) NOT NULL,       -- 学期标签
  type VARCHAR(20) NOT NULL,                 -- 类型：specific（特定周）/recurring（每周循环）

  -- specific 类型使用
  week_number INTEGER,                       -- 特定周次（如第7周）

  -- recurring 类型使用
  day_of_week INTEGER,                       -- 星期几 (1-7)
  start_period INTEGER,                      -- 开始节次
  end_period INTEGER,                        -- 结束节次

  -- 两种类型都使用
  start_date DATE,                           -- 开始日期
  end_date DATE,                             -- 结束日期
  reason VARCHAR(200),                       -- 禁排原因

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 约束
  CONSTRAINT check_blocked_type CHECK (type IN ('specific', 'recurring')),
  CONSTRAINT check_day_of_week CHECK (day_of_week IS NULL OR (day_of_week >= 1 AND day_of_week <= 7)),
  CONSTRAINT check_period_range CHECK (start_period IS NULL OR (start_period >= 1 AND start_period <= 10)),
  CONSTRAINT check_end_period CHECK (end_period IS NULL OR (end_period >= 1 AND end_period <= 10))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_semester_configs_semester_label ON semester_week_configs(semester_label);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_semester_label ON blocked_slots(semester_label);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_type ON blocked_slots(type);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_day_of_week ON blocked_slots(day_of_week);

-- RLS (Row Level Security) 策略
ALTER TABLE semester_week_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;

-- 允许管理员访问所有数据
CREATE POLICY "Admins can access all semester configs" ON semester_week_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND (email LIKE '%admin%' OR raw_user_meta_data->>'teacher_id' ILIKE '%admin%')
    )
  );

CREATE POLICY "Admins can access all blocked slots" ON blocked_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND (email LIKE '%admin%' OR raw_user_meta_data->>'teacher_id' ILIKE '%admin%')
    )
  );

-- 示例数据：插入默认学期配置
INSERT INTO semester_week_configs (academic_year, semester_label, start_date, total_weeks)
VALUES
  ('2025', '2025-1', '2025-09-01', 16),
  ('2025', '2025-2', '2025-02-17', 16)
ON CONFLICT (academic_year, semester_label) DO NOTHING;

-- 示例数据：插入禁排时段
-- 示例：每周一至周五下午5-8节禁排
INSERT INTO blocked_slots (academic_year, semester_label, type, day_of_week, start_period, end_period, reason)
VALUES
  ('2025', '2025-1', 'recurring', 1, 5, 8, '教师例会'),
  ('2025', '2025-1', 'recurring', 5, 5, 8, '政治学习')
ON CONFLICT DO NOTHING;
