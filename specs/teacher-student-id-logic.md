# 教师ID和学生ID使用逻辑说明

## 一、教师ID相关

### 1.1 数据库模型定义

#### 教师表 (teachers)

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | String(36) | 数据库主键（UUID格式） |
| `teacher_id` | String(50) | 工号（如 "120150375"），唯一约束 |

**关键设计**：`to_dict()` 方法将 `id` 映射为 `teacher_id`

```python
# server/models/teacher.py
def to_dict(self):
    return {
        'id': self.teacher_id,           # id 返回的是工号
        'teacher_id': self.teacher_id,   # 同时保留 teacher_id 字段
        'name': self.name,
        # ...
    }
```

**结果**：前端接收到的 `teacher.id` 和 `teacher.teacher_id` 是相同的值（都是工号）

#### 用户表 (users)

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | String(36) | 数据库主键（UUID格式） |
| `teacher_id` | String(50) | 工号，与教师表关联，唯一约束 |

**关键设计**：`to_dict()` 方法保持 `id` 为 UUID

```python
# server/models/user.py
def to_dict(self):
    return {
        'id': self.id,                   # id 返回的是 UUID
        'teacher_id': self.teacher_id,   # 工号
        # ...
    }
```

**结果**：前端需要区分 `user.id`（UUID）和 `user.teacher_id`（工号）

### 1.2 前端类型定义

```typescript
// src/types/index.ts
export interface Teacher {
  id: string;
  teacher_id?: string;              // 工号，如 120150375
  name?: string;                    // 教师姓名
  faculty_id: string;               // 教研室ID
  // ...
}

export interface User {
  id: string;                       // UUID
  teacher_id?: string;              // 工号
  full_name?: string;
  is_admin?: boolean;
  // ...
}
```

### 1.3 登录流程中的ID处理

```
用户登录 (输入工号)
    ↓
后端验证 (User.teacher_id = 工号)
    ↓
返回 user.to_dict() (user.id = UUID, user.teacher_id = 工号)
    ↓
前端存储 userData (id = UUID, teacher_id = 工号)
    ↓
调用 getTeacherProfile(teacher_id) 获取教师信息
    ↓
返回 teacher.to_dict() (teacher.id = 工号, teacher.teacher_id = 工号)
    ↓
前端设置 teacher 状态
```

### 1.4 前端使用模式

#### 模式1：兼容性处理（推荐）

```typescript
// 获取教师ID时，优先使用 teacher_id，兼容 id
const teacherId = teacher.teacher_id || teacher.id;

// 下拉选项中
<option key={teacher.id} value={teacher.teacher_id || teacher.id}>
```

#### 模式2：查询时同时匹配

```typescript
// 匹配时检查两种可能的ID
const isMatch = schedule.teacher_id === teacher.id || 
                schedule.teacher_id === teacher.teacher_id;
```

#### 模式3：数组过滤

```typescript
// 获取所有可能的ID值
const teacherIds = [teacher.id, teacher.teacher_id].filter(Boolean);
```

---

## 二、学生ID相关

### 2.1 数据库模型定义

#### 学生表 (students)

| 字段 | 类型 | 说明 |
|-----|------|------|
| `id` | String(36) | 数据库主键（UUID格式） |
| `student_id` | String(50) | 学号（如 "2301010001"），唯一约束 |
| `teacher_id` | String(50) | 关联的教师工号 |

**关键设计**：`to_dict()` 方法将 `id` 映射为 `student_id`

```python
# server/models/student.py
def to_dict(self):
    return {
        'id': self.student_id,           # id 返回的是学号
        'student_id': self.student_id,   # 同时保留 student_id 字段
        'name': self.name,
        'teacher_id': self.teacher_id,
        # ...
    }
```

**结果**：前端接收到的 `student.id` 和 `student.student_id` 是相同的值（都是学号）

### 2.2 前端类型定义

```typescript
// src/types/index.ts
export interface Student {
  id: string;
  student_id: string;               // 学号
  name: string;
  teacher_id?: string;              // 关联教师工号
  major_class: string;
  grade: number;
  // ...
}
```

### 2.3 前端使用模式

#### 模式1：兼容性处理

```typescript
// 获取学号时，优先使用 student_id
const studentId = student.student_id || student.id;
```

#### 模式2：匹配查询

```typescript
// 匹配时检查两种可能的ID
const isStudentMatch = schedule.student_id === student.id || 
                       schedule.student_id === student.student_id;
```

#### 模式3：显示学号

```typescript
// 导出或显示时使用 student_id
'学号': result.students?.map(student => student.student_id || '-').join('、')
```

---

## 三、ID映射关系图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              教师ID映射                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  数据库层                    API响应层                  前端使用            │
│  ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐   │
│  │ Teacher.id      │       │ to_dict()       │       │ teacher.id      │   │
│  │ (UUID主键)      │ ────> │ id: teacher_id  │ ────> │ = teacher_id    │   │
│  │                 │       │                 │       │ (工号)          │   │
│  │ Teacher.teacher_id│     │ teacher_id: ... │       │ teacher.teacher_id│  │
│  │ (工号，唯一)     │       │                 │       │ (工号)          │   │
│  └─────────────────┘       └─────────────────┘       └─────────────────┘   │
│                                                                             │
│  ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐   │
│  │ User.id         │       │ to_dict()       │       │ user.id         │   │
│  │ (UUID主键)      │ ────> │ id: UUID        │ ────> │ (UUID)          │   │
│  │                 │       │                 │       │                 │   │
│  │ User.teacher_id │       │ teacher_id: ... │       │ user.teacher_id │   │
│  │ (工号，唯一)     │       │                 │       │ (工号)          │   │
│  └─────────────────┘       └─────────────────┘       └─────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              学生ID映射                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  数据库层                    API响应层                  前端使用            │
│  ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐   │
│  │ Student.id      │       │ to_dict()       │       │ student.id      │   │
│  │ (UUID主键)      │ ────> │ id: student_id  │ ────> │ = student_id    │   │
│  │                 │       │                 │       │ (学号)          │   │
│  │ Student.student_id│     │ student_id: ... │       │ student.student_id│  │
│  │ (学号，唯一)     │       │                 │       │ (学号)          │   │
│  └─────────────────┘       └─────────────────┘       └─────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 四、关键代码位置

### 4.1 后端模型

| 文件 | 说明 |
|-----|------|
| `server/models/teacher.py` | 教师模型，`to_dict()` 中 `id` 映射为 `teacher_id` |
| `server/models/student.py` | 学生模型，`to_dict()` 中 `id` 映射为 `student_id` |
| `server/models/user.py` | 用户模型，`to_dict()` 中 `id` 保持为 UUID |

### 4.2 后端路由

| 文件 | 说明 |
|-----|------|
| `server/routes/auth.py` | 登录认证，使用 `teacher_id` 查询用户 |
| `server/routes/teachers.py` | 教师CRUD，支持 `teacher_id` 或 `id` 查询 |
| `server/routes/students.py` | 学生CRUD，使用 `student_id` 查询 |

### 4.3 前端代码

| 文件 | 说明 |
|-----|------|
| `src/types/index.ts` | Teacher、Student、User 接口定义 |
| `src/hooks/useAuth.tsx` | 认证 Hook，管理用户和教师状态 |
| `src/services/authService.ts` | 认证服务，处理登录/登出 |

---

## 五、最佳实践

### 5.1 前端代码建议

```typescript
// 推荐：获取ID时使用兼容性写法
const teacherId = teacher.teacher_id || teacher.id;
const studentId = student.student_id || student.id;

// 推荐：匹配时检查两种可能的ID
const isTeacherMatch = record.teacher_id === teacher.id || 
                       record.teacher_id === teacher.teacher_id;
const isStudentMatch = record.student_id === student.id || 
                       record.student_id === student.student_id;

// 推荐：创建下拉选项时
<option key={teacher.id} value={teacher.teacher_id || teacher.id}>
  {teacher.name}
</option>
```

### 5.2 后端代码建议

```python
# 推荐：支持两种ID查询
@api_bp.route('/teachers/<teacher_id>', methods=['GET'])
def get_teacher(teacher_id):
    teacher = db.query(Teacher).filter(
        (Teacher.teacher_id == teacher_id) | (Teacher.id == teacher_id)
    ).first()
    # ...
```

### 5.3 数据创建建议

```typescript
// 创建教师时，id 字段使用工号
const newTeacher = {
  id: teacher_id,        // 使用工号作为 id
  teacher_id: teacher_id,
  name: name,
  // ...
};

// 创建学生时，id 字段使用学号
const newStudent = {
  id: student_id,        // 使用学号作为 id
  student_id: student_id,
  name: name,
  // ...
};
```

---

## 六、常见问题

### Q1: 为什么 teacher.id 和 teacher.teacher_id 是相同的值？

**A**: 这是设计决策。后端 `to_dict()` 方法将 `id` 映射为 `teacher_id`，目的是让前端使用业务ID（工号）更直观，便于调试和日志记录。

### Q2: user.id 和 teacher.id 有什么区别？

**A**: 
- `user.id` 是 UUID 格式，来自用户表
- `teacher.id` 是工号格式，来自教师表的 `to_dict()` 方法

### Q3: 如何处理历史数据中的 user-temp-xxx 格式的 teacher_id？

**A**: 在数据加载时进行修复：

```typescript
// 修复 user-temp-xxx 格式的 teacher_id
if (course.teacher_id.startsWith('user-temp-')) {
  const matchedTeacher = teachers.find(t => 
    t.name === course.teacher_name || t.full_name === course.teacher_name
  );
  if (matchedTeacher) {
    course.teacher_id = matchedTeacher.teacher_id || matchedTeacher.id;
  }
}
```

---

**文档版本**: 1.0.0  
**创建日期**: 2026-02-26  
**相关文件**: 
- [server/models/teacher.py](../server/models/teacher.py)
- [server/models/student.py](../server/models/student.py)
- [server/models/user.py](../server/models/user.py)
- [src/types/index.ts](../src/types/index.ts)
