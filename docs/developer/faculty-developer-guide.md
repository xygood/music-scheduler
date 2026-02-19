---
AIGC:
    ContentProducer: Minimax Agent AI
    ContentPropagator: Minimax Agent AI
    Label: AIGC
    ProduceID: "00000000000000000000000000000000"
    PropagateID: "00000000000000000000000000000000"
    ReservedCode1: 3045022100c09d1b814ec36c0bb9a26534fe41c38710b7c632e0941dc129c525b0e8ca94cc02207b16fd15a95a4f42f3271ec846686bd77bbd12f7048d723c8c5e24305dddb59d
    ReservedCode2: 3046022100914f50ec712d58fd3b825066d108bc5f3eb79400cb8f07ea424bc7a98437bb5c022100f526a3df6db59054914f45e43dec2de87ea6d6f0456e6cb57363817fad446110
---

# 教研室功能开发者指南

本文档面向开发人员，说明教研室功能的技术架构、扩展方法和最佳实践。

## 目录

1. [系统架构](#系统架构)
2. [数据库设计](#数据库设计)
3. [前端架构](#前端架构)
4. [后端架构](#后端架构)
5. [扩展指南](#扩展指南)
6. [测试指南](#测试指南)
7. [部署指南](#部署指南)
8. [故障排查](#故障排查)

---

## 系统架构

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      前端层 (React + TypeScript)            │
├─────────────────────────────────────────────────────────────┤
│  页面组件          共享组件          状态管理               │
│  ├─FacultyDashboard  ├─FacultyFilter    ├─Context          │
│  ├─FacultySchedule   ├─FacultyWorkload  ├─Zustand          │
│  ├─TeacherQualify    └─DraggableSchedule└─React Query      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API 层 (RESTful)                       │
├─────────────────────────────────────────────────────────────┤
│  Faculty API  │  Teacher API  │  Schedule API  │  Stats API │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      服务层 (Python/Flask)                   │
├─────────────────────────────────────────────────────────────┤
│  验证服务        排课服务        统计服务        通知服务    │
│  ├─FacultyValidator    ├─Scheduler    ├─WorkloadCalc       │
│  ├─TeacherValidator    └─ConflictCheck└─UtilizationCalc    │
│  └─TimeSlotValidator                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      数据层 (PostgreSQL + Supabase)          │
├─────────────────────────────────────────────────────────────┤
│  核心表          关联表          视图            存储过程    │
│  ├─faculties     ├─teacher_instruments├─faculty_workload   │
│  ├─teachers      ├─course_faculty    └─teacher_qualifications│
│  ├─instrument_config              └─course_faculty_view   │
│  └─schedule_records                                │
└─────────────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 18.x |
| 语言 | TypeScript | 5.x |
| 构建工具 | Vite | 6.x |
| 样式 | Tailwind CSS | 3.x |
| 状态管理 | Zustand | - |
| 后端框架 | Flask | 2.x |
| 数据库 | PostgreSQL | 14.x |
| ORM | SQLAlchemy | 2.x |
| 测试框架 | Vitest / Playwright | - |

---

## 数据库设计

### 核心表结构

#### faculties（教研室表）

```sql
CREATE TABLE faculties (
    faculty_id VARCHAR(50) PRIMARY KEY,
    faculty_code VARCHAR(20) UNIQUE NOT NULL,
    faculty_name VARCHAR(100) NOT NULL,
    description TEXT,
    head_teacher_id VARCHAR(50),
    max_daily_classes INT DEFAULT 8,
    color_code VARCHAR(20) DEFAULT '#3B82F6',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### instrument_config（乐器配置表）

```sql
CREATE TABLE instrument_config (
    instrument_id VARCHAR(50) PRIMARY KEY,
    instrument_name VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50),
    faculty_id VARCHAR(50) REFERENCES faculties(faculty_id),
    max_students_per_class INT DEFAULT 5,
    duration_coefficient DECIMAL(3,2) DEFAULT 0.5,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### teacher_instruments（教师乐器关联表）

```sql
CREATE TABLE teacher_instruments (
    id SERIAL PRIMARY KEY,
    teacher_id VARCHAR(50) NOT NULL,
    instrument_id VARCHAR(50) NOT NULL,
    proficiency_level VARCHAR(20) NOT NULL,
    qualification_status VARCHAR(20) DEFAULT 'pending',
    granted_at TIMESTAMP,
    granted_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, instrument_id)
);
```

### 索引优化

```sql
-- 教研室查询优化
CREATE INDEX idx_faculty_code ON faculties(faculty_code);
CREATE INDEX idx_teachers_faculty ON teachers(faculty_id);

-- 排课冲突检测优化
CREATE INDEX idx_schedule_teacher_time
    ON schedule_records(teacher_id, day_of_week, period);

-- 乐器配置查询优化
CREATE INDEX idx_instrument_faculty ON instrument_config(faculty_id);

-- 教师资质验证优化
CREATE INDEX idx_teacher_instruments_lookup
    ON teacher_instruments(teacher_id, instrument_id);
```

### 视图定义

```sql
-- 教研室工作量日视图
CREATE VIEW faculty_workload_daily AS
SELECT
    f.faculty_code,
    f.faculty_name,
    sr.day_of_week,
    COUNT(DISTINCT sr.schedule_id) as class_count,
    COUNT(DISTINCT sr.teacher_id) as teacher_count,
    COUNT(DISTINCT sr.student_id) as student_count
FROM faculties f
LEFT JOIN schedule_records sr ON f.faculty_id = sr.faculty_id
GROUP BY f.faculty_code, f.faculty_name, sr.day_of_week;

-- 教师资质视图
CREATE VIEW teacher_qualifications AS
SELECT
    t.teacher_id,
    t.full_name,
    t.email,
    f.faculty_code,
    f.faculty_name,
    ic.instrument_name,
    ti.proficiency_level,
    ti.qualification_status
FROM teachers t
JOIN faculties f ON t.faculty_id = f.faculty_id
JOIN teacher_instruments ti ON t.teacher_id = ti.teacher_id
JOIN instrument_config ic ON ti.instrument_id = ic.instrument_id;
```

---

## 前端架构

### 目录结构

```
src/
├── components/
│   ├── FacultyFilter.tsx       # 教研室筛选器
│   ├── FacultyWorkloadPanel.tsx # 工作量面板
│   └── DraggableSchedule.tsx   # 可拖拽排课
├── pages/
│   ├── FacultyDashboard.tsx    # 统计仪表板
│   ├── FacultyScheduleView.tsx # 排课视图
│   └── TeacherQualifications.tsx # 资质管理
├── hooks/
│   └── useFaculty.ts           # 教研室相关Hook
├── utils/
│   ├── facultyValidation.ts    # 验证工具
│   └── teacherValidation.ts    # 教师验证工具
└── types/
    └── index.ts                # 类型定义
```

### 关键组件

#### FacultyFilter（教研室筛选器）

```typescript
// 组件Props
interface FacultyFilterProps {
  selectedFaculty: string | null;
  selectedInstrument: string | null;
  onFacultySelect: (faculty: string | null) => void;
  onInstrumentSelect: (instrument: string | null) => void;
}

// 使用示例
<FacultyFilter
  selectedFaculty={selectedFaculty}
  selectedInstrument={selectedInstrument}
  onFacultySelect={setSelectedFaculty}
  onInstrumentSelect={setSelectedInstrument}
/>
```

#### FacultyWorkloadPanel（工作量面板）

```typescript
// 工作量数据接口
interface WorkloadData {
  facultyCode: string;
  totalClasses: number;
  dailyAverage: number;
  teacherCount: number;
  courseCount: number;
}

// 使用示例
<FacultyWorkloadPanel
  workloadData={facultyData.map(f => ({
    facultyCode: f.faculty_code,
    totalClasses: f.classCount,
    dailyAverage: f.classCount / 7,
    teacherCount: f.teacherCount,
    courseCount: f.courseCount
  }))}
/>
```

### 状态管理

```typescript
// Zustand Store示例
interface FacultyStore {
  selectedFaculty: string | null;
  selectedInstrument: string | null;
  workloadData: WorkloadData[];
  setSelectedFaculty: (faculty: string | null) => void;
  setSelectedInstrument: (instrument: string | null) => void;
  setWorkloadData: (data: WorkloadData[]) => void;
}
```

---

## 后端架构

### 目录结构

```
backend/
├── api/
│   ├── faculty_api.py          # 教研室API
│   ├── teacher_api.py          # 教师API
│   └── schedule_api.py         # 排课API
├── services/
│   ├── faculty_validator.py    # 教研室验证
│   ├── scheduler.py            # 排课服务
│   └── workload_calculator.py  # 工作量计算
├── models/
│   ├── faculty.py              # 数据模型
│   └── schedule.py             # 排课模型
└── utils/
    └── database.py             # 数据库工具
```

### 核心服务

#### FacultyValidator（教研室验证器）

```python
class FacultyValidator:
    def validate_faculty_match(
        self,
        teacher_faculty: str,
        course_instrument: str
    ) -> ValidationResult:
        """
        验证教师教研室与课程乐器是否匹配

        Returns:
            ValidationResult: 包含valid, message, details
        """

    def validate_teacher_qualification(
        self,
        teacher_id: str,
        instrument: str
    ) -> ValidationResult:
        """
        验证教师是否有教学资质

        Returns:
            ValidationResult: 包含valid, reason, level
        """

    def check_time_conflict(
        self,
        teacher_id: str,
        day: int,
        period: int,
        exclude_schedule_id: str = None
    ) -> bool:
        """
        检查时间冲突

        Returns:
            bool: True表示有冲突
        """
```

#### WorkloadCalculator（工作量计算器）

```python
class WorkloadCalculator:
    def calculate_daily_workload(
        self,
        teacher_id: str,
        date: str
    ) -> DailyWorkload:
        """计算教师日工作量"""

    def calculate_faculty_workload(
        self,
        faculty_code: str,
        start_date: str,
        end_date: str
    ) -> FacultyWorkload:
        """计算教研室工作量"""

    def check_workload_warning(
        self,
        teacher_id: str,
        date: str,
        threshold: int = 8
    ) -> WorkloadWarning:
        """检查工作量警告"""
```

---

## 扩展指南

### 添加新的教研室

1. **数据库迁移**:
```sql
-- 1. 添加新教研室
INSERT INTO faculties (faculty_id, faculty_code, faculty_name, description)
VALUES ('faculty-new', 'NEW', '新专业', '新专业描述');

-- 2. 配置乐器
UPDATE instrument_config
SET faculty_id = 'faculty-new'
WHERE instrument_name IN ('新乐器1', '新乐器2');

-- 3. 更新教师
UPDATE teachers
SET faculty_id = 'faculty-new'
WHERE id IN ('teacher-1', 'teacher-2');
```

2. **前端配置** (src/types/index.ts):
```typescript
export const FACULTIES = [
  // ... 现有教研室
  {
    faculty_id: 'faculty-new',
    faculty_code: 'NEW',
    faculty_name: '新专业',
    description: '新专业描述',
    color_code: '#8B5CF6',  // 紫色
    max_daily_classes: 8
  }
];
```

3. **添加颜色映射** (src/pages/FacultyDashboard.tsx):
```typescript
const facultyColors: Record<string, { bg: string; text: string; border: string }> = {
  PIANO: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
  VOCAL: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300' },
  INSTRUMENT: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
  NEW: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' }  // 新增
};
```

4. **添加API路由** (backend/api/faculty_api.py):
```python
@faculty_bp.route('/new', methods=['GET'])
def get_new_faculty():
    """获取新专业信息"""
    # 实现逻辑
    pass
```

### 添加新的乐器

1. **数据库配置**:
```sql
INSERT INTO instrument_config (instrument_id, instrument_name, category, faculty_id, max_students_per_class)
VALUES ('inst-new', '新乐器', 'string', 'faculty-instrument', 5);
```

2. **更新类型定义** (src/types/index.ts):
```typescript
export const INSTRUMENTS = [
  // ... 现有乐器
  '新乐器'
];

export const INSTRUMENT_CONFIGS: Record<string, InstrumentConfig> = {
  // ... 现有配置
  '新乐器': {
    id: 'inst-new',
    instrument_name: '新乐器',
    category: 'string',
    faculty_code: 'INSTRUMENT',
    max_students_per_class: 5,
    duration_coefficient: {
      major_duration: 0.5,
      minor_duration: 0.25
    }
  }
};
```

3. **更新验证逻辑** (src/utils/facultyValidation.ts):
```typescript
export function getFacultyCodeForInstrument(instrument: string): string {
  const mapping: Record<string, string> = {
    // ... 现有映射
    '新乐器': 'INSTRUMENT'  // 添加新映射
  };
  return mapping[instrument] || 'INSTRUMENT';
}
```

### 添加新的验证规则

1. **创建验证函数** (src/utils/validation.ts):
```typescript
export interface ValidationResult {
  valid: boolean;
  message?: string;
  details?: Record<string, any>;
}

export function validateCustomRule(
  teacher: Teacher,
  schedule: Schedule
): ValidationResult {
  // 实现自定义验证逻辑
  return { valid: true };
}
```

2. **集成到验证器** (src/utils/facultyValidation.ts):
```typescript
export class FacultyConstraintValidator {
  private customRules: ValidationRule[] = [];

  addCustomRule(rule: ValidationRule) {
    this.customRules.push(rule);
  }

  validateAll(teacher: Teacher, schedule: Schedule): ValidationResult[] {
    const results: ValidationResult[] = [];

    // 现有验证
    results.push(this.checkFacultyMatch(...));
    results.push(this.checkTeacherQualification(...));

    // 自定义验证
    for (const rule of this.customRules) {
      results.push(rule(teacher, schedule));
    }

    return results;
  }
}
```

---

## 测试指南

### 运行单元测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- tests/faculty-integration.test.ts

# 运行特定测试
npm test -- --testNamePattern="Faculty Assignment"
```

### 运行端到端测试

```bash
# 安装Playwright
npm install -D @playwright/test
npx playwright install

# 运行E2E测试
npx playwright test tests/e2e/faculty-e2e.test.ts

# 生成报告
npx playwright show-report
```

### 运行性能测试

```bash
cd tests/performance
python3 faculty_performance_test.py

# 查看报告
cat report.txt
```

### 测试覆盖范围

| 模块 | 测试类型 | 测试用例数 |
|------|----------|------------|
| 教研室分配 | 单元测试 | 15 |
| 教师资质 | 单元测试 | 12 |
| 班级规模 | 单元测试 | 10 |
| 约束验证 | 单元测试 | 20 |
| 完整流程 | E2E测试 | 25 |
| 边界情况 | E2E测试 | 10 |
| 性能测试 | 负载测试 | 8 |

---

## 部署指南

### 前端部署

```bash
# 构建生产版本
npm run build

# 部署到CDN
npm run deploy

# 或使用Vercel
vercel --prod
```

### 后端部署

```bash
# 构建Docker镜像
docker build -t music-scheduler-api .

# 运行容器
docker run -d -p 3000:3000 music-scheduler-api

# 或使用docker-compose
docker-compose up -d
```

### 环境变量配置

```env
# .env.production

# 数据库
DATABASE_URL=postgresql://user:password@host:5432/music_scheduler

# JWT密钥
JWT_SECRET_KEY=your-secret-key

# API配置
API_BASE_URL=https://api.music-scheduler.com

# 教研室配置
FACULTY_MAX_DAILY_CLASSES=8
FACULTY_WORKLOAD_WARNING_THRESHOLD=8
```

### 监控配置

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'music-scheduler-api'
    metrics_path: /metrics
    static_configs:
      - targets: ['localhost:3000']
```

---

## 故障排查

### 常见问题

#### 问题1: 教研室验证失败

**症状**: 排课时报"教研室不匹配"错误

**排查步骤**:
```bash
# 1. 检查教师教研室
SELECT * FROM teachers WHERE id = 'teacher-id';
# 确认 faculty_id 正确

# 2. 检查乐器配置
SELECT * FROM instrument_config WHERE instrument_name = '钢琴';
# 确认 faculty_id 正确

# 3. 检查日志
tail -f logs/api.log | grep faculty
```

**解决方案**:
- 确认教师和乐器属于同一教研室
- 或调整其中之一的教研室归属

#### 问题2: 性能问题

**症状**: 排课验证响应慢

**排查步骤**:
```python
# 1. 检查数据库查询
EXPLAIN ANALYZE
SELECT * FROM schedule_records
WHERE teacher_id = 'xxx'
AND day_of_week = 1
AND period = 1;

# 2. 检查索引
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'schedule_records';
```

**解决方案**:
- 添加缺失的索引
- 优化查询语句
- 增加数据库连接池

#### 问题3: 资质状态不正确

**症状**: 教师资质显示与实际不符

**排查步骤**:
```sql
-- 1. 检查教师资质记录
SELECT * FROM teacher_instruments
WHERE teacher_id = 'teacher-id';

-- 2. 检查审核状态
SELECT * FROM qualification_applications
WHERE teacher_id = 'teacher-id';
```

**解决方案**:
- 确认申请已审核通过
- 检查资质有效期
- 刷新前端缓存

### 日志查看

```bash
# API日志
tail -f logs/api.log

# 错误日志
tail -f logs/error.log

# 性能日志
tail -f logs/performance.log
```

### 调试模式

```typescript
// 开启前端调试
localStorage.setItem('debug', 'faculty:*');

// 开启后端调试
export FLASK_DEBUG=1
```

---

## 相关资源

- [API文档](./api/faculty-api-docs.md)
- [用户手册](../user/faculty-user-manual.md)
- [数据库迁移脚本](../../database/migrate_faculty_schema_v2.sql)
- [测试文件位置](../../tests/)
